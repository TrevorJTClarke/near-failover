require("dotenv").config()
const axios = require("axios")
const slack = require("./slack")
const uptime = require("./uptime")
const ip = require("./ip")
const keys = require("./keyHandler")
const daemon = require("./daemonHandler")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const CHECK_INTERVAL = process.env.CHECK_INTERVAL ? parseInt(process.env.CHECK_INTERVAL) : 30 * 1000
const LOW_BLOCKS_THRESHOLD = process.env.LOW_BLOCKS_THRESHOLD ? parseInt(process.env.LOW_BLOCKS_THRESHOLD) : 200
const LOW_PEER_THRESHOLD = process.env.LOW_PEER_THRESHOLD ? parseInt(process.env.LOW_PEER_THRESHOLD) : 5
const UPTIME_SYSTEM_URL = process.env.UPTIME_SYSTEM_URL
const UPTIME_SYNC_URL = process.env.UPTIME_SYNC_URL
const SLACK_STATUS_INTERVAL = process.env.SLACK_STATUS_INTERVAL ? parseInt(process.env.SLACK_STATUS_INTERVAL) : 60 * 60 * 1000

const NODES = {
  mainnet: process.env.NODES_MAINNET,
  guildnet: process.env.NODES_GUILDNET,
  testnet: process.env.NODES_TESTNET,
  betanet: process.env.NODES_BETANET || '',
}
const NF_NODES = {
  mainnet: process.env.NF_MAINNET_NODE || '',
  guildnet: process.env.NF_GUILDNET_NODE || '',
  testnet: process.env.NF_TESTNET_NODE || '',
  betanet: process.env.NF_BETANET_NODE || '',
}

const configuredNodes = [NF_NODES[NEAR_ENV]]

// Add locally known nodes to the list to check
if (NODES[NEAR_ENV]) NODES[NEAR_ENV].split(',').forEach(node => configuredNodes.push(node))

// Restart changes the node from either validating to non-validating
// This is done by switching which keys are active
// OPTIONS:
// - type: {temp, main}(default: temp)
async function restartNodeProcess(type = 'temp') {
  // TODO: Check if neard/nearup process is active?
  // await daemon.processActive()
  // stop process
  await daemon.stop()

  // TODO: Error handle this!
  // replace keys
  await keys[type]()

  // start process
  await daemon.start()

  // report
  await slack.send({ text: `*${NEAR_ENV.toUpperCase()}* node changed to ${type} (${ip()})` })
}

// The main logic to check THIS node against comparison nodes
async function checkNodeState() {
  // Get the context of THIS node for later comparison.
  let thisNode = { ip: ip(), key_is_primary: keys.isMain() }
  const latestLogs = daemon.parseLogs()
  thisNode.log = latestLogs && latestLogs.length > 0 ? latestLogs[0] : null

  // Get all available nodes info
  const p = []
  configuredNodes.forEach(node => {
    const url = node.search('192') < 0 ? `https://${node}/status` : `http://${node}:3030/status`
    p.push(axios.get(url).then(res => {
      return { ...res.data, node }
    }))
  })
  const results = await Promise.all(p)
  const nfNodes = {}
  const nodes = {}

  // based on responses, add to available nodes list
  results.forEach(res => {
    if (!res || !res.version) return;
    if (res.chain_id !== NEAR_ENV) return;

    const nodeInfo = {
      ...res.sync_info,
      validator_account_id: res.validator_account_id,
      version: res.version,
      chain_id: res.chain_id,
      protocol_version: res.protocol_version,
      latest_protocol_version: res.latest_protocol_version,

      // Booleans for basic checks:
      out_of_date: res.latest_protocol_version > res.protocol_version,
      is_syncing: res.sync_info.syncing,
      is_primary: res.validator_account_id.search('sync') < 0,
    }

    if (nIp === thisNode.ip) thisNode = { ...thisNode, ...nodeInfo }
    else if (res.node = NF_NODES[NEAR_ENV]) nfNodes[res.node] = nodeInfo
    else nodes[res.node] = nodeInfo
  })

  console.log('nodes', nodes)
  console.log('thisNode', thisNode)

  // TODO: Check if neard/nearup process is active?
  // await daemon.processActive()

  // ALERT: low peer count
  if (thisNode.log && thisNode.log.peers) {
    const peers = thisNode.log.peers[0]
    if (peers < LOW_PEER_THRESHOLD) slack.send({ text: `*${NEAR_ENV.toUpperCase()}* Low Peer Count: ${peers} Found! (${thisNode.ip})` })
  }

  // ALERT: blocks falling behind
  let highestBlockHeight = thisNode.latest_block_height
  Object.entries(nodes).concat(Object.entries(nfNodes)).forEach(e => {
    if (e.latest_block_height > highestBlockHeight) highestBlockHeight = e.latest_block_height
  })
  if (highestBlockHeight > thisNode.latest_block_height + LOW_BLOCKS_THRESHOLD) {
    const blocksBehind = highestBlockHeight - thisNode.latest_block_height
    slack.send({ text: `*${NEAR_ENV.toUpperCase()}* Block Height Falling Behind: ${blocksBehind} Blocks Behind! (${thisNode.ip})` })
  } else {
    // we're not behind, ping the sync uptime to stop it from alerting
    if (UPTIME_SYNC_URL) uptime.ping({ uptimeUrl: UPTIME_SYNC_URL })
  }

  const validatingNodes = []
  Object.keys(nodes).forEach(nd => {
    if (nodes[nd].syncing === false && nodes[nd].is_primary) validatingNodes.push(nd)
    if (thisNode.syncing === false && thisNode.is_primary) validatingNodes.push(thisNode.ip)
  })

  // Check if any other host is actively validating
  //    - if we're actively validating too: stop & move to temp
  //    - if so restartNodeProcess('temp')
  if (validatingNodes.length > 0) {
    if (validatingNodes.includes(thisNode.ip)) {
      // if we are validating AND some other node is validating, move to temp
      if (validatingNodes.length > 1) await restartNodeProcess('temp')
    }
  }

  // Check if no other hosts are actively validating
  //   - if so restartNodeProcess('main')
  if (validatingNodes.length < 1) {
    // only update to main if there are no other validating nodes found
    await restartNodeProcess('main')
  }

  // Ping Uptime Monitor
  if (UPTIME_SYSTEM_URL) uptime.ping({ uptimeUrl: UPTIME_SYSTEM_URL })

  // - send periodic state updates to slack?
}

// GOOOOOO!!
;(async () => {
  // TODO: Change to recursive interval setup
  await checkNodeState()
})()