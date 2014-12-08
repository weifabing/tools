#!/bin/bash

SOURCES_LIST='/etc/apt/sources.list'
APT_HOME='/etc/apt/'
APT_SPY_SOURCES='deb http://http.us.debian.org/debian/ lenny main'
SSH_HOME='/etc/ssh'
VSFTPD_CONF='/etc/vsftpd.conf'
PASSWD_FILE='/etc/passwd'
USE_BIN='/root/bin/'
INITTAB='/etc/inittab'
date=`date +%F`
user="admin"

#lock users
function lock_user 
{
    cp /etc/passwd /etc/passwd.bak.$date
    passwd -l games 1>/dev/null
    sed -i -e '/^games/s/sh/false/' $PASSWD_FILE
    passwd -l lp 1>/dev/null
    sed -i -e '/^lp/s/sh/false/' $PASSWD_FILE
    passwd -l mail 1>/dev/null
    sed -i -e '/^mail/s/sh/false/' $PASSWD_FILE
    passwd -l news 1>/dev/null
    sed -i -e '/^news/s/sh/false/' $PASSWD_FILE
    passwd -l list 1>/dev/null
    sed -i -e '/^list/s/sh/false/' $PASSWD_FILE
    passwd -l irc 1>/dev/null
    sed -i -e '/^irc/s/sh/false/' $PASSWD_FILE
    passwd -l Debian-exim 1>/dev/null
    sed -i -e '/^Debian-exim/s/sh/false/' $PASSWD_FILE
    echo "lock user done!"
    echo "***************************"
}

#change /etc/inittab
function change_inittab
{
    cp /etc/inittab /etc/inittab.bak.$date
    sed -i -e '/^3:/s/^/#/' $INITTAB
    sed -i -e '/^4:/s/^/#/' $INITTAB
    sed -i -e '/^5:/s/^/#/' $INITTAB
    sed -i -e '/^6:/s/^/#/' $INITTAB

    LEVEL=`grep -i 'initdefault' $INITTAB |awk -F':' '{print $2}'`
    if [ ! -z "$LEVEL" ];then
       # 双引号“”可以转义但单引号‘’不能，所以此处sed 用双引号
       sed -i -e "/^id:/s/$LEVEL/2/" $INITTAB
       echo 'change inittab done!'
    fi
    echo "***************************"
}

#change /etc/securetty Standard consoles
function security_tty
{
    cp /etc/securetty /etc/securetty.bak.$date
    sed -i -e '/^tty[1-99]/s/^/#/;s/^#tty1$/tty1/' /etc/securetty
    echo "finish security_tty"
    echo "***************************"
}

#create user 
function create_user
{
NAME=`awk -F':' '/admin/{print $1}' /etc/passwd`
if [ -z $NAME ];then
   PASS=`python <<EOF
import crypt
print crypt.crypt("123456","admin")
EOF`
   #echo $PASS
   #建立用户test并设置密码
   useradd -m -d /home/admin -s /bin/bash -g staff -p $PASS admin
   #强制用户密码过期，第一次登陆需重新设置密码
   chage -d 0 admin
   mkdir -p /home/admin/bin;chown -R admin:staff /home/admin/bin
   echo 'user admin create succeed!'
else
   echo 'admin already exist!'
fi
    echo "finish create_user"
    echo "***************************"
}

#安装 apt-spy 并选择比较快的源
function apt_spy
{
    if [ ! -d "$USE_BIN" ];then
       mkdir -p /root/bin/
    fi
    if [ -f "$SOURCES_LIST" ];then
       cd $APT_HOME;cp sources.list sources.list.$date;
       sed -i -e 's/^#//' sources.list
       sed -i -e 's/^/#/' sources.list
       echo $APT_SPY_SOURCES >>sources.list
       apt-get update
       apt-get --yes install apt-spy
       apt-spy -d stable -o /root/bin/sources.list -a Asia -t 5
       cat /root/bin/sources.list >> $SOURCES_LIST
       sed -i -e 's/stable/lenny/g' sources.list
       
    fi
    echo "finish apt_spy"
    echo "***************************"


    #/etc/hosts
    #/etc/hostname
    #deb http://mirrors.163.com/debian/ lenny main non-free contrib
    #deb http://mirrors.163.com/debian/ lenny-proposed-updates main non-free contrib
    #deb-src http://mirrors.163.com/debian/ lenny main non-free contrib
    #deb-src http://mirrors.163.com/debian/ lenny-proposed-updates main non-free contrib
     
    #deb http://mirrors.sohu.com/debian/ lenny main non-free contrib
    #deb http://mirrors.sohu.com/debian/ lenny-proposed-updates main non-free contrib
    #deb-src http://mirrors.sohu.com/debian/ lenny main non-free contrib
    #deb-src http://mirrors.sohu.com/debian/ lenny-proposed-updates main non-free contrib
}

#install software
function install_software
{
    apt-get update
    apt-get --yes install ssh
    if [ -f "$SSH_HOME/sshd_config" ];then
       cd $SSH_HOME;cp sshd_config sshd_config.$date
       sed -i -e 's/PermitRootLogin yes/PermitRootLogin no/' sshd_config
       echo "restart sshd,waiting..."
       /etc/init.d/ssh restart
    fi

    #install gcc
    apt-get --yes install build-essential libtool autoconf automake tofrodos



    #install ntp rcconf less sudo
    apt-get --yes install ntp rcconf less sudo postfix rsync ifstat logwatch sysstat logcheck lm-sensors syslog-summary
    chmod +w /etc/sudoers
    sed -i -e '/sudo ALL/s/^#//' /etc/sudoers
    chmod 0440 /etc/sudoers

    #install curl
    apt-get --yes install curl

    #install at
    #apt-get --yes install at

    #install lvm2
    #apt-get --yes install lvm2

    #install vim
    apt-get --yes install vim
    sed -i -e '/syntax on/s/^.*$/syntax on/' /etc/vim/vimrc

UTF8=`awk -F'=' '/fileencodings=utf-8/{print $1}' /etc/vim/vimrc`
    if [ -z ${UTF8} ];then
cat << EOF >> /etc/vim/vimrc
set fileencodings=utf-8,gb2312,gbk,gb18030
set termencoding=utf-8
set encoding=prc
EOF
    fi
    echo "finish install software"
    echo "***************************"
}

#install vsftpd
function install_vsftpd
{
    apt-get --yes install vsftpd
    if [ -f "$VSFTPD_CONF" ];then
       sed -i -e 's/anonymous_enable=YES/anonymous_enable=NO/' $VSFTPD_CONF
       sed -i -e 's/#local_enable=YES/local_enable=YES/' $VSFTPD_CONF
       sed -i -e 's/#write_enable=YES/write_enable=YES/' $VSFTPD_CONF
       sed -i -e 's/#local_umask=022/local_umask=022/' $VSFTPD_CONF
       sed -i -e 's/#ascii_upload_enable=YES/ascii_upload_enable=YES/' $VSFTPD_CONF
       sed -i -e 's/#ascii_download_enable=YES/ascii_download_enable=YES/' $VSFTPD_CONF
       echo "restart vsftpd, waiting..."
       /etc/init.d/vsftpd restart
    else
       echo "not install vsftpd!"
    fi

    echo "***************************"
}

#stop ipv6
function stop_ipv6
{
    BLACKLIST=`awk -F' ' '/blacklist ipv6/{print $1}' /etc/modprobe.d/blacklist`
    if [ -z "${BLACKLIST}" ];then    
        echo "blacklist ipv6" >> /etc/modprobe.d/blacklist
    fi    
    echo "finish stop_ipv6"    
    echo "***************************"
}

#config limits
function config_limits
{
    LIMIT=`awk -F' ' '/nofile  10240/{print $1}' /etc/security/limits.conf | head -n 1`
    if [ -z ${LIMIT} ];then
        echo '*        soft    nofile  10240' >> /etc/security/limits.conf
        echo '*        hard    nofile  10240' >> /etc/security/limits.conf
    fi
    echo "finish config_limits"
    echo "***************************"
}

function config_bash
{
cat << EOF >> /home/admin/.profile
PS1='${debian_chroot:+($debian_chroot)}\h@\u:\w\$ '
EOF

    echo "alias ll='ls -l --color=auto'" >> /etc/profile
    echo "alias ls='ls --color=auto'" >> /etc/profile



    echo "finish config_bash"
    echo "***************************"
}

function config_dns
{
    echo "nameserver 202.106.0.20" >> /etc/resolv.conf
    echo "nameserver 8.8.8.8" >> /etc/resolv.conf
    echo "nameserver 8.8.4.4" >> /etc/resolv.conf
    echo "nameserver 208.67.222.222" >> /etc/resolv.conf
    echo "nameserver 208.67.220.220" >> /etc/resolv.conf
    echo "finish config_dns"
    echo "***************************"
}

function config_crontab
{
    
    MAIL=`awk -F'=' '/MAILTO/{print $2}' /etc/crontab`
    if [ -z ${MAIL} ];then
            sed -i -e '/PATH/aMAILTO=root' /etc/crontab
    fi
    sed -i -e '/^root/s/^.*$/root:\ sa\@kongfz.com/' /etc/aliases #todo  not have root
    echo "finish config_crontab"
    echo "***************************"

}

function config_timezone
{
        echo "Asia/Shanghai" > /etc/timezone
        cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
    echo "finish config_timezoe"
    echo "***************************"

}
config_dns
lock_user
change_inittab
security_tty
create_user
apt_spy
install_software
stop_ipv6
config_limits
config_bash
config_crontab
config_timezone

aptitude update && aptitude full-upgrade

apt-get clean all

echo "**************************"
echo "please config sudo postfix and ssh"
