require("dotenv").config()
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path')
const slackProvider = require("./slack")

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const isMainnet = NEAR_ENV === 'mainnet'
const REGION = process.env.REGION || ''
const slack = new slackProvider({ slackToken: process.env.SLACK_TOKEN })

const getLogs = async (lines = 1) => {
  const cmd = isMainnet ? `tail -n ${lines} ~/.near/neard.log` : `tail -n ${lines} ~/.nearup/logs/${NEAR_ENV}.log`
  const { stdout } = await exec(cmd)
  return stdout
}

module.exports = {
  // TODO: grep?
  processActive: async () => {
    const cmd = isMainnet ? 'sudo systemctl status neard' : 'nearup logs'
    try {
      // TODO: re-enable!!!!!!!!!!!!!!!
      // await cmdPromise(cmd)
    } catch(e) {
    }
  },
  stop: async () => {
    const cmd = isMainnet ? 'sudo systemctl stop neard' : 'nearup stop'
    try {
      await cmdPromise(cmd)
      await slack.send({ text: `*${NEAR_ENV.toUpperCase()} ${REGION}* node stop triggered` })
    } catch (e) {
      await slack.send({ text: `*${NEAR_ENV.toUpperCase()} ${REGION}* node stop trigger *FAILED*!` })
    }
  },
  start: async () => {
    const cmd = isMainnet ? 'sudo systemctl start neard' : `nearup run ${NEAR_ENV} --home /data`
    try {
      await cmdPromise(cmd)
      await slack.send({ text: `*${NEAR_ENV.toUpperCase()} ${REGION}* node start triggered` })
    } catch (e) {
      await slack.send({ text: `*${NEAR_ENV.toUpperCase()} ${REGION}* node start trigger *FAILED*!` })
    }
  },
  getLogs,
  parseLogs: async (lines = 1) => {
    const logs = await getLogs(lines)
    const output = []
    if (!logs || logs.length < 1) return output;
    return logs.split('\n');
  },
}