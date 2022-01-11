#!/bin/bash
echo "
+----------------------------------------------------------------------
| NEAR FAILOVER SETUP
+----------------------------------------------------------------------
";

# sudo rm /etc/systemd/system/nearfailover.service
# setup the service
sudo systemctl link ~/near-failover/src/nearfailover.service
sudo systemctl enable nearfailover.service
sudo systemctl daemon-reload
sudo systemctl start nearfailover.service