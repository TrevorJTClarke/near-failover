const axios = require('axios')

const uptime = {
  ping(options = {}) {
    return axios.get(options.uptimeUrl)
  }
}

module.exports = uptime