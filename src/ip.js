const { networkInterfaces } = require('os');

// because im lazy: https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
module.exports = function() {
  const nets = networkInterfaces()
  const results = {}

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = []
        }
        results[name].push(net.address)
      }
    }
  }

  const ips = []
  Object.keys(results).forEach(r => {
    if (r.search('ens') > -1 && results[r].length > 0) ips.push(results[r][0])
  })
  
  return ips[0] ? ips[0] : ''
}