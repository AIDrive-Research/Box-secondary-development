import base64
import json
import threading
import time
import uuid

import paho.mqtt.client as mqtt


def init_mqtt():
    connected = threading.Event()

    def on_connect(client, userdata, flags, reason_code, properties):
        connected.set()
        return None

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id='test_image_source_{}'.format(uuid.uuid4().hex),
        protocol=mqtt.MQTTv5,
        transport='websockets')
    client.ws_set_options(path='/mqtt')
    client.username_pw_set('work', 'Bjhmdys@202010')
    client.on_connect = on_connect
    # AI服务器IP及统一HTTP入口端口。
    client.connect('192.168.1.170', 9092, clean_start=True)
    client.loop_start()
    if not connected.wait(timeout=10) or not client.is_connected():
        client.disconnect()
        client.loop_stop()
        raise ConnectionError('MQTT connection failed')
    return client


def main():
    source_id = '6964a1567f6f2e7547212cc0'
    with open('./test.jpg', 'rb') as file:
        image_data = base64.b64encode(file.read()).decode('utf-8')

    mqtt_client = init_mqtt()
    try:
        for _ in range(100):
            payload = {
                # 必填，字符串：唯一消息ID，每条新消息使用不同值。
                'msg_id': str(uuid.uuid4()),
                # 必填，字符串：消息类型，固定为image。
                'msg_type': 'image',
                # 必填，字典：图片业务数据。
                'data': {
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
            }
            # 默认图片输入主题，以设备实际配置为准。
            result = mqtt_client.publish(
                'ks/image', json.dumps(payload, ensure_ascii=False),
                qos=1, retain=False)
            result.wait_for_publish(timeout=15)
            if not result.is_published():
                print('Publish timed out, msg_id={}'.format(payload['msg_id']))
                return False
            print('Published, image_id={}'.format(payload['data']['image_id']))
            time.sleep(0.1)
        return True
    finally:
        mqtt_client.disconnect()
        mqtt_client.loop_stop()


if '__main__' == __name__:
    main()
