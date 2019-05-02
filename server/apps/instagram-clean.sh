#!/bin/bash

DIR=$1
SIZE=500

cd "$DIR"

for d in */; do
    array=()
    
    find "$DIR/$d" -type f -name "*.txt" -print0 | sort -z >tmpfile
    while IFS=  read -r -d $'\0'; do
        filename=$(basename -- "$REPLY")
        filename="${filename%.*}"
        array+=("$filename")
    done <tmpfile
    rm -f tmpfile

    # calculate number of files to remove
    l=$(( ${#array[@]} - $SIZE ))
    echo "Found ${#array[@]} posts in $d"
    l=$(( $l > 0 ? $l : 0 ))
    echo "-> removing $l"

    for (( i=0; i<$l; i++ ))
    do
        rm $DIR/$d/${array[$i]}*
    done
    
done

echo "Done";