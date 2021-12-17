require("dotenv").config()
const axios = require("axios")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'

module.exports = {
  getState: async node => {
    let nodeInfo = {}
    const node_domain = node.search('192') < 0 ? `https://${node}/` : `http://${node}:3030/`
    
    try {
      const res = await axios.get(`${node_domain}status`).then(r => r.data)
      console.log('STATUS', res)

      if (!res || !res.version) return;
      if (res.chain_id !== NEAR_ENV) return;
      const validator_account_id = res.validator_account_id
      let is_primary = false

      // check all validators to see if THIS account is validating
      res.validators.forEach(v => {
        if (v.account_id === validator_account_id) is_primary = true
      })

      nodeInfo = {
        ...nodeInfo,
        ...res.sync_info,
        node: res.node,
        validator_account_id,
        version: res.version,
        chain_id: res.chain_id,
        protocol_version: res.protocol_version,
        latest_protocol_version: res.latest_protocol_version,

        // Booleans for basic checks:
        out_of_date: res.latest_protocol_version > res.protocol_version,
        is_primary,
        is_syncing: res.sync_info.syncing,
      }
    } catch (e) {
      // Could not get basics
      console.log('HERE', e)
    }
    
    // Add context for peers
    try {
      const metrics = await axios.get(`${node_domain}metrics`).then(r => r.data)
      console.log('METRICS', metrics)
      const mLines = metrics.split('\n')
      mLines.forEach(l => {
        if (l.search('\#') < 0) {
          const [type, value] = l.split(' ')
          // only glean stuff we want
          if (type === 'near_peer_connections_total') nodeInfo.peers = parseInt(value)
          if (type === 'near_peer_reachable') nodeInfo.peers_reachable = parseInt(value)
          if (type === 'near_validator_active_total') nodeInfo.validatorsTotal = parseInt(value)
          if (type === 'near_is_validator') nodeInfo.isValidating = parseInt(value)
        }
      })
    } catch (e) {
      // nothing
      console.log('HERE', e)
    }

    return nodeInfo
  }
}