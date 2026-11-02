// 新版本接口公共工具：所有设备请求统一使用 9092，继续使用 AK/SK 签名。
const DemoApi = {
  url(path, params) {
    const base = new URL(ZQLGLOBAL.baseUrl || `http://${ZQLGLOBAL.serverIp}`);
    base.port = '9092';
    const url = new URL(path.replace(/^:\d+/, ''), base.origin);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    return url.href;
  },
  error(error) {
    console.error('设备请求失败', error);
    layui.use('layer', () => layui.layer.msg(error.message || '请求失败，请检查设备网络和 AK/SK', {icon: 2}));
  },
  request(method, path, data, params, raw = false) {
    return new Promise((resolve, reject) => {
      const multipart = typeof FormData !== 'undefined' && data instanceof FormData;
      $.ajax({
        type: method, url: DemoApi.url(path, params), dataType: 'json', timeout: 60000,
        data: data === undefined ? undefined : multipart ? data : JSON.stringify(data),
        // 静态算法 JSON 使用简单 GET，避免触发 Nginx 不支持的 OPTIONS 预检。
        contentType: multipart || data === undefined ? false : 'application/json', processData: !multipart,
        beforeSend(xhr) {
          if (!raw && ZQLGLOBAL.token) xhr.setRequestHeader('Authorization', `Bearer ${ZQLGLOBAL.token}`);
        },
        success(res) {
          if (!raw && (!res || res.error_code !== 0)) reject(new Error((res || {}).message || '接口返回失败'));
          else resolve(res);
        },
        error(xhr) { reject(new Error((xhr.responseJSON || {}).message || `请求失败（${xhr.status}）`)); }
      });
    });
  },
  async getToken() {
    const timestampRes = await DemoApi.request('GET', ZQLGLOBAL.getTime);
    const timestamp = timestampRes.data;
    const nonce = DemoApi.generateRandomString(10);
    const signature = DemoApi.generateSignature(ZQLGLOBAL.accessKey, ZQLGLOBAL.accessSecret, timestamp, nonce);
    return DemoApi.request('GET', ZQLGLOBAL.getToken, undefined,
      {signature, ak: ZQLGLOBAL.accessKey, timestamp, nonce});
  },
  generateSignature(ak, sk, timestamp, nonce) {
    return CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(`${ak}:${timestamp}:${nonce}`, sk));
  },
  generateRandomString(length) {
    return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex).slice(0, length);
  }
};
window.addEventListener('unhandledrejection', event => { DemoApi.error(event.reason || {}); });
