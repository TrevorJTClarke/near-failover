const axios = require('axios')

class Slack {
  constructor(options) {
    this.slackToken = options.slackToken
    return this
  }

  getHookUrl(options) {
    if (!options || !options.slackToken) return
    const id = options.slackToken || this.slackToken
    return `https://hooks.slack.com/services/${id}`
  }

  send(options = {}) {
    const url = this.getHookUrl(options)
    if (!url) return
    const data = {
      channel: options.slackChannel ? `#${options.slackChannel}` : '#general',
      username: 'Steak.Town',
      // Example: 'Alert! You need to do something! <https://url.com|Click here>'
      text: options.text || 'Steak.Town Update!',
      ...options,
    }
    return axios.post(url, JSON.stringify(data)).then(res => (res), err => {
      console.log('err', err)
    })
  }
}

module.exports = Slack