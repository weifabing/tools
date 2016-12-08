#!/usr/bin/env python
# encoding: utf-8

import sys
import urllib, urllib2, cookielib, socket
import json

class Dingtalk(object):
    """docstring for Dingtalk"""
    BASE_API_URL = "https://oapi.dingtalk.com"
    CorpID       = "ding9a113c7d97034d24"
    CorpSecret   = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    _AccessToken = ""
    _Ticket      = ""
    _GLOB_CODE   = 0
    _GLOB_MSG    = ""

    def __init__(self, CorpID="", CorpSecret=""):
        if CorpID and CorpSecret:
            self.init_setting(CorpID, CorpSecret)
        else:
            self.init_setting(self.CorpID, self.CorpSecret)

    def init_setting(self, CorpID, CorpSecret):
        # return
        self.CorpID       = CorpID
        self.CorpSecret   = CorpSecret
        self._AccessToken = self.get_AccessToken()
        self._Ticket      = self.get_Ticket()

    def get_AccessToken(self):
        api_url = "{base_url}/gettoken?corpid={CorpID}&corpsecret={CorpSecret}".format(
            base_url=self.BASE_API_URL,
            CorpID=self.CorpID,
            CorpSecret=self.CorpSecret
        )
        data = self.get_json_request(api_url)
        if data['errcode'] == 0:
            return data['access_token']
        else:
            self._GLOB_CODE = data['errcode']
            self._GLOB_MSG  = data['errmsg']
            return ''

    def get_Ticket(self):
        api_url = "{base_url}/get_jsapi_ticket?access_token={access_token}".format(
            base_url=self.BASE_API_URL,
            access_token=self._AccessToken
        )
        data = self.get_json_request(api_url)
        if data['errcode'] == 0:
            return data['ticket']
        else:
            self._GLOB_CODE = data['errcode']
            self._GLOB_MSG  = data['errmsg']
            return ''
        print data

    def send(self, content='', touser='', toparty='', agentid=''):
        '''发送企业会话消息:
        https://open-doc.dingtalk.com/docs/doc.htm?treeId=172&articleId=104973&docType=1
        '''
        api_url = "{base_url}/message/send?access_token={access_token}".format(
            base_url=self.BASE_API_URL,
            access_token=self._AccessToken
        )
        public_data = dict()
        public_data['touser']  = touser
        public_data['toparty'] = toparty
        public_data['agentid'] = agentid
        public_data['msgtype'] = "text"
        public_data['text']    = {"content":content}
        result = self.get_json_request(api_url, json.dumps(public_data))
        print result
        return result

    def _request(self, url, post_data=""):
        try:
            req = urllib2.Request(url)
            req.add_header('Content-Type', 'application/json;charset=UTF-8')
            if post_data == "":
                response = urllib2.urlopen(req)
            else:
                if isinstance(post_data, str):
                    post_parms = post_data
                else:
                    post_parms = urllib.urlencode(post_data)
                response = urllib2.urlopen(req, post_parms)
            html = response.read()
        except Exception, e:
            html = ''
        return html

    def get_json_request(self, url, post_data=''):
        try_count = 0;
        _request_flag = True
        json_data = None
        while _request_flag is True and try_count <= 3:
            try_count += 1
            html_content = self._request(url, post_data)
            try:
                json_data = json.loads(html_content)
                _request_flag = False
                break
            except Exception, e:
                continue
        return json_data
