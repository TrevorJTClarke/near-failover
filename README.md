# near-failover

A utility for maintaining neard nodes across regions. This code is responsible for watching all nodes, checking its status & metrics to make decisions about leader election. This allows failover in the event issues occur on a primary validating node.

#### Key features:

- ✅ Leader Election
- ✅ Automated Key Management
- ✅ Advanced Alerting & Warnings (Slack)
- ✅ Uptime Reporting
- ✅ Multi-region Multi-node Compare
- ✅ Remote Logging

### 1. Install

Install without systemctl:

```bash
npm i
cp .env.example .env

# Configure your .env before proceeding
npm start
```

Install **with** systemctl:

```bash
npm i
cp .env.example .env

# Configure your .env before proceeding
sudo ./setup.sh
```

NOTE: Needs sudo for install of systemctl process.

### 2. Configure

```bash
nano .env
```

You will need to configure the following env variables:

```bash
# Options: mainnet, testnet, guildnet
NEAR_ENV=guildnet
REGION=CA
CURRENCY=USD

# Where your /data folder is
BASE_PATH=

NF_MAINNET_NODE=rpc.mainnet.near.org
NF_GUILDNET_NODE=rpc.openshards.io
NF_TESTNET_NODE=rpc.testnet.near.org
NF_BETANET_NODE=rpc.betanet.near.org

# comma separated IPs
NODES_MAINNET=""
NODES_TESTNET=""
NODES_GUILDNET=""
NODES_BETANET=""

# Your staking contract for each network, for reporting
STAKE_CONTRACT_MAINNET=""
STAKE_CONTRACT_TESTNET=""
STAKE_CONTRACT_GUILDNET=""
STAKE_CONTRACT_BETANET=""

# Interval in millis
CHECK_INTERVAL=25000
REPORT_INTERVAL=21600000
LOW_BLOCKS_THRESHOLD=200
LOW_PEER_THRESHOLD=10

# For crontab
UPTIME_SYSTEM_URL=
# For failover checks
UPTIME_SYNC_URL=

SLACK_TOKEN=
SLACK_CHANNEL=
SLACK_LOG_CHANNEL=
SLACK_REPORT_CHANNEL=
# 10 mins
SLACK_STATUS_INTERVAL=600000
```

### 2. B - Key backups

**IMPORTANT!** If you haven't setup failover keys yet, please do the following command to automatically create, configure & backup your keys:

```bash
npm run keys
```

### 3. Start

If you didn't install the systemctl, you can start the service like this:

```bash
npm start
```

If you did install systemctl process, make sure its working by:

```bash
sudo systemctl status nearfailover.service
```

and view logs:

```bash
journalctl -f -u nearfailover.service
tail -f ~/near-failover/failover.log
tail -f ~/near-failover/failovererror.log
```

## Manual Maintenance

If you want to manually trigger a node becoming a validator or syncing node, you can do 1 of the following:

```bash
# For moving into validator node
npm run validator

# For moving into syncing node
npm run sync
```

### Support us!

If you found this useful, consider staking with our validator: `steak.poolv1.near` or making a donation to our DAO: `near send YOUR_ACCOUNT.near steakdao.sputnik-dao.near 5`