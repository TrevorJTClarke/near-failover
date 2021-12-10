const fs = require("fs")
const path = require("path")

const BASE_PATH = path.join(__dirname, '/data')

const getKeyData = async (type = 'validator', suffix = '') => {
  const validatorKey = await fs.readFileSync(path.join(BASE_PATH, `${type}_key${suffix}.json`), 'utf8')
  return JSON.parse(validatorKey)
}

const writeKeyFile = async (suffix) => {
  const nodeKey = await fs.readFileSync(path.join(BASE_PATH, `node_key_${suffix}.json`))
  const validatorKey = await fs.readFileSync(path.join(BASE_PATH, `validator_key_${suffix}.json`))

  // write the key to active key
  fs.writeFileSync(path.join(BASE_PATH, 'node_key.json'), nodeKey)
  fs.writeFileSync(path.join(BASE_PATH, 'validator_key.json'), validatorKey)
}

module.exports = {
  isMain: async () => {
    const key = await getKeyData()
    return key.account_id.search('sync') === -1
  },
  isTemp: async () => {
    const key = await getKeyData()
    return key.account_id.search('sync') > -1
  },
  main: () => {
    return writeKeyFile('main')
  },
  temp: () => {
    return writeKeyFile('tmp')
  },
}