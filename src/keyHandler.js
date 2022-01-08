const fs = require("fs")
const path = require("path")
const { PublicKey } = require("near-api-js/lib/utils");
const { connect: nearConnect, KeyPair, keyStores } = require('near-api-js');

const NEAR_ENV = process.env.NEAR_ENV || 'testnet'
const REGION = process.env.REGION || ''
const BASE_PATH = process.env.BASE_PATH || path.join('')

const generateKey = async id => {
  const keyPair = await KeyPair.fromRandom('ed25519')
  const publicKey = keyPair.publicKey.toString()
  const implicitAccountId = Buffer.from(PublicKey.fromString(publicKey).data).toString('hex')
  return {
    account_id: `${id}.${NEAR_ENV.toLowerCase()}`,
    public_key: `ed25519:${implicitAccountId}`,
    secret_key: `ed25519:${keyPair.secretKey}`,
  }
}

const getKeyData = async (type = 'validator', suffix = '') => {
  const validatorKey = await fs.readFileSync(path.join(BASE_PATH, `${type}_key${suffix}.json`), 'utf8')
  return JSON.parse(validatorKey)
}

const writeKeyFile = async (suffix) => {
  const nodeKey = await fs.readFileSync(path.join(BASE_PATH, `node_key_${suffix}.json`))
  const validatorKey = await fs.readFileSync(path.join(BASE_PATH, `validator_key_${suffix}.json`))

  // console.log('CHANGE KEYS TO', suffix)
  // write the key to active key
  fs.writeFileSync(path.join(BASE_PATH, 'node_key.json'), nodeKey)
  fs.writeFileSync(path.join(BASE_PATH, 'validator_key.json'), validatorKey)
}

// generate temp keys, save temps
const createKeyFiles = async () => {
  const nodeKey = await fs.readFileSync(path.join(BASE_PATH, `node_key.json`))
  const validatorKey = await fs.readFileSync(path.join(BASE_PATH, `validator_key.json`))

  // create key backups
  fs.writeFileSync(path.join(BASE_PATH, 'backups', `node_key.json`), nodeKey)
  fs.writeFileSync(path.join(BASE_PATH, `node_key_main.json`), nodeKey)
  fs.writeFileSync(path.join(BASE_PATH, 'backups', `validator_key.json`), validatorKey)
  fs.writeFileSync(path.join(BASE_PATH, `validator_key_main.json`), validatorKey)

  // Generate & store temp keys
  const accountId = `${REGION}_sync`
  const nodeTmp = await generateKey(accountId)
  const valTmp = await generateKey(accountId)
  await fs.writeFileSync(path.join(BASE_PATH, `node_key_tmp.json`), JSON.stringify(nodeTmp))
  await fs.writeFileSync(path.join(BASE_PATH, `validator_key_tmp.json`), JSON.stringify(valTmp))
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
  createKeyFiles,
}