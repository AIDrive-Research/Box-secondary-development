const faceLibApis = {
  getFaceList: params => DemoApi.request('GET', ZQLGLOBAL.face, undefined, params),
  addFace: data => DemoApi.request('POST', ZQLGLOBAL.face, data),
  editFace: data => DemoApi.request('PUT', ZQLGLOBAL.face, data),
  delFace: data => DemoApi.request('DELETE', ZQLGLOBAL.face, data),
  addImage: data => DemoApi.request('PUT', ZQLGLOBAL.image, data),
  getGrpup: () => DemoApi.request('GET', ZQLGLOBAL.group, undefined, {alg: 'face'}),
  addGroup: data => DemoApi.request('POST', ZQLGLOBAL.group, data),
  editGroup: data => DemoApi.request('PUT', ZQLGLOBAL.group, data),
  delGroup: data => DemoApi.request('DELETE', ZQLGLOBAL.group, data),
  getToken: () => DemoApi.getToken(),
  getTimestamp: () => DemoApi.request('GET', ZQLGLOBAL.getTime),
  generateSignature: DemoApi.generateSignature,
  generateRandomString: DemoApi.generateRandomString
};


class FaceLibManager {
  constructor() {
    this.page = 1;
    this.size = 10;
    this.group_id = '';
    this.groupData = [];
    this.data = [];
    this.isEditing = false;
    this.currentEditId = null;
    this.table = null;

    this.init();
  }

  async init() {
    this.initLayui();
    this.bindEvents();
    await this.getGroupData();
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
          { field: 'external_id', title: '外部ID', width: 150 },
          { field: 'name', title: '姓名', width: 150 },
          { field: 'image', title: '人脸图片', width: 150, templet: '#image' },
          { field: 'age', width: 100, title: '年龄', },
          { field: 'desc', title: '简介' },
          { field: 'update_time', width: 100, title: '更新时间', },
          { title: '操作', width: 200, toolbar: '#operationBar', fixed: 'right' }
        ]],
        page: false,
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
          this.editFaceModal(data, 'edit');
        } else if (obj.event === 'del') {
          this.deleteData(data.id);
        }
      });
    });
  }

  getGroupData() {
    return faceLibApis.getGrpup().then(res => {
        this.groupData = res.data.map(item => {
          item.quality = (item.ext || {}).quality;
          item.confidence = (item.ext || {}).confidence;
          return item
        });
        if (!this.groupData.some(item => item.id === this.group_id)) {
          this.group_id = this.groupData.length ? this.groupData[0].id : '';
        }
        this.page = 1;
        let el = document.querySelector("#group-container");
        let innerHTML = ''
        for (let i = 0; i < this.groupData.length; i++) {
          if (this.groupData[i].id === this.group_id) {
            innerHTML += `<li class="group active" id="${this.groupData[i].id}">
            ${this.groupData[i].name}
              <i class="layui-icon  layui-icon-edit" editId="${this.groupData[i].id}"></i>
              <i class="layui-icon  layui-icon-delete" delId="${this.groupData[i].id}"></i>
            </li>`;
          } else {
            innerHTML += `<li class="group" id="${this.groupData[i].id}">
            ${this.groupData[i].name}
              <i class="layui-icon  layui-icon-edit" editId="${this.groupData[i].id}"></i>
              <i class="layui-icon  layui-icon-delete" delId="${this.groupData[i].id}"></i>
            </li>`;
          }
        }
        el.innerHTML = innerHTML;

        el.querySelectorAll('li.group').forEach(item => item.addEventListener('click', event => {
          if (event.target.closest('i')) return;
          this.group_id = item.id;
          this.page = 1;
          el.querySelectorAll('li.group').forEach(li => li.classList.toggle('active', li === item));
          this.getTableData();
        }));
        let editBtns = document.querySelectorAll("#group-container .layui-icon-edit");
        editBtns.forEach(editBtn => {
          editBtn.addEventListener('click', (e) => {
            let group_id = e.target.getAttribute("editId");
            this.editGroupModal(this.groupData.find(item => item.id == group_id), "edit")
          })
        })

        let delBtns = document.querySelectorAll("#group-container .layui-icon-delete");
        delBtns.forEach(delBtn => {
          delBtn.addEventListener('click', (e) => {
            let group_id = e.target.getAttribute("delId");
            faceLibApis.delGroup({ ids: [group_id] }).then(res => {
              this.getGroupData();
              this.showNotification('数据更新成功！');
            })
          })
        })
        return this.getTableData();
    });
  }
  getTableData() {
    const groupId = this.group_id;
    const requestId = this.listRequestId = (this.listRequestId || 0) + 1;
    const request = groupId ? faceLibApis.getFaceList({page: this.page, size: this.size, group_id: groupId})
      : Promise.resolve({data: {data: [], total: 0}});
    return request.then(res => {
      if (requestId !== this.listRequestId) return;
      const total = res.data.total;
      const lastPage = Math.max(1, Math.ceil(total / this.size));
      if (this.page > lastPage) { this.page = lastPage; return this.getTableData(); }
      this.data = res.data.data.map(item => Object.assign({}, item, {
        image: item.image ? DemoApi.url('/staticdata' + item.image) : ''
      }));
      if (this.table) layui.table.reload('dataTable', {data: this.data});
      layui.use('laypage', () => {
        let pager = document.getElementById('face-pagination');
        if (!pager) {
          pager = document.createElement('div');
          pager.id = 'face-pagination';
          document.getElementById('dataTable').parentElement.appendChild(pager);
        }
        layui.laypage.render({
          elem: 'face-pagination', count: total, curr: this.page, limit: this.size,
          limits: [10, 20, 50], layout: ['count', 'prev', 'page', 'next', 'limit'],
          jump: (obj, first) => {
            if (first) return;
            this.page = obj.curr;
            this.size = obj.limit;
            this.getTableData();
          }
        });
      });
    });
  }

  // 绑定事件
  bindEvents() {
    // 添加按钮事件
    document.getElementById('addGroup').addEventListener('click', () => {
      this.editGroupModal({
        name: '',
        quality: 0.35,
        confidence: 0.5,
      }, 'add');
    });

    document.getElementById('addBtn').addEventListener('click', () => {
      this.editFaceModal({
        name: '',
        age: '',
        sex: '',
        desc: '',
        external_id: '',
        feature: '',
      }, 'add');
    });

    // 搜索功能
    document.getElementById('searchBtn').addEventListener('click', () => {
      this.getTableData();
    });
  }

  // 编辑分组
  editGroupModal(data, type) {
    layui.use(['layer', 'form'], () => {
      const layer = layui.layer;
      const form = layui.form;

      layer.open({
        type: 1,
        title: type == 'add' ? '添加分组' : '编辑分组',
        area: ['40vw', '40vh'],
        content: `
                    <form class="layui-form" lay-filter="dataForm" style="padding: 20px;">
                        <input type="hidden" name="id" value="${data.id}">
                        <div class="layui-form-item">
                            <label class="layui-form-label">分组名称</label>
                            <div class="layui-input-block">
                                <input type="text" name="name" value="${data.name}" required lay-verify="required" placeholder="请输入描述" autocomplete="off" class="layui-input">
                            </div>
                        </div>

                        <div class="layui-form-item">
                            <label class="layui-form-label">人脸质量</label>
                            <div class="layui-input-block">
                                <input type="text" name="quality" value="${data.quality}" required lay-verify="required" placeholder="请输入人脸质量" autocomplete="off" class="layui-input">
                            </div>
                        </div>

                        <div class="layui-form-item">
                            <label class="layui-form-label">人脸检测置信度</label>
                            <div class="layui-input-block">
                                <input type="text" name="confidence" value="${data.confidence}" required lay-verify="required" placeholder="请输入人脸检测置信度" autocomplete="off" class="layui-input">
                            </div>
                        </div>
                        
                        <div class="layui-form-item">
                            <div class="layui-input-block">
                                <button class="layui-btn" lay-submit lay-filter="saveData">保存</button>
                            </div>
                        </div>
                    </form>
                `,
        success: () => {
          form.render();
          // 监听表单提交
          form.on('submit(saveData)', (formData) => {
            if (type == 'add') {
              faceLibApis.addGroup({
                alg: 'face',
                ext: { quality: Number(formData.field.quality), confidence: Number(formData.field.confidence) },
                name: formData.field.name
              }).then(res => {
                this.getGroupData();

                // 关闭模态框
                layui.use('layer', () => {
                  layui.layer.closeAll();
                });
                this.showNotification('数据更新成功！');
              })
            } else {
              faceLibApis.editGroup({
                id: data.id,
                alg: 'face',
                ext: { quality: Number(formData.field.quality), confidence: Number(formData.field.confidence) },
                name: formData.field.name
              }).then(res => {
                this.getGroupData();
                // 关闭模态框
                layui.use('layer', () => {
                  layui.layer.closeAll();
                });
                this.showNotification('数据更新成功！');
              })
            }
            return false;
          });
        }
      });
    });
  }

  // 打开模态框
  editFaceModal(data, type) {
    layui.use(['layer', 'form'], () => {
      const layer = layui.layer;
      const form = layui.form;

      layer.open({
        type: 1,
        title: type == 'add' ? '添加数据' : '编辑数据',
        area: ['80vw', '80vh'],
        content: `
                    <form class="layui-form" lay-filter="dataForm" style="padding: 20px;">
                        <input type="hidden" name="id" value="${data.id}">
                        <div class="layui-form-item">
                            <label class="layui-form-label">图片</label>
                            <div class="layui-input-block">
                                <input type="file" id="faceImage" placeholder="选择人脸" style="cursor: pointer;">
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">姓名</label>
                            <div class="layui-input-block">
                                <input type="text" name="name" value="${data.name}" required lay-verify="required" placeholder="请输入姓名" autocomplete="off" class="layui-input">
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">外部ID</label>
                            <div class="layui-input-block">
                                <input type="text" name="external_id" value="${data.external_id}" autocomplete="off" class="layui-input">
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">性别</label>
                            <div class="layui-input-block">
                                <input type="text" name="sex" value="${data.sex}"  placeholder="请输入性别" autocomplete="off" class="layui-input">
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">年龄</label>
                            <div class="layui-input-block">
                                <input type="number" name="age" value="${data.age}"  placeholder="请输入年龄" autocomplete="off" class="layui-input">
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">简介</label>
                            <div class="layui-input-block">
                                <input type="text" name="desc" value="${data.desc}"  placeholder="请输入简介" autocomplete="off" class="layui-input">
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <div class="layui-input-block">
                                <button class="layui-btn" lay-submit lay-filter="saveData">保存</button>
                            </div>
                        </div>
                    </form>
                `,
        success: () => {
          form.render();
          document.getElementById('faceImage').addEventListener('change', (event) => {
            const files = event.target.files;
            data.file = files[0]
          });

          // 监听表单提交
          form.on('submit(saveData)', (formData) => {
            console.log(formData)
            this.handleFormSubmit(formData.field, data);
            return false;
          });
        }
      });
    });
  }

  // 提交:添加/编辑
  handleFormSubmit(formData, data) {
    if (!this.group_id) {
      this.showNotification('请先添加并选择人脸分组', 'error');
      return;
    }
    // 验证数据
    if (!this.validateData(formData)) {
      return;
    }
    let params = {
      group_id: this.group_id,
      name: formData.name,
      age: formData.age === '' ? null : Number(formData.age),
      sex: formData.sex,
      desc: formData.desc,
      external_id: formData.external_id
    }

    if (!data.id) {
      faceLibApis.addFace(params).then(res => {
        if (data.file) {
          let formdata = new FormData();
          formdata.append('id', res.data);
          formdata.append('image', data.file)
          faceLibApis.addImage(formdata).then(res => {
            this.facecb('add')
          })
        } else {
          this.facecb('add')
        }

      })
    } else {
      params.id = data.id;
      faceLibApis.editFace(params).then(res => {
        if (data.file) {
          let formdata = new FormData();
          formdata.append('id', params.id);
          formdata.append('image', data.file)
          faceLibApis.addImage(formdata).then(res => {
            this.facecb('edit')
          })
        } else {
          this.facecb('edit')
        }
      })
    }


  }

  facecb(type) {
    // 关闭模态框
    layui.use('layer', () => {
      layui.layer.closeAll();
    });
    this.showNotification(type == 'add' ? '数据添加成功！' : '数据更新成功！');
    setTimeout(() => {
      this.getTableData();
    }, 1500)
  }

  // 验证数据
  validateData(data) {
    if (!data.name) {
      this.showNotification('请输入姓名', 'error');
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
      }, () => {
        faceLibApis.delFace({ ids: [id] }).then(res => {
          this.getTableData();
          this.showNotification('数据删除成功！');
          layui.layer.close();
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
  faceLibApis.getToken().then(res => {
    if (res.error_code == 0) {
      ZQLGLOBAL.token = res.data;
      // 初始化人脸列表
      window.faceLibManager = new FaceLibManager();
    }
  })

});

