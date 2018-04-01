#!/usr/bin/env bash

sudo apt-get update

# install node & dependencies
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
sudo apt-get install -y libcairo2-dev libjpeg-dev libgif-dev

# install the repository
npm i

# setup AWS credentials
mkdir ~/.aws
touch ~/.aws/credentials
echo 'Done! Now copy the keys to ~/.aws/credentials';

# install mysql
sudo apt-get install mysql-server
mysql_secure_installation
