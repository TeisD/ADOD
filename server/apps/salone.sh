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

# loop
while true
do

	# train 2500 iterations with finetuning turned on
	/home/ubuntu/torch/install/bin/th train.lua -input_h5 ../neuraltalk2-data/dataset/salone-3/cocotalk.h5 -input_json ../neuraltalk2-data/dataset/salone-3/cocotalk.json -checkpoint_path ../neuraltalk2-data/checkpoints -id 3 -finetune_cnn_after 0 -start_from ../neuraltalk2-data/checkpoints/model_id3.t7 -save_checkpoint_every 2500 -batch_size 10

done
