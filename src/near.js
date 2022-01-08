import * as nearApi from 'near-api-js'

function getConfigByType(networkId, config) {
  return {
    networkId,
    nodeUrl: networkId !== 'guildnet' ? `https://rpc.${networkId}.near.org` : 'https://rpc.openshards.io',
    explorerUrl: `https://explorer.${networkId === 'mainnet' ? '' : networkId + '.'}near.org`,
    walletUrl: `https://wallet.${networkId === 'mainnet' ? '' : networkId + '.'}near.org`,
    helperUrl: `https://helper.${networkId}.near.org`,
    ...config,
  }
}

export function getConfig(env, options = {}) {
  switch (env) {
    case 'production':
    case 'mainnet':
      return getConfigByType('mainnet', options)
    case 'development':
    case 'testnet':
      return getConfigByType('testnet', options)
    case 'betanet':
      return getConfigByType('betanet', options)
    case 'guildnet':
      return getConfigByType('guildnet', options)
    case 'local':
      return {
        ...options,
        networkId: 'local',
        nodeUrl: 'http://localhost:3030',
        keyPath: `${process.env.HOME}/.near/validator_key.json`,
        walletUrl: 'http://localhost:4000/wallet',
      }
    default:
      throw Error(`Unconfigured environment '${env}'. Can be configured in src/config.js.`)
  }
}

module.exports = {
  constructor(env, config) {
    if (!nearApi) return
    this.nearApi = { ...nearApi }
    this.config = getConfig(env, config)
    this.near = null
    this.keystore = null
    this.user = null

    return this
  },
  
  async loadNearProvider() {
    this.keystore = new this.nearApi.keyStores.BrowserLocalStorageKeyStore(window.localStorage, 'nearlib:keystore:')
    this.near = await this.nearApi.connect(Object.assign({ deps: { keyStore: this.keystore } }, this.config))
    return this
  },

  async loadAccount() {
    // Needed to access wallet
    this.walletConnection = new this.nearApi.WalletConnection(this.near)
    this.user = new this.nearApi.WalletAccount(this.near)

    if (this.walletConnection.getAccountId()) {
      this.user.accountId = this.walletConnection.getAccountId()
      this.user.balance = (await this.walletConnection.account().state()).amount
    }

    return this
  },

  async getContractInstance(contract_id, abiMethods) {
    if (!this.user || !this.user.accountId) return
    const account = this.walletConnection.account()
    console.log('account', account);
    const abi = {
      changeMethods: [],
      viewMethods: [],
      ...abiMethods,
    }

    // Sender is the account ID to initialize transactions.
    return new this.nearApi.Contract(
      account,
      contract_id,
      { ...abi, sender: account.accountId }
    )
  }
}