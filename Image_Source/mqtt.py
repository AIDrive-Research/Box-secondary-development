import base64
import json
import time
import uuid

import paho.mqtt.client as mqtt


def init_mqtt():
    # 192.168.1.170为AI服务器IP
    host = '192.168.1.170'
    port = 1883
    # MQTT用户名，密码
    username = 'work'
    password = 'Bjhmdys@202010'
    client_id = 'test_image_source_client'
    protocol = mqtt.MQTTv5
    callback_api_version = getattr(mqtt.CallbackAPIVersion, 'VERSION2')
    client = mqtt.Client(callback_api_version, client_id, protocol=protocol)
    client.username_pw_set(username=username, password=password)
    client.connect(host, port, clean_start=True)
    return client


def main():
    topic = 'ks/image'
    mqtt_client = init_mqtt()
    mqtt_client.loop_start()
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
        payload = {
            'msg_id': str(uuid.uuid4()),
            # 消息类型，固定为：image
            'msg_type': 'image',
            'data': data
        }
        str_payload = json.dumps(payload, ensure_ascii=False, indent=4)
        mqtt_client.publish(topic, payload=str_payload, qos=1, retain=False)
        print('Published message to topic: {}, time={}'.format(topic, data['time']))
        time.sleep(0.1)
    mqtt_client.loop_stop()
    return True


if '__main__' == __name__:
    main()
