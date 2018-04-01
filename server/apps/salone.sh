#!/usr/bin/env bash

#
# Run this file automatically on boot in a tmux session
# add to /etc/rc.local
# sudo -u ubuntu tmux new-session -d -s "neuraltalk" sh /home/ubuntu/mdw-2018/server/apps/salone.sh
#

# start from the right folder
cd /home/ubuntu/neuraltalk2

# loop
while true
do

	# train 2500 iterations with finetuning turned on
	th train.lua -input_h5 data/salone-2/cocotalk.h5 -input_json data/salone-2/cocotalk.json -checkpoint_path checkpoints -id 2fine -finetune_cnn_after 0 -start_from checkpoints/model_id2.t7 -max_iters 2501 -save_checkpoint_every 2500 -batch_size 10

	# convert checkpoint to CPU
	th convert_checkpoint_gpu_to_cpu.lua checkpoints/model_id2fine.t7

	# copy to the other server
	scp -i "~/mdw-2018/shared/config/keys/ec2-20180302.pem" checkpoints/model_id2fine.t7 ubuntu@ec2-18-197-19-124.eu-central-1.compute.amazonaws.com:~/neuraltalk2-data/salone.t7-new

	# replace the old file on server with new one
	ssh -i "~/mdw-2018/shared/config/keys/ec2-20180302.pem" ubuntu@ec2-18-197-19-124.eu-central-1.compute.amazonaws.com -t "cd ~/neuraltalk2-data ; mv salone.t7 salone.t7-old ; mv salone.t7-new salone.t7 ; rm salone.t7-old"

done
