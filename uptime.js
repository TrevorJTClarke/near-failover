const axios = require('axios')

class Uptime {
  constructor(options) {
    return this
  }
  ping(options = {}) {
    return axios.get(options.uptimeUrl)
  }
}

module.exports = Uptime