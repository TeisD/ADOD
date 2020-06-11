#!/usr/bin/env bash

#
# Run this file as a chron job every 5 minutes
#

# fetch images & remove the lock file
/usr/bin/tmux new -d -s instagram /home/ubuntu/.local/bin/instaloader --fast-update --count=1 --no-videos --no-video-thumbnails --post-filter="not is_video" --dirname-pattern=/home/ubuntu/ADOD-data/instagram/{target} $@
