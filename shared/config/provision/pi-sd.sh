#!/usr/bin/env bash

touch /Volumes/boot/ssh
cp ../keys/wpa_supplicant.conf /Volumes/boot
diskutil unmountDisk /Volumes/boot
