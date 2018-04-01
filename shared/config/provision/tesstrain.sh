#!/usr/bin/env bash

# install tesseract
sudo apt-get update
sudo apt-get install tesseract-ocr libtesseract-dev libleptonica-dev git -q -y

# check if TESSDATA_PREFIX is in path
echo $TESSDATA_PREFIX

# get the data files
git clone --depth 1 https://github.com/tesseract-ocr/langdata.git

# install the fonts
# fc-list
sudo cp ~/z33/assets/fonts/*.otf /usr/share/fonts

# copy updated xheights
cp ~/z33/assets/fonts/Latin.xheights ~/langdata/Latin.xheights

# train english
tesstrain.sh --lang eng --langdata_dir langdata --fontlist 'Times NR Seven MT Std Medium' 'Times NR Seven MT Std Medium Italic' 'Times NR Seven MT Std Bold' 'Times NR Seven MT Std Bold Italic'

# copy the data from the temp folder
cp /tmp/tesstrain/tessdata/eng.traineddata ~/z33/assets/languages/eng.traineddata
