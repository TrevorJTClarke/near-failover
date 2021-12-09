require("dotenv").config()
const axios = require("axios")
const ip = require("./ip")
const slack = require("./slack")
const uptime = require("./uptime")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const NODES = {
  mainnet: process.env.NODES_MAINNET,
  guildnet: process.env.NODES_GUILDNET,
  testnet: process.env.NODES_TESTNET,
  // betanet: process.env.NF_BETANET_NODE || '',
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

function changeNodeToPrimary() {}

function changeNodeToStandby() {}

// GOOOOOO!!
;(async () => {
  // Get all available nodes, by requesting their "height"
  const p = []
  configuredNodes.forEach(node => {
    const url = node.search('192') < 0 ? `https://${node}/status` : `http://${node}:3030/status`
    p.push(axios.get(url).then(res => {
      return { ...res.data, node }
    }))
  })
  const results = await Promise.all(p)
  const nodes = {}
  // based on responses, add to available nodes list
  results.forEach(res => {
    if (!res || !res.version) return;
    if (res.chain_id !== NEAR_ENV) return;

    nodes[res.node] = {
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
  })

  console.log('nodes', nodes)

  // Check the last known primary node is actively validating

  // - Check if other host is NOT actively validating
  //   - if so change my local keys
  //   - restart near service

  // TODO: 
  // - Check if my host is actively validating, if so stop?
  // - Check if other host is actively validating, if so stop?
  // - Check if other host is NOT actively validating
  //   - if so change my local keys
  //   - restart near service
  // - send to uptime robot if configured
  //   - alert if we know this node is falling behind
  //   - alert if we are losing peers
  // - send periodic state updates to slack
})()
