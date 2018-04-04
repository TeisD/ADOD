#!/usr/bin/env bash

#
# Run this file as a chron job every 5 minutes
#

# exit if the lock file is present
if [ ! -f /home/ubuntu/mdw-2018-data/instagram/lock ]; then
    echo "Process already running!"
		exit 0
fi

# create a lock file
touch /home/ubuntu/mdw-2018-data/instagram/lock

# fetch images
tmux new -d -s instaloader instaloader --fast-update --no-videos --metadata-json --dirname-pattern=/home/ubuntu/mdw-2018-data/instagram/{target} "#salonedelmobile" "#milandesignweek" "#milanodesignweek" "#milandesign" "#mdw2018" "#mdw18" "#fuorisalone" "#fuorisalone2018" "#fuorisalone18" "#designweek" "#salone2018" "#salone18"

# remove the lock file
rm /home/ubuntu/mdw-2018-data/instagram/lock
