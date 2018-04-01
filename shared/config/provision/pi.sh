sudo apt-get update

# install node-canvas dependencies
sudo apt-get install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++ -y

# install cups & drivers
sudo apt-get install cups hplip -y
#sed -i 's/Listen localhost:631/Port 631/' /some/file/some/where.txt
# TODO update config file
#sudo /etc/init.d/cups restart
# TODO ssh tunnel

# install node-opencv dependencies
sudo apt-get install -y imagemagick
# install opencv
sudo apt-get install -y libopencv-dev
# check if it installed correctly
echo "OpenCV version:"
pkg-config --modversion opencv

# run npm
cd ~/mdw-2018
git pull
npm i
