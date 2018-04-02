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
	/home/ubuntu/torch/install/bin/th train.lua -input_h5 ../neuraltalk2-data/dataset/salone-2/cocotalk.h5 -input_json ../neuraltalk2-data/dataset/salone-2/cocotalk.json -checkpoint_path ../neuraltalk2-data/checkpoints -id 2fine -finetune_cnn_after 0 -start_from ../neuraltalk2-data/checkpoints/model_id2fine.t7 -max_iters 2501 -save_checkpoint_every 2500 -batch_size 10

	# convert checkpoint to CPU
	/home/ubuntu/torch/install/bin/th convert_checkpoint_gpu_to_cpu.lua ../neuraltalk2-data/checkpoints/model_id2fine.t7

	# copy to the other server
	/usr/bin/scp -i "/home/ubuntu/mdw-2018/shared/config/keys/ec2-20180302.pem" ../neuraltalk2-data/checkpoints/model_id2fine.t7_cpu.t7 ubuntu@ec2-18-197-19-124.eu-central-1.compute.amazonaws.com:~/neuraltalk2-data/salone.t7-new

	# replace the old file on server with new one
	/usr/bin/ssh -i "/home/ubuntu/mdw-2018/shared/config/keys/ec2-20180302.pem" ubuntu@ec2-18-197-19-124.eu-central-1.compute.amazonaws.com -t "cd ~/neuraltalk2-data ; mv salone.t7 salone.t7-old ; mv salone.t7-new salone.t7 ; rm salone.t7-old"

done
