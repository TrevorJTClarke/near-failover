require("dotenv").config()
const { utils } = require('near-api-js')
const util = require("./src/utils")
const slackProvider = require("./src/slack")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const CURRENCY = process.env.CURRENCY || 'USD'
const SLACK_REPORT_CHANNEL = process.env.SLACK_REPORT_CHANNEL || null
const REPORT_INTERVAL = process.env.REPORT_INTERVAL ? parseInt(process.env.REPORT_INTERVAL) : 12 * 1 * 60 * 60 * 1000

const slack = new slackProvider({ slackToken: process.env.SLACK_TOKEN })

// Per Epoch
// growth (time), gain/loss, delegators gain/loss... something like that?

// - total delegation over time (NEAR)
// - delegators - gain/loss 
// - delegations - gain/loss
// - rewards: earning NEAR, percent growth
// - uptime: Blocks/chunks + percentage (block expect, block produced)
// - account balance (unstaked but not withdrawn)
// - How do we get our rewards out?


// Steak.Town
// *Report*: Epoch 1090, 56908273

// 👉 Total Delegations: 256903.0988Ⓝ ($4,344,099), 450N new
// 👉 Total Delegators: 45 (1 new)
// 👉 Rewards This Epoch: +1.67Ⓝ ($18.91)
// 👉 Rewards Staked: 37.9923Ⓝ ($309.14)

// 🥩 Production: 99.98% (89 / 90)

// 1 Ⓝ = $15.87

// ----

// 🚧 *ATTENTION*: Validator is reported as being kicked in next epoch.
// Reason: Blocks produced is less than expected (3 / 98)

// 🥩🚀 ❤️ 📊 📈 🚧 🔥

//   * [ ] Add account balance alert
//   * [ ] cleanup logs
//   * [ ] Add seat price (https://github.com/near/near-explorer/blob/master/backend/src/near.js)
//   ----------------
//   * [ ] epoch uptime report (blocks/chunks)
//   * [ ] rewards report


const STAKECONTRACTS = {
  mainnet: process.env.STAKE_CONTRACT_MAINNET,
  guildnet: process.env.STAKE_CONTRACT_GUILDNET,
  testnet: process.env.STAKE_CONTRACT_TESTNET,
  betanet: process.env.STAKE_CONTRACT_BETANET || '',
}

// {
//   contract: ,
//   owner: ,
//   epoch_height: ,
//   epoch_start_height: ,
//   stake_total: ,
//   stake_total_currency: ,
//   stake_new: ,
//   delegations_total: ,
//   delegations_new: ,
//   rewards_epoch: ,
//   rewards_epoch_currency: ,
//   rewards_staked: ,
//   rewards_staked_currency: ,
//   uptime_percent: ,
//   uptime_produced: ,
//   uptime_expected: ,
//   near_currency: ,
// }
const generateReportMessage = data => {
  return `*Report*: Epoch ${data.epoch_height}, ${data.epoch_start_height}, Validator: ${data.contract} (${data.owner})

👉 Total Delegations: ${data.stake_total}Ⓝ (${data.stake_total_currency}), ${data.stake_new}Ⓝ new
👉 Total Delegators: ${data.delegations_total}${data.delegations_new ? ' (' + data.delegations_new + ' new)' : ''}
👉 Rewards This Epoch: +${data.rewards_epoch}Ⓝ (${data.rewards_epoch_currency})
👉 Rewards Staked: ${data.rewards_staked}Ⓝ (${data.rewards_staked_currency})

🥩 Production: ${data.uptime_percent}% (${data.uptime_produced} / ${data.uptime_expected})

1 Ⓝ = ${data.near_currency} ${CURRENCY}`
}

const computeReport = async () => {
  // Get all the raw data:
  const nearPrice = await util.getNearPrice()
  const contract = STAKECONTRACTS[NEAR_ENV]
  const owner = await util.viewContract(contract, 'get_owner_id')
  console.log('Stake contract owner:', owner)
  const delegators = await util.viewContract(contract, 'get_accounts', { from_index: 0, limit: 100 })
  console.log('delegators', delegators.length)
  delegators.forEach(d => {
    if (d.account_id === owner) console.log('OWNER STAKE', d)
  })

  const account = await util.getAccount(contract)
  console.log('accountaccountaccount', account)

  const validatorStats = await util.getValidators()
  let myStats = {}
  validatorStats.current_validators.forEach(v => {
    if (v.account_id === contract) myStats = v
  })
  validatorStats.next_validators.forEach(v => {
    if (v.account_id === contract) console.log('I AM VALIDATING IN NEXT SET with', v.stake)
  })
  validatorStats.current_proposals.forEach(v => {
    if (v.account_id === contract) console.log('I HAVE PROPOSAL with', v.stake)
  })
  validatorStats.prev_epoch_kickout.forEach(v => {
    if (v.account_id === contract) console.log('I AM GETTING KICKED', v.reason)
  })
  

  // Format raw data for report
  const reportData = {
    contract,
    owner,
    epoch_height: validatorStats.epoch_height,
    epoch_start_height: validatorStats.epoch_start_height,
    stake_total: myStats.stake,
    stake_total_currency: myStats.stake, // TODO:
    stake_new: myStats.stake - account.locked,
    delegations_total: delegators.length,
    delegations_new: 0, // TODO:
    rewards_epoch: '', // TODO:
    rewards_epoch_currency: '', // TODO:
    rewards_staked: '', // TODO:
    rewards_staked_currency: '', // TODO:
    uptime_percent: '', // TODO:
    uptime_produced: myStats.num_produced_blocks,
    uptime_expected: myStats.num_expected_blocks,
    near_currency: nearPrice,
  }
  const reportMessage = generateReportMessage(reportData)
  console.log('reportMessagereportMessage', reportMessage)

  // const payload = { text: `*${NEAR_ENV.toUpperCase()}* Recent Log:\n${latestLogs[0]}` }
  // if (SLACK_REPORT_CHANNEL) payload.slackChannel = SLACK_REPORT_CHANNEL
  // await slack.send(payload)
}

// GOOOOOO!!
;(async () => {
  await computeReport()
  // const recurse = async () => {
  //   await computeReport()
  //   setTimeout(recurse, REPORT_INTERVAL)
  // }

  // recurse()
})()