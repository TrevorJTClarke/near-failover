require("dotenv").config()
const axios = require("axios")
const Big = require("big.js")
const { utils } = require("near-api-js")
const ip = require("./ip")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const REGION = process.env.REGION || ''
const CURRENCY = process.env.CURRENCY || 'USD'
const REPORT_INTERVAL = process.env.REPORT_INTERVAL ? parseInt(process.env.REPORT_INTERVAL) : 12 * 1 * 60 * 60 * 1000

// const slack = new slackProvider({ slackToken: process.env.SLACK_TOKEN })

const NODES = {
  mainnet: process.env.NODES_MAINNET,
  guildnet: process.env.NODES_GUILDNET,
  testnet: process.env.NODES_TESTNET,
  betanet: process.env.NODES_BETANET || '',
}

// "btoa" should be read as "binary to ASCII"
// btoa converts binary to Base64-encoded ASCII string
const btoa = (text) => {
  return Buffer.from(text, 'utf8').toString('base64')
}

// "atob" should be read as "ASCII to binary"
// atob converts Base64-encoded ASCII string to binary
const atob = (base64) => {
  return Buffer.from(base64, 'base64').toString('utf8')
}

const addCommas = num => {
  let str = num.toString().split('.')
  str[0] = str[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return str.join('.')
}

const getNearPrice = async () => {
  const currency = `${CURRENCY}`.toLowerCase()
  try {
    const { data } = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=${currency}`)
    return data && data.near && data.near[currency] ? parseFloat(data.near[currency]) : 0
  } catch (e) {
    return 0
  }
}

const yoctoToNear = (yocto, decimals = 4) => {
  if (!yocto) return '0'
  return utils.format.formatNearAmount(`${yocto}`, decimals)
}

const yoctoToPrice = (yocto, price) => {
  if (!yocto || !price) return '0'
  // const amt = yoctoToNear(yocto)
  // console.log('HEREamt', amt, yocto, price)
  const amt = Big(`${yocto}`).div('1e24')
  const total = amt.times(`${price}`).toFixed(2)
  return total
}

const queryRpc = async (data, method = 'query') => {
  const nodeIp = ip()
  const node = nodeIp || NODES[NEAR_ENV].split(',')[0]
  const node_domain = node.search('192') < 0 ? `https://${node}/` : `http://${node}:3030/`

  try {
    // DATA:
    // {
    //   "request_type": "call_function",
    //   "finality": "final",
    //   "account_id": contract,
    //   "method_name": "get_accounts",
    //   "args_base64": args,
    // }
    const res = await axios.post(`${node_domain}`, { "jsonrpc": "2.0", "id": "steak", "method": method, "params": data }).then(r => r.data)
    return res && res.result ? res.result : res
  } catch (e) {
    // console.log('e', e)
    // nothing
    return e
  }
}

module.exports = {
  btoa,
  atob,
  addCommas,
  getNearPrice,
  yoctoToNear,
  yoctoToPrice,
  queryRpc,
  viewContract: async (contract, method, args) => {
    let res
    try {
      res = await queryRpc({
        "request_type": "call_function",
        "finality": "final",
        "account_id": contract,
        "method_name": method,
        "args_base64": args ? btoa(JSON.stringify(args)) : 'e30=',
      })
    } catch (e) {
      // console.log('e', e)
      // nothing
      return e
    }

    if (!res || !res.result) return;
    return JSON.parse(atob(res.result))
  },
  getValidators: async (blockHeight) => {
    let res
    try {
      res = await queryRpc([blockHeight || null], 'validators')
    } catch (e) {
      // console.log('e', e)
      // nothing
      return e
    }

    return res
  },
  getAccount: async account_id => {
    let res
    try {
      res = await queryRpc({
        "request_type": "view_account",
        "finality": "final",
        "account_id": account_id,
      })
    } catch (e) {
      // console.log('e', e)
      // nothing
      return e
    }

    return res
  },
}