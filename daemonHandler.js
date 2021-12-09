require("dotenv").config()
const exec = require('child_process').exec
const path = require('path')

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'

// Example use:
// cmdPromise(path.resolve(process.argv[2]) || process.cwd())
const cmdPromise = (cmd, cwd = process.cwd()) => {
  if (!cmd) return Promise.reject('No cmd')
  return new Promise((resolve, reject) => {
    let check = exec(cmd, { cwd });
    check.on('exit', code => {
      if (code === 0) resolve()
      else reject()
    })
  })
}


module.exports = {
  stopNearDaemon: async () => {
    const cmd = NEAR_ENV === 'mainnet' ? 'sudo systemctl stop neard' : 'nearup stop'
    try {
      await cmdPromise(cmd)
    } catch(e) {
      // fire a notif to slack
      // TODO: slask
    }
  },
  startNearDaemon: async () => {
    const cmd = NEAR_ENV === 'mainnet' ? 'sudo systemctl start neard' : 'nearup run $NEAR_ENV --accountId $NEAR_ACCOUNT --home /data'
    try {
      await cmdPromise(cmd)
    } catch(e) {
      // fire a notif to slack
      // TODO: slask
    }
  },
  getNearDaemonLogs: async (lines = 1) => {
    const cmd = NEAR_ENV === 'mainnet' ? `journalctl -n ${lines} -u neard` : `tail -n ${lines} ~/.nearup/logs/${NEAR_ENV}.log`
    try {
      let logs = await cmdPromise(cmd)
      return logs
    } catch(e) {
      // do nuthin
    }
  },
}