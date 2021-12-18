#!/bin/bash
echo "
+----------------------------------------------------------------------
| NEAR FAILOVER SETUP
+----------------------------------------------------------------------
";

cp -b .env.example .env

# setup the service
sudo systemctl link ~/near-failover/nearfailover.service
sudo systemctl enable nearfailover.service
sudo systemctl daemon-reload
sudo systemctl start nearfailover.service