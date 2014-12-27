#!/usr/bin/python  
# -*- coding:utf-8 -*-  
# @auth: weifabing@gmail.com

import os, sys
import os.path
import urllib, urllib2, cookielib
import re
from random import choice

def main():
    words = '旅游'
    url = "http://sug.so.360.cn/suggest?callback=suggest_so&encodein=utf-8&encodeout=utf-8&format=json&fields=word,obdata&word=%s"
    request_url = url % (urllib2.quote(words))
    headers = {
        "GET": request_url,
        "Host": "gem.www.so.com",
        "Referer": "http://www.so.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0",
    }
    
    proxy_list = get_proxy() #["111.192.28.38:8118","61.184.192.42:80","121.12.120.246:2008"]
    proxy = choice(proxy_list)
    proxy_ip = "%(IP)s:%(PORT)s" % proxy
    print proxy_ip
    proxy_handler = urllib2.ProxyHandler({'http': 'http://'+proxy_ip})    
    opener = urllib2.build_opener(proxy_handler)
    urllib2.install_opener(opener)
    request = urllib2.Request(request_url)
    for key in headers:
        request.add_header(key, headers[key])
    html = urllib2.urlopen(request).read()
    unicodeWord = html.decode("utf-8") 
    ss = re.findall('"word":\"(.*?)\"', unicodeWord)
    datas = []
    for item in ss:
        datas.append(item+'\t')
        print item
    # print datas


def get_proxy():
    cache_file = "proxy.html"
    RE_PROXY = re.compile(r"<tr class=(\"\"|odd)>\n<td></td>\n<td><img alt=Cn src=.*?/></td>\n<td>(?P<IP>.*?)</td>\n<td>(?P<PORT>.*?)</td>.*?<td>HTTP</td>.*?<div class=\"bar_inner fast\".*?>.*?</tr>", re.S)
    if not os.path.exists(cache_file):
        proxy_url = "http://www.xici.net.co/nn/"
        headers = {
            "GET": proxy_url,
            "Host": "www.xici.net.co",
            "Referer": "http://www.xici.net.co/",
            "User-Agent": "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0",
            "Cookie": " incap_ses_199_257263=Oph+R2+htFNpyUL9Uh7DAgq8nlQAAAAAipsRsA2UgA+KmKisoviTug==; visid_incap_257263=cT5gkwsCRLGBAGvomoGt/Pq7nlQAAAAAQUIPAAAAAABYvYj6oQ+yYSefWGvOysqS; CNZZDATA4793016=cnzz_eid%3D433580307-1419688288-http%253A%252F%252Fwww.xici.net.co%252F%26ntime%3D1419688288",
        }
        request = urllib2.Request(proxy_url)
        for key in headers:
            request.add_header(key, headers[key])
        html = urllib2.urlopen(request).read()
        htmlHandle = open(cache_file, 'wb')
        htmlHandle.write(html)
        htmlHandle.close()
    else:
        html =open(cache_file, 'U').read()
    proxys = []
    for proxy in RE_PROXY.finditer(html):
        proxys.append(proxy.groupdict())
    return proxys 

if __name__ == '__main__':
    main()
