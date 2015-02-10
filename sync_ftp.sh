#!/bin/sh
FTP_HOST='ftp.drivehq.com'
FTP_USER='weifabing'
FTP_PASS='******'
FTP_PORT=21
SRC="/DriveHQData/abc"
DESC="/tmp/abc"
OLD_FILE=$(date +%Y-%m-%d)
lftp << EOF
open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST:$FTP_PORT
cd $SRC
ls
lcd $DESC
mirror -c --only-newer --ignore-time --verbose $SRC $DESC
mrm -f $OLD_FILE
bye
EOF
echo "OK!."
