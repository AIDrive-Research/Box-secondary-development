// 接口、MQTT 和 WebRTC 统一通过设备 9092 端口访问，AK/SK 签名鉴权保持不变。
const ZQL_origin = () => {
  const url = new URL(ZQLGLOBAL.baseUrl || `http://${ZQLGLOBAL.serverIp}`);
  url.port = '9092';
  return url.origin;
};
const ZQL_escape = value => String(value == null ? '' : value).replace(/[&<>"']/g,
  ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const ZQL_apiUrl = path => new URL(path.replace(/^:\d+/, ''), ZQL_origin()).href;


const ZQL_multivideo = {
  setVideoEl: () => {
    let videoContainer = document.querySelector("#video-container");
    if (ZQL_playingSource.videoNum == 1) {
      videoContainer.className = "one-video";
      videoContainer.innerHTML = `
          <div class="video-box">
            <div class="tips" id="tip0">
              <div class="icon-dot"></div>
              <div class="deviceoffline">
                <i class="z-icon-jiankonglixian" style="font-size: 40rem"></i>
                <span>离线</span>
              </div>
            </div>
            <div class="title-container" id="video-title0"></div>
            <video ref="video" muted id="video0" class="video-js" autoplay="autoplay" preload="auto"></video>
            <canvas class="canvas-shuju" id="canvas0"></canvas>
          </div>
        `
    } else {
      videoContainer.className = "four-video";
      videoContainer.innerHTML = `
          <div  class="video-box">
            <div class="tips" id="tip0">
              
            </div>
            <div class="title-container" id="video-title0"></div>
            <video ref="video" muted id="video0" class="video-js" autoplay="autoplay" preload="auto"></video>
            <canvas class="canvas-shuju" id="canvas0"></canvas>
          </div>
          <div  class="video-box">
            <div class="tips" id="tip1">
              
            </div>
            <div class="title-container" id="video-title1"></div>
            <video ref="video" muted id="video1" class="video-js" autoplay="autoplay" preload="auto"></video>
            <canvas class="canvas-shuju" id="canvas1"></canvas>
          </div>
          <div  class="video-box">
            <div class="tips" id="tip2">
              
            </div>
            <div class="title-container" id="video-title2"></div>
            <video ref="video" muted id="video2" class="video-js" autoplay="autoplay" preload="auto"></video>
            <canvas class="canvas-shuju" id="canvas2"></canvas>
          </div>
          <div class="video-box">
            <div class="tips" id="tip3">
              
            </div>
            <div class="title-container" id="video-title3"></div>
            <video ref="video" muted id="video3" class="video-js" autoplay="autoplay" preload="auto"></video>
            <canvas class="canvas-shuju" id="canvas3"></canvas>
          </div>
        `
    }
  },
  liveLoading: (index) => {
    let tipel = document.querySelector("#tip" + index);
    tipel.innerHTML = `<div class="icon-dot"></div>`
  },
  liveOffline: (index) => {
    let tipel = document.querySelector("#tip" + index);
    tipel.innerHTML = `
      <div class="deviceoffline">
        <i class="z-icon-jiankonglixian" style="font-size: 40rem"></i>
        <span>离线</span>
      </div>
    `
  },
  liveStopLoading: (index) => {
    let tipel = document.querySelector("#tip" + index);
    if (tipel) {
      tipel.innerHTML = ``
    }
  },
  setAlgList(index) {
    const source = ZQL_sources[ZQL_playingSource[index]];
    const info = ZQL_videosInfos[index];
    const el = document.querySelector(`#video-title${index}`);
    const algorithms = Object.keys(source.alg || {});
    if (!info.alg || !source.alg[info.alg]) info.alg = algorithms[0] || null;
    const name = alg => (source.alg[alg].reserved_args || {}).display_name || alg;
    el.innerHTML = `<div class="camera">${ZQL_escape(source.desc)}</div>
      <div class="alg"><div class="algname">算法: ${ZQL_escape(info.alg ? name(info.alg) : '无')}</div>
      <ul>${algorithms.map(alg => `<li alg="${ZQL_escape(alg)}">${ZQL_escape(name(alg))}</li>`).join('')}</ul></div>
      <div id="close${index}">关闭</div>`;
    el.querySelectorAll('li').forEach(item => item.addEventListener('click', () => {
      info.alg = item.getAttribute('alg');
      ZQL_multivideo.clearCanvas(index);
      el.querySelector('.algname').textContent = '算法: ' + name(info.alg);
    }));
    document.querySelector(`#close${index}`).addEventListener('click', () => {
      source.checked = false;
      ZQL_playingSource[index] = null;
      ZQL_multivideo.destroyVideoByIndex(index);
      ZQL_multivideo.clearAlgList(index);
      ZQL_multivideo.liveStopLoading(index);
    });
  },
  clearAlgList(index) {
    let el = document.querySelector(`#video-title${index}`);
    if (el) {
      el.innerHTML = ""
    }

  },
  handleRefresh(index) {
    if (!ZQL_videosInfos[index]) {
      return;
    }
    if (ZQL_videosInfos[index].status == "离线") {
      ZQL_multivideo.destroyVideoByIndex(index);
      ZQL_multivideo.subscribeLive(ZQL_playingSource[index], index);
    } else {
      if (!ZQL_videosInfos[index].stream) {
        return;
      }
      let video = document.getElementById("video" + index);
      video && (video.srcObject = null);
      if (ZQL_videosInfos[index] && ZQL_videosInfos[index].replayTimer) {
        clearTimeout(ZQL_videosInfos[index].replayTimer);
        ZQL_videosInfos[index].replayTimer = null;
      }
      const player = ZQL_videosInfos[index].srsrtc;
      ZQL_videosInfos[index].srsrtc = null;
      if (player) player.close();
      ZQL_videosInfos[index].status = "";
      ZQL_multivideo.playVideo(ZQL_playingSource[index], index);
    }
  },
  subscribeLive(cameraId, index) {
    ZQL_multivideo.getCameraSize(cameraId, index);
    const info = ZQL_videosInfos[index];
    if (!info) return;
    ZQL_multivideo.liveLoading(index);
    return ZQL_apis.subscribeLive(cameraId).then(data => {
      if (ZQL_videosInfos[index] !== info || ZQL_playingSource[index] !== cameraId) return;
      if (!data || data.error_code !== 0 || typeof data.data !== 'string' || !data.data) {
        throw new Error((data || {}).message || '订阅失败');
      }
      info.stream = data.data;
      info.status = '';
      ZQL_multivideo.playVideo(cameraId, index);
    }).catch(() => {
      if (ZQL_videosInfos[index] !== info || ZQL_playingSource[index] !== cameraId) return;
      info.status = '离线';
      ZQL_multivideo.liveOffline(index);
      ZQL_multivideo.reSubcribe(cameraId, index);
    });
  },
  playVideo(cameraId, index) {
    const info = ZQL_videosInfos[index];
    if (!info || info.srsrtc || ZQL_playingSource[index] !== cameraId) return;
    const video = document.getElementById('video' + index);
    const streamUrl = new URL(info.stream, ZQL_origin());
    // 内部流媒体地址统一转到设备的 Nginx WebRTC 代理，保留查询参数。
    const data_stream = new URL(streamUrl.pathname + streamUrl.search, ZQL_origin()).href;
    info.loading = true;
    const player = new ZLMRTCClient.Endpoint({
      element: video, debug: false, zlmsdpUrl: data_stream,
      simulcast: false, useCamera: true, audioEnable: true, videoEnable: true,
      recvOnly: true, resolution: { w: 1280, h: 720 },
      usedatachannel: false, videoId: '', audioId: ''
    });
    info.srsrtc = player;
    const current = () => ZQL_videosInfos[index] === info &&
      ZQL_playingSource[index] === cameraId && info.srsrtc === player;
    const retry = () => {
      if (!current()) return;
      info.srsrtc = null;
      player.close();
      info.status = '离线';
      ZQL_multivideo.liveOffline(index);
      ZQL_multivideo.reSubcribe(cameraId, index);
    };
    video.onplaying = () => {
      if (!current()) return;
      info.loading = false;
      info.status = '';
      info.playerState = 'success';
      ZQL_multivideo.liveStopLoading(index);
    };
    player.on(ZLMRTCClient.Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, retry);
    player.on(ZLMRTCClient.Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, state => {
      if (state === 'failed' || state === 'disconnected') retry();
    });
  },
  reSubcribe(cameraId, index) {
    const info = ZQL_videosInfos[index];
    if (!info) return;
    clearTimeout(info.subscribeTimeout);
    info.subscribeTimeout = setTimeout(() => {
      if (ZQL_videosInfos[index] === info && ZQL_playingSource[index] === cameraId) {
        ZQL_multivideo.subscribeLive(cameraId, index);
      }
    }, 3000);
  },
  getCameraSize(id, index) {
    const stream = ZQL_sources[id].stream || {};
    const size = (stream.image_size || {}).draw || [1280, 720];
    ZQL_multivideo.setOrisize(size[0] || 1280, size[1] || 720, index, id);
  },
  setOrisize(width, height, index, id) {
    let container = document.getElementById("video" + index).parentElement;
    if (!container) {
      return;
    }
    if (!ZQL_videosInfos[index]) {
      let alg = null;
      if (sessionStorage.getItem("curalgs")) {
        let cameraId = ZQL_playingSource[index];
        let curalgs = JSON.parse(sessionStorage.getItem("curalgs"));
        alg = curalgs[cameraId]
          ? JSON.parse(JSON.stringify(curalgs[cameraId]))
          : null;
      }
      ZQL_videosInfos[index] = {
        id: id,
        loading: true,
        openWs: true,
        alg: alg,
        algListShow: false,
        subscribeTimeout: null,
        refreshTimeInterval: null, // 定时刷新定时器
        refreshTime: null, // 定时刷新时间
        replayTimer: null,
        playerState: "pending",
        detectInterval: null,
        quanping: false,
        srsrtc: null,
        stream: "",
        status: "",
        stream_code: "",
      };
    }
    if (ZQL_videosInfos[index]) {
      let oriWidth = width;
      let oriHeight = height;
      ZQL_videosInfos[index].oriWidth = oriWidth;
      ZQL_videosInfos[index].oriHeight = oriHeight;

      if (
        oriWidth / container.offsetWidth >
        oriHeight / container.offsetHeight
      ) {
        ZQL_videosInfos[index].actualHeight = container.offsetWidth / (oriWidth / oriHeight)
        ZQL_videosInfos[index].actualWidth = container.offsetWidth;
      } else {
        ZQL_videosInfos[index].actualHeight = container.offsetHeight
        ZQL_videosInfos[index].actualWidth = container.offsetHeight * (oriWidth / oriHeight)
      }
      // videoWidth = ZQL_videosInfos[index].actualWidth;
      ZQL_multivideo.setPosition(index);
    }
  },
  setPosition(index) {
    let container = document.getElementById("video" + index).parentElement;
    let video = document.querySelector("#video" + index);
    let canvas = document.getElementById("canvas" + index);
    let width = ZQL_videosInfos[index].actualWidth, height = ZQL_videosInfos[index].actualHeight;
    video.style.position = "absolute";
    video.style.width = width + "px";
    video.style.height = height + "px";
    canvas.width = width;
    canvas.height = height;
    if (width / container.offsetWidth < height / container.offsetHeight) {
      let left = (container.offsetWidth - width) / 2;
      video.style.left = Math.floor(left) + "px";
      video.style.top = 0 + "px";
      canvas.style.left = Math.floor(left) + "px";
      canvas.style.top = "0px";
    } else {
      let top = (container.offsetHeight - height) / 2;
      video.style.top = Math.floor(top) + "px";
      video.style.left = 0 + "px";
      canvas.style.top = Math.floor(top) + "px";
      canvas.style.left = "0px";
    }
  },
  setAlarms: (data, index) => {
    ZQL_multivideo.clearCanvas(index);
    if (ZQL_videosInfos[index] && !ZQL_videosInfos[index].canvas) {
      ZQL_videosInfos[index].canvas = document.getElementById("canvas" + index)
    }
    if (
      !ZQL_videosInfos[index] ||
      !ZQL_videosInfos[index].actualWidth ||
      !ZQL_videosInfos[index].actualHeight ||
      !ZQL_videosInfos[index].oriWidth ||
      !ZQL_videosInfos[index].oriHeight
    ) {
      return;
    }
    // let bbox = data.result.data.bbox;
    let bbox = data && data.bbox;
    if (!bbox) return;
    bbox = Object.assign({ polygons: {}, rectangles: [], lines: {} }, bbox);
    if (Object.values(bbox.polygons).length > 0) {
      Object.values(bbox.polygons).forEach((item) => {
        let color = JSON.parse(JSON.stringify(item.color)).reverse();
        // let color = item.color;
        let points = item.polygon.map((point) => {
          return [
            Math.round(
              (point[0] * ZQL_videosInfos[index].actualWidth) /
              ZQL_videosInfos[index].oriWidth
            ),
            Math.round(
              (point[1] * ZQL_videosInfos[index].actualHeight) /
              ZQL_videosInfos[index].oriHeight
            ),
          ];
        });
        let context = ZQL_videosInfos[index].canvas.getContext("2d");
        context.font = "20px Arial bolder";
        context.fillStyle = "transparent";
        context.strokeStyle = "rgb(" + color.join(",") + ")";
        context.lineWidth = 2;
        ZQL_multivideo.drawPolygons(points, context);
        ZQL_multivideo.drawPolygonInfo(context, Object.values(bbox.polygons), index);
      });
    }

    if (bbox.rectangles.length > 0) {
      bbox.rectangles.forEach((item, i) => {
        let color = JSON.parse(JSON.stringify(item.color)).reverse();
        let coordinates = {
          x: Math.round(
            (item.xyxy[0] * ZQL_videosInfos[index].actualWidth) /
            ZQL_videosInfos[index].oriWidth
          ),
          y: Math.round(
            (item.xyxy[1] * ZQL_videosInfos[index].actualHeight) /
            ZQL_videosInfos[index].oriHeight
          ),
          x1: Math.round(
            (item.xyxy[2] * ZQL_videosInfos[index].actualWidth) /
            ZQL_videosInfos[index].oriWidth
          ),
          y1: Math.round(
            (item.xyxy[3] * ZQL_videosInfos[index].actualHeight) /
            ZQL_videosInfos[index].oriHeight
          ),
        };
        let context = ZQL_videosInfos[index].canvas.getContext("2d");
        context.font = "20px Arial bolder";
        context.fillStyle = "rgb(" + color.join(",") + ")";
        context.fillText(item.label || "", coordinates.x, coordinates.y - 10);
        context.strokeStyle = "rgb(" + color.join(",") + ")";
        context.lineWidth = 2;
        // context.strokeRect(
        //   coordinates.x,
        //   coordinates.y,
        //   coordinates.x1 - coordinates.x,
        //   coordinates.y1 - coordinates.y
        // );
        let lines = [];
        let lineWidth = (coordinates.x1 - coordinates.x) / 4;
        let lineHeight = (coordinates.y1 - coordinates.y) / 4;
        lines[0] = {
          x: coordinates.x,
          y: coordinates.y,
          x1: coordinates.x + lineWidth,
          y1: coordinates.y,
        };
        lines[1] = {
          x: coordinates.x,
          y: coordinates.y,
          x1: coordinates.x,
          y1: coordinates.y + lineHeight,
        };
        lines[2] = {
          x: coordinates.x1,
          y: coordinates.y,
          x1: coordinates.x1 - lineWidth,
          y1: coordinates.y,
        };
        lines[3] = {
          x: coordinates.x1,
          y: coordinates.y,
          x1: coordinates.x1,
          y1: coordinates.y + lineHeight,
        };
        lines[4] = {
          x: coordinates.x,
          y: coordinates.y1,
          x1: coordinates.x + lineWidth,
          y1: coordinates.y1,
        };
        lines[5] = {
          x: coordinates.x,
          y: coordinates.y1,
          x1: coordinates.x,
          y1: coordinates.y1 - lineHeight,
        };
        lines[6] = {
          x: coordinates.x1,
          y: coordinates.y1,
          x1: coordinates.x1 - lineWidth,
          y1: coordinates.y1,
        };
        lines[7] = {
          x: coordinates.x1,
          y: coordinates.y1,
          x1: coordinates.x1,
          y1: coordinates.y1 - lineHeight,
        };
        lines.forEach((item) => {
          ZQL_multivideo.drawLine(context, item);
        });
      });
    }

    if (Object.values(bbox.lines).length > 0) {
      Object.values(bbox.lines).forEach((item, i) => {
        let color = JSON.parse(JSON.stringify(item.color)).reverse();
        let coordinates = {
          x: Math.round(
            (item.line[0][0] * ZQL_videosInfos[index].actualWidth) /
            ZQL_videosInfos[index].oriWidth
          ),
          y: Math.round(
            (item.line[0][1] * ZQL_videosInfos[index].actualHeight) /
            ZQL_videosInfos[index].oriHeight
          ),
          x1: Math.round(
            (item.line[1][0] * ZQL_videosInfos[index].actualWidth) /
            ZQL_videosInfos[index].oriWidth
          ),
          y1: Math.round(
            (item.line[1][1] * ZQL_videosInfos[index].actualHeight) /
            ZQL_videosInfos[index].oriHeight
          ),
        };
        let context = ZQL_videosInfos[index].canvas.getContext("2d");
        context.font = "20px Arial bolder";
        context.fillStyle = "rgb(" + color.join(",") + ")";
        if (item.ext.direction) {
          context.fillText(item.name, (coordinates.x + coordinates.x1) / 2, (coordinates.y + coordinates.y1) / 2 + 20);
        }

        context.strokeStyle = "rgb(" + color.join(",") + ")";
        context.lineWidth = 2;
        ZQL_multivideo.drawLine(context, coordinates);
        ZQL_multivideo.drawCountingInfo(context, Object.values(bbox.lines));
      });
    }
  },
  drawPolygons(points, context) {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);

    for (var i = 1; i < points.length; i++) {
      context.lineTo(points[i][0], points[i][1]);
    }
    context.closePath();
    context.fill();
    context.stroke();
  },
  drawLine(ctx, line) {
    ctx.beginPath();
    ctx.moveTo(line.x, line.y);
    ctx.lineTo(line.x1, line.y1);
    ctx.stroke();
  },
  drawCountingInfo(context, lines) {
    lines.forEach((item, index) => {
      context.fillStyle = "rgb(255,0,0)";
      if (!item.ext || !item.ext.direction || !item.ext.action || !item.ext.result) return;
      if (item.ext.direction.length == 2) {
        context.fillText(`[${item.name}] ${item.ext.action.count}: ${item.ext.result.count}`, 0, 20 * index + 20);
      } else {
        context.fillText(`[${item.name}] ${item.ext.action.increase}: ${item.ext.result.increase},${item.ext.action.decrease}: ${item.ext.result.decrease},${item.ext.action.delta}: ${item.ext.result.delta}`, 0, 20 * index + 20);
      }
    });
  },
  drawPolygonInfo(context, polygons, videoindex) {
    polygons.forEach((item, index) => {
      context.fillStyle =
        "rgb(" +
        JSON.parse(JSON.stringify(item.color)).reverse().join(",") +
        ")";
      let leftPoint = item.polygon[0];
      for (let i = 1; i < item.polygon.length; i++) {
        if (item.polygon[i][0] < leftPoint[0]) {
          leftPoint = item.polygon[i];
        }
      }
      context.fillText(
        `${item.name}`,
        (leftPoint[0] * ZQL_videosInfos[videoindex].actualWidth) /
        ZQL_videosInfos[videoindex].oriWidth,
        (leftPoint[1] * ZQL_videosInfos[videoindex].actualHeight) /
        ZQL_videosInfos[videoindex].oriHeight + 20
      );
      if (item.ext && item.ext.result) {
        context.fillStyle = "rgb(255,0,0)";
        context.fillText(`${item.name}: ${item.ext.result}`, 0, 20 * index + 20);
      }
    });
  },
  destroyVideo(videonum) {
    for (let i = 0; i < videonum; i++) {
      ZQL_multivideo.destroyVideoByIndex(i);
    }
  },
  destroyVideoByIndex(index) {
    ZQL_multivideo.clearCanvas(index);
    if (ZQL_videosInfos[index]) {
      if (
        ZQL_videosInfos[index] &&
        ZQL_videosInfos[index].subscribeTimeout
      ) {
        clearTimeout(ZQL_videosInfos[index].subscribeTimeout);
        ZQL_videosInfos[index].subscribeTimeout = null;
      }
      if (ZQL_videosInfos[index] && ZQL_videosInfos[index].replayTimer) {
        clearTimeout(ZQL_videosInfos[index].replayTimer);
        ZQL_videosInfos[index].replayTimer = null;
      }
      if (ZQL_videosInfos[index].refreshTimeInterval) {
        clearInterval(ZQL_videosInfos[index].refreshTimeInterval);
        ZQL_videosInfos[index].refreshTimeInterval = null;
      }
      const info = ZQL_videosInfos[index];
      ZQL_videosInfos[index] = null;
      clearTimeout(info.canvasTimeout);
      let video = document.getElementById("video" + index);
      if (video) { video.onplaying = null; video.srcObject = null; }
      const player = info.srsrtc;
      info.srsrtc = null;
      if (player) player.close();
      ZQL_multivideo.clearCanvas(index);
    }
  },
  clearCanvas(index) {
    let canvas = document.getElementById("canvas" + index);
    if (canvas && canvas.getContext("2d")) {
      canvas
        .getContext("2d")
        .clearRect(0, 0, canvas.width, canvas.height);
    }
  },
  connectMqtt() {
    if (ZQL_multivideo.mqttclient) return;
    const mqttUrl = new URL('/mqtt', ZQL_origin());
    mqttUrl.protocol = mqttUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    let mqttclient = mqtt.connect(mqttUrl.href, {
      username: ZQLGLOBAL.mqttAuth[0],
      password: ZQLGLOBAL.mqttAuth[1],
    });
    ZQL_multivideo.mqttclient = mqttclient;
    mqttclient.on('error', error => console.error('MQTT连接失败', error.message));
    mqttclient.on('connect', () => {
    mqttclient.subscribe(
      ZQLGLOBAL.resultTopic,
      { qos: 0 },
      (error) => {
        if (error) {
          console.log("subscribe error:", error);
          return;
        }
      }
    );
    mqttclient.subscribe(
      ZQLGLOBAL.streamInfoTopic,
      { qos: 0 },
      (error) => {
        if (error) {
          console.log("subscribe error:", error);
          return;
        }
      }
    );
    });
    mqttclient.on("message", (topic, payload) => {
      let msg;
      try { msg = JSON.parse(payload.toString()); } catch (_) { return; }
      if (!msg || !msg.data) return;
      if (msg.msg_type == "video_detection" && msg.data.source && msg.data.alg) {
        let id = msg.data.source.id;
        for (let i = 0; i < 4; i++) {
          if (ZQL_videosInfos[i]) {
            if (
              id == ZQL_playingSource[i] &&
              msg.data.alg.name == ZQL_videosInfos[i].alg
            ) {
              ZQL_multivideo.setAlarms(msg.data.reserved_data, i);
              if (
                ZQL_videosInfos[i] &&
                ZQL_videosInfos[i].canvasTimeout
              ) {
                clearTimeout(ZQL_videosInfos[i].canvasTimeout);
              }
              ZQL_videosInfos[i].canvasTimeout = setTimeout(() => {
                ZQL_multivideo.clearCanvas(i);
              }, 1000);
              break;
            }
          }
        }
      }
      if (topic === ZQLGLOBAL.streamInfoTopic && msg.data.stream) {
        const source = ZQL_sources[msg.data.id];
        if (source) source.stream = msg.data.stream;
        for (let i = 0; i < ZQL_playingSource.videoNum; i++) {
          if (ZQL_playingSource[i] !== msg.data.id || !ZQL_videosInfos[i]) continue;
          const info = ZQL_videosInfos[i];
          ZQL_multivideo.getCameraSize(msg.data.id, i);
          if (msg.data.stream.is_online === false) {
            const player = info.srsrtc;
            info.srsrtc = null;
            if (player) player.close();
            info.status = '离线';
            ZQL_multivideo.liveOffline(i);
            ZQL_multivideo.reSubcribe(msg.data.id, i);
          } else if (info.status === '离线') {
            clearTimeout(info.subscribeTimeout);
            ZQL_multivideo.subscribeLive(msg.data.id, i);
          }
        }
      }
    });
  }
}

const ZQL_apis = {
  getSources: () => {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: "GET",
        dataType: "json",
        url: ZQL_apiUrl(ZQLGLOBAL.getSources),
        beforeSend: function (xhr) {
          xhr.setRequestHeader("Authorization", `Bearer ${ZQLGLOBAL.token}`);
        },
        success: function (res) {
          resolve(res)
        },
        error: function (err) {
          reject(err)
        }
      });
    })
  },
  subscribeLive: (source_id) => {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: "GET",
        dataType: "json",
        url: ZQL_apiUrl(ZQLGLOBAL.subscribe) + `?source_id=${encodeURIComponent(source_id)}`,
        beforeSend: function (xhr) {
          xhr.setRequestHeader("Authorization", `Bearer ${ZQLGLOBAL.token}`);
        },
        success: function (res) {
          resolve(res)
        },
        error: function (err) {
          reject(err)
        }
      });
    })
  },
  getToken: async () => {
    var ak = ZQLGLOBAL.accessKey;
    var sk = ZQLGLOBAL.accessSecret;
    var timestampRes = await ZQL_apis.getTimestamp();
    if (timestampRes.error_code !== 0) throw new Error(timestampRes.message || '获取时间戳失败');
    let timestamp = timestampRes.data;
    var nonce = ZQL_apis.generateRandomString(10);
    let signature = ZQL_apis.generateSignature(ak, sk, timestamp, nonce)
    return new Promise((resolve, reject) => {
      $.ajax({
        type: "GET",
        dataType: "json",
        url: ZQL_apiUrl(ZQLGLOBAL.getToken) + `?signature=${encodeURIComponent(signature)}&ak=${encodeURIComponent(ak)}&timestamp=${timestamp}&nonce=${nonce}`,
        success: function (res) {
          resolve(res)
        },
        error: function (err) {
          reject(err)
        }
      });
    })
  },
  getTimestamp: () => {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: "GET",
        dataType: "json",
        url: ZQL_apiUrl(ZQLGLOBAL.getTime),
        success: function (res) {
          resolve(res)
        },
        error: function (err) {
          reject(err)
        }
      });
    })
  },
  generateSignature: (ak, sk, timestamp, nonce) => {
    var message = `${ak}:${timestamp}:${nonce}`;
    var hash = CryptoJS.HmacSHA256(message, sk);
    var signature = CryptoJS.enc.Hex.stringify(hash);
    return signature
  },
  generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
  }
}

function init() {

  // 设置文档结构
  ZQL_multivideo.setVideoEl();

  // 设置事件监听
  // document.querySelector("#icon-oneviveo").addEventListener('click', () => {
  //   playingSource.videoNum = 1;
  //   setVideoEl();
  // })
  // document.querySelector("#icon-fourviveo").addEventListener('click', () => {
  //   playingSource.videoNum = 4;
  //   ZQL_multivideo.setVideoEl();
  // })

  // 1. 获取摄像头列表
  Promise.all([ZQL_apis.getSources()]).then(res => {
    if (res[0].error_code !== 0 || !Array.isArray(res[0].data)) {
      throw new Error(res[0].message || '获取摄像头失败');
    }
    let cameras = res[0].data.map(item => {
      item.alg = item.alg || {};
      item.sourceId = item.id;
      item.title = item.desc;
      // 保留接口的 source.type，供视频源逻辑使用。
      item.checked = false;
      ZQL_sources[item.id] = item
      return item
    });

    layui.use(function () {
      var tree = layui.tree;
      var layer = layui.layer;
      tree.render({
        elem: '#ZQL_source_tree',
        data: cameras,
        // showCheckbox:true,
        onlyIconControl: true,  // 是否仅允许节点左侧图标控制展开收缩
        click: function (obj) {
          if (obj.data.sourceId) {
            let key = obj.data.sourceId;
            if (ZQL_sources[key].checked == false) {
              if (ZQL_playingSource.videoNum > 1 &&
                  !Array.from({length: ZQL_playingSource.videoNum}, (_, i) => ZQL_playingSource[i]).includes(null)) return;
              ZQL_sources[key].checked = true
              if (ZQL_playingSource.videoNum == 1) {
                const previous = ZQL_playingSource[0];
                if (previous != null) ZQL_sources[previous].checked = false;
                ZQL_multivideo.destroyVideoByIndex(0);
                ZQL_playingSource[0] = key;
                ZQL_multivideo.subscribeLive(key, 0);
                ZQL_multivideo.setAlgList(0);
              } else {
                for (let i = 0; i < 4; i++) {
                  if (!ZQL_playingSource[i]) {
                    ZQL_playingSource[i] = key;
                    ZQL_multivideo.subscribeLive(key, i);
                    ZQL_multivideo.setAlgList(i)
                    break;
                  }
                }
              }
            } else {
              ZQL_sources[key].checked = false
              if (ZQL_playingSource.videoNum == 1) {
                ZQL_playingSource[0] = null;
                ZQL_multivideo.destroyVideoByIndex(0);
                ZQL_multivideo.clearAlgList(0);
                ZQL_multivideo.liveStopLoading(0);
              } else {
                for (let i = 0; i < 4; i++) {
                  if (ZQL_playingSource[i] == key) {
                    ZQL_playingSource[i] = null;
                    ZQL_multivideo.destroyVideoByIndex(i);
                    ZQL_multivideo.clearAlgList(i)
                    ZQL_multivideo.liveStopLoading(i);
                  }
                }
              }
            }
          }
        }
      });
    });
  }).catch(err => {
    console.error('获取摄像头列表失败', err);
    document.getElementById('ZQL_source_tree').textContent = err.message || '获取摄像头列表失败';
  })
  // 通过mqtt获取实时检测结果和视频流状态信息
  ZQL_multivideo.connectMqtt()
  
}
window.addEventListener('resize', () => {
  for (let i = 0; i < ZQL_playingSource.videoNum; i++) {
    if (ZQL_videosInfos[i]) ZQL_multivideo.getCameraSize(ZQL_playingSource[i], i);
  }
});
window.addEventListener('beforeunload', () => {
  ZQL_multivideo.destroyVideo(ZQL_playingSource.videoNum);
  if (ZQL_multivideo.mqttclient) ZQL_multivideo.mqttclient.end(true);
});
