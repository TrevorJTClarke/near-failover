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

const getLogs = async (lines = 1) => {
  const cmd = NEAR_ENV === 'mainnet' ? `tail -n ${lines} ~/.near/neard.log` : `tail -n ${lines} ~/.nearup/logs/${NEAR_ENV}.log`
  try {
    let logs = await cmdPromise(cmd)
    console.log('RAW logs', logs)
    return logs
  } catch (e) {
    // do nuthin
  }
}

module.exports = {
  // TODO: grep?
  processActive: async () => {
    const cmd = NEAR_ENV === 'mainnet' ? 'sudo systemctl stop neard' : 'nearup stop'
    try {
      await cmdPromise(cmd)
    } catch(e) {
      // fire a notif to slack
      // TODO: slask
    }
  },
  stop: async () => {
    const cmd = NEAR_ENV === 'mainnet' ? 'sudo systemctl stop neard' : 'nearup stop'
    try {
      await cmdPromise(cmd)
    } catch(e) {
      // fire a notif to slack
      // TODO: slask
    }
  },
  start: async () => {
    const cmd = NEAR_ENV === 'mainnet' ? 'sudo systemctl start neard' : 'nearup run $NEAR_ENV --accountId $NEAR_ACCOUNT --home /data'
    try {
      await cmdPromise(cmd)
    } catch(e) {
      // fire a notif to slack
      // TODO: slask
    }
  },
  getLogs,
  parseLogs: async (lines = 1) => {
    const logs = await getLogs(lines)
    const output = []
    if (!logs || logs.length < 1) return output;
    
    // split the logs up into line objects based on output
    logs.split('\n').forEach(line => {
      const chunks = line.split('  ')
      const blockData = chunks[1].split(' ')
      const peerData = chunks[2].split(' ')
      output.push({
        timestamp: chunks[0],
        block: `${blockData[2]}`.replace('#', ''),
        blockHash: blockData[3],
        is_validating: `${blockData[4]}`[0] === 'V',
        peers: `${peerData[0]}`.split('/'),
      })
    })

    return output
  },
}