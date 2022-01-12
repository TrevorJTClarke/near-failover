require("dotenv").config()
const Big = require("big.js")
const util = require("./src/utils")
const slackProvider = require("./src/slack")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const CURRENCY = process.env.CURRENCY || 'USD'
const SLACK_REPORT_CHANNEL = process.env.SLACK_REPORT_CHANNEL || null
const REPORT_INTERVAL = process.env.REPORT_INTERVAL && process.env.REPORT_INTERVAL !== '0' ? parseInt(process.env.REPORT_INTERVAL) : 12 * 1 * 60 * 60 * 1000

const slack = new slackProvider({ slackToken: process.env.SLACK_TOKEN })
let prevValidatorStats = {}
let myPrevStats = {}
let prevAccount = {}
let prevDelegators = []

// Steak.Town
// *Report*: Epoch 1090, 56908273

// 👉 Total Delegations: 256903.0988Ⓝ ($4,344,099), 450N new
// 👉 Total Delegators: 45 (1 new)
// 👉 Rewards This Epoch: +1.67Ⓝ ($18.91)
// 👉 Rewards Staked: 37.9923Ⓝ ($309.14)
// 👉 Rewards Unstaked: 1.9923Ⓝ (_Can Withdraw_)

// 🥩 Production: 99.98% (89 / 90)

// 1 Ⓝ = $15.87

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
  return `*${NEAR_ENV.toUpperCase()} Report*: Epoch ${data.epoch_height}, ${data.epoch_start_height}, Validator: ${data.contract} (${data.owner})

👉 Total Delegations: *${data.stake_total}Ⓝ* ($${data.stake_total_currency}), ${data.stake_new}Ⓝ new
👉 Total Delegators: *${data.delegations_total}*${data.delegations_new ? ' (' + data.delegations_new + ' new)' : ''}
👉 Rewards This Epoch: *+${data.rewards_epoch}Ⓝ* ($${data.rewards_epoch_currency})
👉 Rewards Staked: *${data.rewards_staked}Ⓝ* ($${data.rewards_staked_currency})
👉 Rewards Unstaked: *${data.rewards_unstaking}Ⓝ* (${data.rewards_can_withdraw ? '_Can be withdrawn_' : '_Not available yet_'})

🥩 Production: *${data.uptime_percent}%* (${data.uptime_produced} / ${data.uptime_expected})

1 Ⓝ = ${data.near_currency} ${CURRENCY}`
}

const computeReport = async () => {
  // Get all the raw data:
  const nearPrice = await util.getNearPrice()
  const contract = STAKECONTRACTS[NEAR_ENV]
  const owner = await util.viewContract(contract, 'get_owner_id')
  const account = await util.getAccount(contract)
  const delegators = await util.viewContract(contract, 'get_accounts', { from_index: 0, limit: 100 })
  let owner_account
  let prev_owner_account
  if (!delegators) return;
  delegators.forEach(d => {
    if (d.account_id === owner) owner_account = d
  })
  if (prevDelegators && prevDelegators.length > 0) prevDelegators.forEach(d => {
    if (d.account_id === owner) prev_owner_account = d
  })

  const validatorStats = await util.getValidators()
  // const prevValidatorStats = await util.getValidators(parseInt(validatorStats.epoch_start_height) - 2)
  // console.log('prevValidatorStatsprevValidatorStats', parseInt(validatorStats.epoch_start_height) - 2, JSON.stringify(prevValidatorStats))
  let myStats = {}
  validatorStats.current_validators.forEach(v => {
    if (v.account_id === contract) myStats = v
  })

  // Create alerts based on issues with the following
  let nextValidator = null
  let currentProposal = null
  let prevEpochKick = null
  validatorStats.next_validators.forEach(v => {
    if (v.account_id === contract) nextValidator = v.stake
    // console.log('I AM VALIDATING IN NEXT SET with', v.stake)
  })
  validatorStats.current_proposals.forEach(v => {
    if (v.account_id === contract) currentProposal = v.stake
    // console.log('I HAVE PROPOSAL with', v.stake)
  })
  validatorStats.prev_epoch_kickout.forEach(v => {
    if (v.account_id === contract) prevEpochKick = v.reason
    // console.log('I AM GETTING KICKED', v.reason)
  })

  if (!nextValidator) {
    const nvpayload = { text: `🚧 *${NEAR_ENV.toUpperCase()} Validator* 🚧: Reported as missing from the next epoch set of validators. *Check _ping_ scripts & validator node!*` }
    if (SLACK_REPORT_CHANNEL) nvpayload.slackChannel = SLACK_REPORT_CHANNEL
    await slack.send(nvpayload)
  }
  // NOTE: This is highly sensitive, meaning if this script runs before the "ping" it will trigger alert.
  // if (!currentProposal) {
  //   const cppayload = { text: `🚧 *${NEAR_ENV.toUpperCase()} Validator* 🚧: No current proposals found. *Check _ping_ scripts!*` }
  //   if (SLACK_REPORT_CHANNEL) cppayload.slackChannel = SLACK_REPORT_CHANNEL
  //   await slack.send(cppayload)
  // }
  if (prevEpochKick) {
    const { NotEnoughBlocks } = prevEpochKick
    // TODO: Once chunks support, probably have to add support here
    if (NotEnoughBlocks) {
      const pepayload = { text: `🚧 *${NEAR_ENV.toUpperCase()} Validator* 🚧: Reported as being kicked in prev epoch.\nReason: Blocks produced is less than expected (${NotEnoughBlocks.produced} / ${NotEnoughBlocks.expected})` }
      if (SLACK_REPORT_CHANNEL) pepayload.slackChannel = SLACK_REPORT_CHANNEL
      await slack.send(pepayload)
    }
  }

  // Calc offset stats
  const delegations_new = prevDelegators ? delegators.length - prevDelegators.length : 0
  const stake_new = prevAccount && prevAccount.locked ? util.yoctoToNear(`${Big(account.locked).minus(prevAccount.locked).valueOf()}`) : 0
  const rewards_current_epoch = prev_owner_account && prev_owner_account.staked_balance ? Big(owner_account.staked_balance).minus(prev_owner_account.staked_balance) : 0
  const rewards_epoch = rewards_current_epoch ? util.yoctoToNear(`${rewards_current_epoch.valueOf()}`) : 0
  const rewards_epoch_currency = rewards_epoch ? util.addCommas(util.yoctoToPrice(`${rewards_current_epoch.valueOf()}`, nearPrice)) : ''

  // Format raw data for report
  const reportData = {
    contract,
    owner,
    epoch_height: validatorStats.epoch_height,
    epoch_start_height: validatorStats.epoch_start_height,
    stake_total: util.yoctoToNear(myStats.stake),
    stake_total_currency: util.addCommas(util.yoctoToPrice(myStats.stake, nearPrice)),
    stake_new,
    delegations_total: delegators.length,
    delegations_new,
    rewards_epoch,
    rewards_epoch_currency,
    rewards_staked: util.yoctoToNear(owner_account.staked_balance),
    rewards_unstaking: util.yoctoToNear(owner_account.unstaked_balance),
    rewards_can_withdraw: owner_account.can_withdraw,
    rewards_staked_currency: util.addCommas(util.yoctoToPrice(owner_account.staked_balance, nearPrice)),
    uptime_percent: ((parseInt(myStats.num_produced_blocks) / parseInt(myStats.num_expected_blocks)) * 100).toFixed(2), // TODO:
    uptime_produced: myStats.num_produced_blocks,
    uptime_expected: myStats.num_expected_blocks,
    near_currency: nearPrice.toFixed(2),
  }
  const reportMessage = generateReportMessage(reportData)

  const payload = { text: reportMessage }
  if (SLACK_REPORT_CHANNEL) payload.slackChannel = SLACK_REPORT_CHANNEL
  await slack.send(payload)

  // Cache previous items
  prevAccount = account
  prevDelegators = delegators
  myPrevStats = myStats
  prevValidatorStats = validatorStats
}

// GOOOOOO!!
;(async () => {
  // await computeReport()

  const recurse = async () => {
    await computeReport()
    setTimeout(recurse, REPORT_INTERVAL)
  }

  recurse()
})()