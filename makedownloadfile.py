# -*- coding: utf-8 -*-

import os
import sys
import math
from pymongo.connection import MongoClient
from pprint import pprint

reload(sys)
sys.setdefaultencoding('utf-8')
PROJECT_DIR = os.path.abspath(os.path.dirname(__file__))

def main():
    PageSize = 20
    client = MongoClient("127.0.0.1", 27017)
    Mongo  = client["travels"]
    data_count =  Mongo["images"].count()
    page_count = math.ceil( (data_count + 0.0) / PageSize  )
    page_count = 10
    flag_count = 0
    image_count = 0
    file_line_size = 30 #每个文件行数
    
    user_dir = 0 #用户目录
    file_name = 1 #下载文件名
    down_file = os.path.join(PROJECT_DIR, 'down', str(user_dir), "down_%s.txt" % file_name)
    file_object = open(down_file, 'wb+')

    for page in xrange(0, int(page_count)):
        for img in Mongo["images"].find().skip(page*PageSize).limit(PageSize):
            image_count += len(img["image_urls"])

            for line in img["image_urls"]:
                file_object.write(line+"\n")

                flag_count += 1
                if flag_count % file_line_size == 0:
                    user_dir  += 1
                    file_name += 1 #修改文件名
                    user_dir = user_dir % 4

                    file_object.close() #关闭老文件
                    down_file = os.path.join(PROJECT_DIR, 'down', str(user_dir), "down_%s.txt" % file_name)
                    # 打开新文件
                    file_object = open(down_file, 'wb+')

                    print down_file
                    flag_count = 0

    # 运行后处理
    file_object.close()

    # pprint(flag_count)
    pprint(image_count)


if __name__ == '__main__':
    main()
