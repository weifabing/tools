#!/bin/sh
SRC=/root/shell/
inotifywait=/usr/local/bin/inotifywait
WAIT_FILE="ftp.sh"
i=0
# access、modify、 attrib、 close_write、 close_nowrite、close、open、
# moved_to、 moved_from、move、 move_self、 create、delete、delete_self、unmount
$inotifywait -rmq --format '%T %w %f %e' --timefmt '%d/%m/%y %H:%M' -e create,modify $SRC | while read d t p f e
do
if [ $f = $WAIT_FILE ]; then
    i=$(( $i+1 ))
    chmod +x $p$f
    clear
    echo "Testing:"$i
    sh $p$f
fi
done
