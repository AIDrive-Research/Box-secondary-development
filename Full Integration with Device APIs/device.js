const deviceApis = {
  getDeviceInfo: () => DemoApi.request('GET', ZQLGLOBAL.device),
  editDeviceInfo: data => DemoApi.request('PUT', ZQLGLOBAL.device,
    {device_name: data.device_name, device_desc: data.device_desc}),
  getToken: () => DemoApi.getToken(),
  getTimestamp: () => DemoApi.request('GET', ZQLGLOBAL.getTime),
  generateSignature: DemoApi.generateSignature,
  generateRandomString: DemoApi.generateRandomString
};

class deviceInfo {
  constructor() {
    this.info = {};

    this.init();
  }
  init() {
    deviceApis.getDeviceInfo().then(res => {
      console.log(res)
      this.info = res.data;
      this.initForm()
    })
  }
  initForm() {
    layui.use(() => {
      var form = layui.form;
      form.val('deviceForm', this.info);
      form.on('submit(saveData)', (formData) => {
        layui.layer.confirm('保存设备信息后设备将自动重启，是否继续？', {icon: 3}, index => {
          layui.layer.close(index);
          deviceApis.editDeviceInfo(formData.field).then(() => {
            this.info = Object.assign({}, this.info, formData.field);
            layui.layer.msg('保存成功，设备正在重启');
          });
        });
        return false;
      });
    })
  }
}

// 等待Layui加载完成后初始化
layui.use(['layer', 'form'], () => {
  deviceApis.getToken().then(res => {
    if (res.error_code == 0) {
      ZQLGLOBAL.token = res.data;
      // 初始化表格管理器
      window.deviceInfo = new deviceInfo();
    }
  })

});

