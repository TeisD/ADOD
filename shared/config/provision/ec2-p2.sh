#!/usr/bin/env bash

# using ami-bc09d9c1

sudo apt-get update
sudo apt-get upgrade

# install torch
git clone https://github.com/torch/distro.git ~/torch --recursive
cd ~/torch; bash install-deps;
export TORCH_NVCC_FLAGS="-D__CUDA_NO_HALF_OPERATORS__"
./install.sh
source ~/.bashrc

# update cudnn (gpu only)
git clone https://github.com/soumith/cudnn.torch.git -b R7 && cd cudnn.torch && luarocks make cudnn-scm-1.rockspec

# caption dependencies
luarocks install nn
luarocks install nngraph
luarocks install image
luarocks install lua-cjson
sudo apt-get install libprotobuf-dev protobuf-compiler -y
luarocks install loadcaffe
sudo apt-get install libhdf5-serial-dev hdf5-tools -y
git clone https://github.com/anibali/torch-hdf5.git
cd torch-hdf5
git checkout hdf5-1.10
luarocks make hdf5-0-0.rockspec LIBHDF5_LIBDIR="/usr/lib/x86_64-linux-gnu/"
cd ~
# for gpu only
luarocks install cutorch
luarocks install cunn
export CUDNN_PATH="/usr/local/cuda/lib64/libcudnn.so"

# converting dependencies
luarocks install https://raw.githubusercontent.com/bshillingford/fbdebugger-minimal/master/fbdebugger-standalone-1.rockspec
sudo apt-get install libedit-dev -y

# test data
git clone https://github.com/karpathy/neuraltalk2
cd neuraltalk2
mkdir data
cd data
mkdir models
cd models
wget http://cs.stanford.edu/people/karpathy/neuraltalk2/checkpoint_v1.zip
unzip checkpoint_v1.zip
rm checkpoint_v1.zip
mv model_id1-501-1448236541.t7 base.t7
cd ../
mkdir images
cd images
wget http://s.f.teis.me/Archive-xrKEmFsgzj.zip
unzip Archive-xrKEmFsgzj.zip
rm Archive-xrKEmFsgzj.zip
rm __MACOSX -r
cd ../../

# test
th eval.lua -model data/models/base.t7 -image_folder data/images -num_images 10
cd vis
python -m SimpleHTTPServer

# dependencies for the saloneScraper
cd ~
# node
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
# mongodb
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list
sudo apt-get update
sudo apt-get install -y mongodb-org
# git repository
git clone https://github.com/TeisD/mdw-2018
cd mdw-2018
npm i
# prepare some folder
mkdir data && cd data
mkdir salone && cd salone
mkdir images
# run or copy the db data form local
scp -i config/keys/ec2-us.pem data/salone/db.zip ubuntu@ec2-54-226-8-219.compute-1.amazonaws.com:~/mdw-2018/data/salone
unzip db.zip
rm db.zip && rm -r __MACOSX
# start mongo server
tmux new -s mongodb
mongod --dbpath ./db
# ctrl-b d
node ../../src/apps/saloneScraper.js images
