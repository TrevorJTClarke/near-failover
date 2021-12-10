#!/bin/bash
echo "
+----------------------------------------------------------------------
| NEAR FAILOVER SETUP
+----------------------------------------------------------------------
";

cp -b .env.example .env

# setup the service
cp -b nearfailover.service /etc/systemd/system/nearfailover.service
sudo systemctl enable nearfailover