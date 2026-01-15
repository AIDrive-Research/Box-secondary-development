import base64
import json
import time

import requests


def main():
    # 192.168.1.170为AI服务器IP
    url = 'http://192.168.1.170:9088/ks/image'
    # token，需要通过token接口获取
    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwiZXhwaXJlIjoxNzY4MjA5OTEwLjU3MTY0NjV9.yap43GCRuxKfgSYGb_ivmg4EXQY9Si_m7RdNrX7xyhA'
    headers = {
        'authorization': 'Bearer {}'.format(token)
    }
    image_path = './test.jpg'
    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')
    for _ in range(100):
        data = {
            # 数据源id，在系统页面中可以查看到
            'source_id': '6964a1567f6f2e7547212cc0',
            # 时间戳，毫秒级
            'time': time.time_ns() // 1000000,
            'image': image_data
        }
        resp = requests.post(url, json=data, headers=headers)
        if 200 == resp.status_code:
            ret = json.loads(resp.text)
            print('time={}, ret={}'.format(data['time'], ret))
        else:
            print('Request failed, time={}, status_code={}'.format(data['time'], resp.status_code))
        time.sleep(0.1)
    return True


if '__main__' == __name__:
    main()
