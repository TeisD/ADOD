#!/usr/bin/env bash

# install autossh
sudo apt-get install autossh ssh -y

# create an sshtunnel user with limited shell access
sudo useradd -s /usr/sbin/nologin -m sshtunnel

# switch to sshtunnel user
sudo su sshtunnel -s /bin/bash

# generate a key
ssh-keygen -t rsa -b 2048 -q -N "" -f ~/.ssh/teis-me

# copy the key to the middleman
# we can’t use ssh-copy-id because the sshtunnel user has no shell access
scp ~/.ssh/teis-me.pub teis@teis.me:~

# add the key on the middle main
echo 'Execute the following command on the middleman:'
echo "echo 'no-agent-forwarding,no-user-rc,no-X11-forwarding,no-pty' \$(cat teis-me.pub) | sudo su -s /bin/bash sshtunnel -c \"tee >> ~/.ssh/authorized_keys\""

# remove the copied key file
ssh teis@teis.me "rm ~/teis-me.pub"

# add the middleman to the list of known hosts
ssh-keyscan -H -t rsa teis.me | tee >> ~/.ssh/known_hosts

# test the connection
#autossh -v -i ~/.ssh/teis-me teis.me -N -R 9000:localhost:22

# test the connection on the middleman
#ssh pi@localhost -p 9000

# switch back to default user on raspberry
echo "Password for user 'pi'"
su pi

#promt the ID of this raspberry
echo "Please enter the ID of this Raspberry (01-54)"
read id

# start autossh on boot
sudo sed -i -e '$i # create sshtunnel\nsu -s /bin/sh sshtunnel -c "autossh -f -i ~/.ssh/teis-me teis.me -N -R 6'${id}'22:localhost:22"\n' /etc/rc.local

# add an extra connection
sudo sed -i -e '$i # create sshtunnel\nsu -s /bin/sh sshtunnel -c "autossh -f -i ~/.ssh/teis-me teis.me -N -R 6'${id}'31:localhost:631"\n' /etc/rc.local

# reboot
sudo reboot
