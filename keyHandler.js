const fs = require("fs")
const path = require("path")

const BASE_PATH = path.join(__dirname, '/data')

module.exports = {
  isMain: () => {
    const validatorKey = await fs.readFileSync(path.join(BASE_PATH, 'validator_key.json'), 'utf8')
    const key = JSON.parse(validatorKey)
    return key.account_id.search('sync') === -1
  },
  isTemp: () => {
    const validatorKey = await fs.readFileSync(path.join(BASE_PATH, 'validator_key.json'), 'utf8')
    const key = JSON.parse(validatorKey)
    return key.account_id.search('sync') > -1
  },
  main: () => {
    const mainNodeKey = await fs.readFileSync(path.join(BASE_PATH, 'node_key_main.json'))
    const mainValidatorKey = await fs.readFileSync(path.join(BASE_PATH, 'validator_key_main.json'))

    // write the key to active key
    fs.writeFileSync(path.join(BASE_PATH, 'node_key.json'), mainNodeKey)
    fs.writeFileSync(path.join(BASE_PATH, 'validator_key.json'), mainValidatorKey)
  },
  temp: () => {
    const tmpNodeKey = await fs.readFileSync(path.join(BASE_PATH, 'node_key_tmp.json'))
    const tmpValidatorKey = await fs.readFileSync(path.join(BASE_PATH, 'validator_key_tmp.json'))

    // write the key to active key
    fs.writeFileSync(path.join(BASE_PATH, 'node_key.json'), tmpNodeKey)
    fs.writeFileSync(path.join(BASE_PATH, 'validator_key.json'), tmpValidatorKey)
  },
}