require("dotenv").config()
const slackProvider = require("./slack")
const keys = require("./keyHandler")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const REGION = process.env.REGION || ''
const slack = new slackProvider({ slackToken: process.env.SLACK_TOKEN })

// GOOOOOO!!
;(async () => {
  await keys.createKeyFiles()

  await slack.send({ text: `*${NEAR_ENV.toUpperCase()} ${REGION}* node key setup complete.` })
})()