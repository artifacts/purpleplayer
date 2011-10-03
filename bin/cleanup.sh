#!/bin/sh

# script to remove all debugging commands from
# a javascript file and minify with the yahoo
# compressor tool
#
# usage:
#  ./bin/cleanup.sh ./path/to/my/jsfile.js > ./path/to/output.js/or/stdout

HERE=`dirname $0`

cat "$@" | sed "s/\ console.log/\ \/\/console.log/" | java -jar $HERE/yuicompressor-2.4.6.jar --type js 
