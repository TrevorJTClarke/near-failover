require("dotenv").config()
const slackProvider = require("./slack")
const uptime = require("./uptime")
const ip = require("./ip")
const nodeStatus = require("./nodeStatus")
const keys = require("./keyHandler")
const daemon = require("./daemonHandler")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const REGION = process.env.REGION || ''
const CHECK_INTERVAL = process.env.CHECK_INTERVAL ? parseInt(process.env.CHECK_INTERVAL) : 30 * 1000
const LOW_BLOCKS_THRESHOLD = process.env.LOW_BLOCKS_THRESHOLD ? parseInt(process.env.LOW_BLOCKS_THRESHOLD) : 200
const LOW_PEER_THRESHOLD = process.env.LOW_PEER_THRESHOLD ? parseInt(process.env.LOW_PEER_THRESHOLD) : 5
// const UPTIME_SYSTEM_URL = process.env.UPTIME_SYSTEM_URL
const UPTIME_SYNC_URL = process.env.UPTIME_SYNC_URL
const SLACK_LOG_CHANNEL = process.env.SLACK_LOG_CHANNEL ? process.env.SLACK_LOG_CHANNEL : null
const SLACK_STATUS_INTERVAL = process.env.SLACK_STATUS_INTERVAL ? parseInt(process.env.SLACK_STATUS_INTERVAL) : 0

const slack = new slackProvider({ slackToken: process.env.SLACK_TOKEN })

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
  await slack.send({ text: `*${NEAR_ENV.toUpperCase()} ${REGION}* node changed to ${type} complete.` })
}

// TODO: Check that logic can sustain all nodes not validating because of kicked or non-ping
// The main logic to check THIS node against comparison nodes
async function checkNodeState() {
  // Get the context of THIS node for later comparison.
  const key_is_primary = await keys.isMain()
  const thisNodeIp = await ip()
  let thisNode = { ip: thisNodeIp, key_is_primary }
  const latestLogs = await daemon.parseLogs()
  thisNode.log = latestLogs && latestLogs.length > 0 ? latestLogs[0] : null

  // Get all available nodes info
  // TODO: Skip if its requesting THIS node???
  const p = []
  configuredNodes.forEach(node => p.push(nodeStatus.getState(node)))
  const results = await Promise.all(p)
  const nfNodes = {}
  const nodes = {}

  // based on responses, add to available nodes list
  results.forEach(res => {
    const node_ip = res.node
    if (node_ip === NF_NODES[NEAR_ENV]) { nfNodes[node_ip] = res }
    else if (node_ip === thisNode.ip) { thisNode = { ...thisNode, ...res } }
    else { nodes[node_ip] = { ...res } }
  })

  // console.log('nodes', nodes)
  // console.log('nfNodes', nfNodes)
  // console.log('thisNode', thisNode)

  // HELPFUL LOGGING:
  console.log(`${new Date().toISOString()} ${NEAR_ENV.toUpperCase()} ${REGION} (${thisNode.validator_account_id}) :: ${thisNode.isValidating ? 'VALIDATOR' : 'SYNC'} :: PEERS: ${thisNode.peers}/${thisNode.peers_reachable} BLK:${thisNode.latest_block_height} BLOCKSYNC: ${thisNode.syncing} `)

  // TODO: Check if neard/nearup process is active?
  // await daemon.processActive()

  // ALERT: low peer count
  if (typeof thisNode.peers !== 'undefined') {
    const peers = thisNode.peers
    if (peers < LOW_PEER_THRESHOLD) slack.send({ text: `*${NEAR_ENV.toUpperCase()} ${REGION}* Low Peer Count: ${peers} Connected, ${thisNode.peers_reachable} Reachable!` })
  }

  // ALERT: blocks falling behind
  let highestBlockHeight = thisNode.latest_block_height
  Object.entries(nodes).concat(Object.entries(nfNodes)).forEach(e => {
    if (e.latest_block_height > highestBlockHeight) highestBlockHeight = e.latest_block_height
  })
  if (highestBlockHeight > thisNode.latest_block_height + LOW_BLOCKS_THRESHOLD) {
    const blocksBehind = highestBlockHeight - thisNode.latest_block_height
    slack.send({ text: `*${NEAR_ENV.toUpperCase()} ${REGION}* Block Height Falling Behind: ${blocksBehind} Blocks Behind!` })
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
  if (UPTIME_SYNC_URL) uptime.ping({ uptimeUrl: UPTIME_SYNC_URL })
}

// GOOOOOO!!
;(async () => {
  const recurse = async () => {
    await checkNodeState()
    setTimeout(recurse, CHECK_INTERVAL)
  }

  recurse()

  // send periodic state updates to slack?
  if (SLACK_STATUS_INTERVAL) {
    const slackPeriodicLogger = async () => {
      const latestLogs = await daemon.parseLogs()
      const payload = { text: `*${NEAR_ENV.toUpperCase()} ${REGION}* Recent Log:\n${latestLogs[0]}` }
      if (SLACK_LOG_CHANNEL) payload.slackChannel = SLACK_LOG_CHANNEL
      await slack.send(payload)
      setTimeout(recurse, SLACK_STATUS_INTERVAL)
    }

    slackPeriodicLogger()
  }
})()