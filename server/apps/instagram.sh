#!/usr/bin/env bash

#
# Run this file as a chron job every 5 minutes
#

# fetch images & remove the lock file
tmux new -d -s instaloader instaloader --fast-update --no-videos --metadata-json --dirname-pattern=/home/ubuntu/mdw-2018-data/instagram/{target} "#salonedelmobile" "#milandesignweek" "#milanodesignweek" "#milandesign" "#mdw2018" "#mdw18" "#fuorisalone" "#fuorisalone2018" "#fuorisalone18" "#designweek" "#salone2018" "#salone18"
