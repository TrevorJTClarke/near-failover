require("dotenv").config()
const fs = require("fs")
const path = require("path")
const axios = require("axios")

// TODO: 
// - Check if my host is actively validating, if so stop?
// - Check if other host is actively validating, if so stop?
// - Check if other host is NOT actively validating
//   - if so change my local keys
//   - restart near service

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const NODES = process.env.NODES || 'localhost:3000'
const NF_NODES = {
  mainnet: process.env.NF_MAINNET_NODE || '',
  guildnet: process.env.NF_GUILDNET_NODE || '',
  testnet: process.env.NF_TESTNET_NODE || '',
  betanet: process.env.NF_BETANET_NODE || '',
}
const configuredNodes = NODES.split(',')

// make sure the comparison node is available
configuredNodes.push(NF_NODES[NEAR_ENV])

let availableNodes = []

// GOOOOOO!!
;(async () => {
  // Get all available nodes, by requesting their "height"
  const p = []
  configuredNodes.forEach(node => {
    const url = `https://${node}/metrics`
    p.push(axios.get(url))
  })
  const results = await Promise.all(p)
  // TODO: Need to parse the prometheus file
  // based on responses, add to available nodes list
  results.forEach(res => {
    // Look for:
    // near_block_height_head
    // near_block_dropped
    // near_peer_connections_total
    // near_is_validator
  })

  // Check the last known primary node is actively validating

  // - Check if other host is NOT actively validating
  //   - if so change my local keys
  //   - restart near service
})()
