const axios = require('axios')

const uptime = {
  ping(options = {}) {
    return axios.get(options.uptimeUrl).catch(e => {
      console.log('uptime ERROR', e)
    })
  }
}

module.exports = uptime