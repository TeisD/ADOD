#!/usr/bin/env bash

#
# Run this file as a chron job every 5 minutes
#

# make paths relative
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd "$parent_path" + "/../../data/instagram"

# exit if the lock file is present
if [ ! -f lock ]; then
    echo "Process already running!"
		exit 0
fi

# create a lock file
touch lock

# fetch images
instaloader --fast-update --no-videos --metadata-json "#salonedelmobile" "#milandesignweek" "#milanodesignweek" "#milandesign" "#mdw2018" "#mdw18" "#fuorisalone" "#fuorisalone2018" "#fuorisalone18" "#designweek" "#salone2018" "#salone18"

# remove the lock file
rm lock
