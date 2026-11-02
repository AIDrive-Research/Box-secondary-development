const sourceApis = {
  getSources: () => DemoApi.request('GET', ZQLGLOBAL.source),
  getAlgs: () => DemoApi.request('GET', ZQLGLOBAL.alg),
  getAlgJson: name => DemoApi.request('GET', `${ZQLGLOBAL.algsjson}/zh/${encodeURIComponent(name)}.json`, undefined, undefined, true),
  getAttr: stream => DemoApi.request('GET', ZQLGLOBAL.attr, undefined, {stream}),
  addSource: data => DemoApi.request('POST', ZQLGLOBAL.source, data),
  editSource: data => DemoApi.request('PUT', ZQLGLOBAL.source, data),
  delSource: data => DemoApi.request('DELETE', ZQLGLOBAL.source, {ids: data.ids || [data.id]}),
  getGrpup: alg => DemoApi.request('GET', ZQLGLOBAL.group, undefined, {alg}),
  getToken: () => DemoApi.getToken(),
  getTimestamp: () => DemoApi.request('GET', ZQLGLOBAL.getTime),
  generateSignature: DemoApi.generateSignature,
  generateRandomString: DemoApi.generateRandomString
};

// Layui表格数据管理类
class LayuiTableManager {
  constructor() {
    this.alg = {};
    this.data = [];
    this.isEditing = false;
    this.currentEditId = null;
    this.table = null;

    this.init();
  }

  async init() {
    this.initLayui();
    this.bindEvents();
    await sourceApis.getAlgs().then(res => {
      res.data.filter(alg => alg.config && Object.keys(alg.config).length).forEach(alg => {
        this.alg[alg.name] = alg
      })
    })
    this.getTableData();
  }

  // 初始化Layui
  initLayui() {
    layui.use(['table', 'layer', 'form'], () => {
      const table = layui.table;
      const layer = layui.layer;
      const form = layui.form;
      // 初始化表格
      this.table = table.render({
        elem: '#dataTable',
        data: this.data,
        cols: [[
          // { field: 'id', title: 'ID', width: 80, sort: true },
          { field: 'desc', title: '描述', width: 150 },
          { field: 'stream', title: '流地址', sort: true },
          { field: 'alg_ch_names', title: '算法', },
          { field: 'encoding', width: 100, title: '编码', },
          { title: '操作', width: 250, toolbar: '#operationBar', fixed: 'right' }
        ]],
        page: true,
        limit: 10,
        limits: [10, 20, 50],
        height: 'full-220',
        text: {
          none: '暂无数据'
        }
      });

      // 监听工具条事件
      table.on('tool(dataTable)', (obj) => {
        const data = obj.data;
        if (obj.event === 'edit') {
          this.openEditModal(data, 'edit');
        } else if (obj.event === 'del') {
          this.deleteData(data.id);
        }
      });
      form.on('switch(switchTest)', (obj) => {
        console.log(obj)
        let status;
        if (obj.elem.checked == true) {
          status = 1
        } else {
          status = -1
        }
        sourceApis.editSource({
          id: obj.value,
          status: status
        }).then(res => {
          this.showNotification('数据更新成功！');
        })
      });
    });
  }

  getTableData() {
    sourceApis.getSources().then(res => {
      this.data = res.data.filter(item => item.type == 'stream').map(item => {
        if (item.alg) {
          item.alg_ch_names = Object.keys(item.alg).map(alg_name => (this.alg[alg_name] ? this.alg[alg_name].config.display_name : (item.alg[alg_name].reserved_args || {}).display_name) || alg_name).join(',')
        } else {
          item.alg = {}
        }
        item.streamInfo = JSON.parse(JSON.stringify(item.stream || {}));
        item.stream = (item.detail || {}).stream_url || '';
        item.encoding = (item.streamInfo || {}).encoding || '';
        return item
      });
      if (this.table) {
        layui.use('table', () => {
          layui.table.reload('dataTable', {
            data: this.data
          });
        });
      }
    })
  }

  // 绑定事件
  bindEvents() {
    // 添加按钮事件
    document.getElementById('addBtn').addEventListener('click', () => {
      this.openEditModal({
        desc: '',
        stream: '',
        alg: {}
      }, 'add');
    });

    // 搜索功能
    document.getElementById('searchBtn').addEventListener('click', () => {
      this.getTableData();
    });
  }

  // 打开模态框
  openEditModal(data, type) {
    layui.use(['layer', 'form'], () => {
      const layer = layui.layer;
      const form = layui.form;

      let algEl = ``;
      for (let key in this.alg) {
        if (data.alg[key]) {
          algEl += `<input type="checkbox" name="${this.alg[key].name}" title="${this.alg[key].config.display_name}" checked> `;
        } else {
          algEl += `<input type="checkbox" name="${this.alg[key].name}" title="${this.alg[key].config.display_name}">`;
        }

      }

      layer.open({
        type: 1,
        title: type == 'add' ? '添加数据' : '编辑数据',
        area: ['80vw', '80vh'],
        content: `
                    <form class="layui-form" lay-filter="dataForm" style="padding: 20px;">
                        <input type="hidden" name="id" value="${data.id}">
                        <div class="layui-form-item">
                            <label class="layui-form-label">描述</label>
                            <div class="layui-input-block">
                                <input type="text" name="desc" value="${data.desc}" required lay-verify="required" placeholder="请输入描述" autocomplete="off" class="layui-input">
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">流地址</label>
                            <div class="layui-input-block">
                                <input type="text" name="stream" value="${data.stream}" required lay-verify="required" placeholder="请输入流地址" autocomplete="off" class="layui-input">
                            </div>
                        </div>
                        <div class="layui-form-item" >
                            <label class="layui-form-label"></label>
                            <button class="layui-btn" lay-submit lay-filter="detect">
                              接入并保存流信息
                            </button>
                            <input type="hidden" value="${data.stream}">
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">算法</label>
                            <div class="layui-input-block" id="sel-algs-container">
                                ${algEl} 
                            </div>
                            <input type="hidden" name="alg_ch_names" value="${data.alg_ch_names}">
                            <span style="color:#999">注：本demo对选择的算法仅保存默认参数，如果参数配置中有必须绘制检测区域的参数，则检测区域默认设置为整张图片的坐标；如果参数配置中有必须绘制线的参数，则线默认设置为相对于图片从左到右垂直居中的横线。</span>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">算法参数</label>
                            <button class="layui-btn layui-btn-normal" lay-submit lay-filter="getAlgParams">
                              获取算法参数
                            </button>
                        </div >
                        <div class="layui-form-item">
                            <div class="layui-input-block">
                                <button class="layui-btn" lay-submit lay-filter="saveData">保存</button>
                            </div>
                        </div>
                    </form>
                `,
        success: () => {
          form.render();
          // 检测
          form.on('submit(detect)', (formData) => {
            sourceApis.getAttr(formData.field.stream).then(res => {
              if(res.error_code == 0){
                if (type === 'edit') {
                  data.streamInfo = res.data;
                  data.stream = formData.field.stream;
                  this.showNotification('流信息已获取，点击保存提交修改');
                } else if (!data.id) {
                  this.handleAdd(formData.field, data, res.data);
                } else {
                  this.showNotification('视频源已接入，请点击保存', 'error');
                }
              } else {
                this.showNotification(res.message, 'error');
              }
            })
            return false;
          });
          form.on('submit(getAlgParams)', (formData) => {
            if (!data.streamInfo) {
              // 先检测
              this.showNotification('请先点击接入并保存流信息', 'error');
              return false;
            }
            // 算法参数含义可参考如下链接中的“3.前端配置文件”部分：https://github.com/AIDrive-Research/Custom-Algorithm/tree/main/02_CustomAlgorithm/03_PackageStructure
            let algEls = document.querySelectorAll("#sel-algs-container input");
            let draw_size = data.streamInfo.image_size.draw;
            for (let i = 0; i < algEls.length; i++) {
              if (algEls[i].checked == true && !data.alg[algEls[i].name]) {
                ((alg) => {
                  data.loadingAlgs = (data.loadingAlgs || 0) + 1;
                  sourceApis.getAlgJson(alg).then(async res => {
                    this.showNotification(`${alg}参数获取成功`);
                    // 算法配置文件中的basicParams为需要保存到后台的参数
                    data.alg[alg] = JSON.parse(JSON.stringify(res.basicParams));
                    // 算法配置文件中的renderParams为算法参数的展示、配置规则
                    if (res.renderParams.bbox) {
                      // 判断是否必须有检测区域，如离岗、区域入侵等必须绘制检测区域
                      let polygon = res.renderParams.bbox.polygons;
                      if (polygon && polygon.exits == 'must') {
                        data.alg[alg].bbox.polygons = [{
                          id: `polygon_${new Date().getTime()}`,
                          name: '',
                          polygon: [[0, 0], [draw_size[0], 0], [draw_size[0], draw_size[1]], [0, draw_size[1]]] // 以整图坐标为例
                        }]
                      }
                      // 判断是否必须有直线，如人员计数、车辆计数等必须绘制虚拟直线
                      let line = res.renderParams.bbox.lines;
                      if (line && line.exits == 'must') {
                        data.alg[alg].bbox.lines = [{
                          id: `line_${new Date().getTime()}`,
                          name: '',
                          line: [[0, draw_size[1] / 2], [draw_size[0], draw_size[1] / 2]],
                          direction: 'd+', // d+表示从上到下，
                          action: { count: "统计" }
                        }]
                      }
                    }

                    // 如果算法类型为match_开头，说明需要配置底库分组
                    if ((data.alg[alg].alg_type || '').indexOf('match_') >= 0) {
                      let lib_type = data.alg[alg].alg_type.replace('match_', '');
                      // 获取对应算法的底库组
                      await sourceApis.getGrpup(lib_type).then(res => {
                        if (res.data.length > 0) {
                          let groupId = res.data[0].id;
                          data.alg[alg].reserved_args.group_id = groupId;
                        } else {
                          this.showNotification(`没有查询到${lib_type}的底库分组，请先添加分组`, 'error');
                        }
                      })
                    }
                  }).finally(() => { data.loadingAlgs--; });
                })(algEls[i].name);
              }
            }
            return false;
          });
          // 监听表单提交
          form.on('submit(saveData)', (formData) => {
            let alg = data.alg;
            let algEls = document.querySelectorAll("#sel-algs-container input");
            for (let i = 0; i < algEls.length; i++) {
              // checked == false，未勾选的算法
              if (algEls[i].checked == false && data.alg[algEls[i].name]) {
                delete alg[algEls[i].name]; // 删除多余算法参数
              }
            }
            this.handleEdit(formData.field, data);
            return false;
          });
        }
      });
    });
  }
  handleAdd(formData, data, streamInfo) {
    if (!this.validateData(formData)) {
      return;
    }
    let params = {
      id: streamInfo.stream,
      type: 'stream', // 仅以视频流为例
      desc: formData.desc,
      stream: streamInfo,
      alg: data.alg,
      video_record: 0,
      detail: {
        username: '',
        password: '',
        stream_url: streamInfo.origin_url
      }
    }
    sourceApis.addSource(params).then(res => {
      data.id = streamInfo.stream;
      data.streamInfo = streamInfo;
      data.stream = formData.stream;
      this.getTableData();
      this.showNotification('数据添加成功！');
      // 关闭模态框
      // layui.use('layer', () => {
      //   layui.layer.closeAll();
      // });
    })
  }
  handleEdit(formData, data) {
    if (data.loadingAlgs) {
      this.showNotification('算法参数仍在加载，请稍后保存', 'error');
      return;
    }
    if (data.stream && data.stream !== formData.stream) {
      this.showNotification('流地址已更改，请先接入并保存流信息', 'error');
      return;
    }
    if (!data.id || !data.streamInfo) {
      this.showNotification('请先接入并保存流信息', 'error');
      return;
    }
    const missing = Array.from(document.querySelectorAll('#sel-algs-container input'))
      .some(el => el.checked && !data.alg[el.name]);
    if (missing) {
      this.showNotification('请先获取并等待算法参数加载完成', 'error');
      return;
    }
    let params = {
      id: data.id, desc: formData.desc, alg: data.alg,
      stream: data.streamInfo,
      detail: Object.assign({}, data.detail || {}, {stream_url: formData.stream})
    }
    sourceApis.editSource(params).then(res => {
      this.getTableData();
      this.showNotification('数据更新成功！');
      // 关闭模态框
      layui.use('layer', () => {
        layui.layer.closeAll();
      });
    })
  }

  // 验证数据
  validateData(data) {
    if (!data.desc || data.desc.length < 2) {
      this.showNotification('描述至少需要两个字符', 'error');
      return false;
    }
    return true;
  }

  // 删除数据
  deleteData(id) {
    layui.use('layer', () => {
      layui.layer.confirm('确定要删除这条数据吗？', {
        icon: 3,
        title: '提示'
      }, (index) => {
        sourceApis.delSource({ id: id }).then(res => {
          this.getTableData();
          this.showNotification('数据删除成功！');
          layui.layer.close(index);
        })
      });
    });
  }

  // 显示通知
  showNotification(message, type = 'success') {
    layui.use('layer', () => {
      layui.layer.msg(message, {
        icon: type === 'success' ? 1 : 2,
        time: 2000
      });
    });
  }
}

// 等待Layui加载完成后初始化
layui.use(['table', 'layer', 'form'], () => {
  sourceApis.getToken().then(res => {
    if (res.error_code == 0) {
      ZQLGLOBAL.token = res.data;
      window.tableManager = new LayuiTableManager();
    }
  })
  // 初始化表格管理器

});

