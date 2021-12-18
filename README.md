# near-failover
failover scripts

### 1. Install

```bash
npm i
sudo npm start
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

NF_MAINNET_NODE=rpc.mainnet.near.org
NF_GUILDNET_NODE=rpc.openshards.io
NF_TESTNET_NODE=rpc.testnet.near.org
NF_BETANET_NODE=rpc.betanet.near.org

# comma separated IPs
NODES_MAINNET=""
NODES_TESTNET=""
NODES_GUILDNET=""
NODES_BETANET=""

# Interval in millis
CHECK_INTERVAL=25000
LOW_BLOCKS_THRESHOLD=200
LOW_PEER_THRESHOLD=10

# For crontab
UPTIME_SYSTEM_URL=
# For failover checks
UPTIME_SYNC_URL=

SLACK_TOKEN=
SLACK_CHANNEL=
SLACK_LOG_CHANNEL=
# 10 mins
SLACK_STATUS_INTERVAL=600000
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

### 4. Support us!

If you found this useful, consider staking with our validator: `steak.poolv1.near` or making a donation to our DAO: `near send YOUR_ACCOUNT.near steakdao.sputnik-dao.near 5`