#!/bin/bash
BASE_URL=https://oapi.dingtalk.com
CorpID=ding9a113c7d97034d24
CorpSecret=xxxxxxxxxxxxxxxxxxxxxx
ToUserId=xxxxxxxxxxxxxxxxxxx
AgentId=xxxxxxxxxxxxx

# Public Functions
# ===============================================
parse_json()
{
    echo $1 | sed 's/.*'$2'"*:"*\([^,}"]*\).*/\1/'
}
# ===============================================

# Get AccessToken
api_url="${BASE_URL}/gettoken?corpid=${CorpID}&corpsecret=${CorpSecret}"
echo "Step 1: Request AccessToken"
JSON=$(curl --silent $api_url)
access_token=$(parse_json $JSON "access_token")

# Send Message
echo "Step 2: Send Message"
api_url="${BASE_URL}/message/send?access_token=${access_token}"
content="服务器发生故障请及时处理 \nFrom: 魏法兵\nTime: `date '+%Y-%m-%d %H:%M:%S'`"
curl $api_url --silent \
-H "Content-Type:application/json;charset=UTF-8" \
--data "{\"touser\":\"${ToUserId}\", \"agentid\":\"${AgentId}\", \"msgtype\":\"text\", \"text\":{\"content\":\"${content}\"}}"
