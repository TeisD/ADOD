#!/bin/bash

#
# Run this file automatically on boot in a tmux session
# crontab -e
# @reboot tmux new-session -d -s neuraltalk bash /home/ubuntu/mdw-2018/server/apps/salone.sh
#

# auto-update
cd /home/ubuntu/mdw-2018
git pull

# start from the right folder
cd /home/ubuntu/neuraltalk2

# export paths
export CUDNN_PATH="/usr/local/cuda/lib64/libcudnn.so"

# process all projects
for D in /home/ubuntu/mdw-2018-data/projects/*/; do
	echo "Processing ${D}"

	# run the network
	/home/ubuntu/torch/install/bin/th eval.lua -model ../neuraltalk2-data/checkpoints/model_id3.t7 -image_folder "${D}" -num_images -1 -dump_images 0 -sample_max 0

	# copy the results to the server
	/usr/bin/scp -i "/home/ubuntu/mdw-2018/shared/config/keys/ec2-20180302.pem" vis/vis.json "ubuntu@ec2-18-197-19-124.eu-central-1.compute.amazonaws.com:${D}"

done
