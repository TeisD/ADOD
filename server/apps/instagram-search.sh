#!/bin/bash

DIR=$1
COUNT=$2
KEYWORDS=""

for KEYWORD in "${@:3}"
do
	KEYWORDS="$KEYWORDS -e '$KEYWORD'"
done

timeout 10 bash -c "find '$DIR' -type f -name *.txt -printf '%f %p\0' | sort -z -k1,1 -u -r | cut -z -f2 -d' ' | xargs -r0 grep -l --line-buffered -i $KEYWORDS | head -n$COUNT"
