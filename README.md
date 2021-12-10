# near-failover
failover scripts

### 1. Install

```bash
npm i
npm start
```

### 2. Configure

```bash
nano .env
```

You will need to configure the following env variables:

```bash
# Options: mainnet, testnet, guildnet
NEAR_ENV=guildnet

NF_MAINNET_NODE=rpc.mainnet.near.org
NF_GUILDNET_NODE=rpc.openshards.io
NF_TESTNET_NODE=rpc.testnet.near.org
NF_BETANET_NODE=rpc.betanet.near.org

# comma separated IPs
NODES_MAINNET=""
NODES_TESTNET=""
NODES_GUILDNET=""
NODES_BETANET=""

CHECK_INTERVAL=10000
LOW_BLOCKS_THRESHOLD=200
LOW_PEER_THRESHOLD=5

UPTIME_SYSTEM_URL=
UPTIME_SYNC_URL=

SLACK_TOKEN=
SLACK_CHANNEL=
SLACK_STATUS_INTERVAL=
```

### 3. Start

```bash
npm start
```

### 4. Support us!

If you found this useful, consider staking with our validator: `steak.poolv1.near` or making a donation to our DAO: `near send YOUR_ACCOUNT.near steakdao.sputnik-dao.near 5`