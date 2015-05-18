#!/bin/bash
# mysql备份脚本

MYSQL="mysql"
MYSQLDUMP="myqldump"
USERNAME="root"
PASSWORD="root"
BACKUP_DIR="/var/backup/mysqlbak"
dateDIR=$(date +"%y-%m-%d")

mkdir -p $BACKUP_DIR/$dateDIR
cd $BACKUP_DIR

for db in $($MYSQL -u${USERNAME} -p${PASSWORD} -e "show databases" | grep -v "Database" | grep -v "information_schema")
do
    ${MYSQLDUMP} -u${USERNAME} -p${PASSWORD} $db | gzip  > $BACKUP_DIR/$dateDIR/${db}_${dateDIR}.gz
done
