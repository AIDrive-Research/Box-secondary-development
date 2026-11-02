import base64
import time
import uuid

import requests


def main():
    url = 'http://192.168.1.170:9092/ks/image'
    # 通过当前版本的token接口获取，不能沿用已过期的token。
    token = '请替换为有效token'
    source_id = '6964a1567f6f2e7547212cc0'
    with open('./test.jpg', 'rb') as file:
        image_data = base64.b64encode(file.read()).decode('utf-8')

    with requests.Session() as session:
        session.headers.update({
            'Authorization': 'Bearer {}'.format(token)
        })
        for _ in range(100):
            data = {
                # 必填，字符串：图片流数据源ID，可在系统的数据接入页面查看。
                'source_id': source_id,
                # 必填，整数：图片对应的13位毫秒时间戳。
                'time': time.time_ns() // 1000000,
                # 可选，字符串：调用方自定义的业务图片ID，不需要时删除此字段。
                # 产生告警后，通过告警推送的reserved_data.image_id携带原值。
                'image_id': uuid.uuid4().hex,
                # 必填，字符串：图片原始文件内容经过Base64编码后的字符串。
                # 不要添加data:image/jpeg;base64,等前缀。
                'image': image_data
            }
            try:
                response = session.post(url, json=data, timeout=(5, 15))
                response.raise_for_status()
                result = response.json()
            except (requests.RequestException, ValueError) as error:
                print('Request failed, image_id={}, error={}'.format(
                    data['image_id'], error))
                return False

            print('image_id={}, time={}, ret={}'.format(
                data['image_id'], data['time'], result))
            if result['error_code'] != 0:
                return False

            time.sleep(0.1)
    return True


if '__main__' == __name__:
    main()