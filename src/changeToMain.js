require("dotenv").config()
const slackProvider = require("./slack")
const keys = require("./keyHandler")
const daemon = require("./daemonHandler")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const REGION = process.env.REGION || ''
const slack = new slackProvider({ slackToken: process.env.SLACK_TOKEN })

// GOOOOOO!!
;(async () => {
  // TODO: Check if neard/nearup process is active?
  // await daemon.processActive()
  // stop process
  await daemon.stop()

  // TODO: Error handle this!
  // replace keys
  await keys.main()

  // start process
  await daemon.start()

  // report
  await slack.send({ text: `*${NEAR_ENV.toUpperCase()} ${REGION}* MANUAL change to validator complete.` })
})()