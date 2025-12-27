import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Base64;

@Slf4j
@RestController
@RequestMapping(path = "")
public class AlertController {


    /**
     * 目标平台接收告警及告警图片
     *
     * @param alertMsg
     */

    @PostMapping(path = "/alert")
    public void getAlertMsg(@RequestBody AlertMsg alertMsg) {
        log.info("示例接收告警及告警图片：{}", alertMsg);
        String img = alertMsg.getImage();
        Files.write(
                Paths.get(System.currentTimeMillis() + ".jpg"),
                Base64.getDecoder().decode(img)
        );
    }

    /**
     * 目标平台接收告警及告警视频
     *
     * @param data
     * @param video
     */

    @PostMapping("/alert/video")
    public void getAlertVideo(
            @RequestPart("data") String data,  // 接收 JSON 字符串
            @RequestPart("video") MultipartFile video) {

        AlertVideo alertVideo = JSON.parseObject(data, AlertVideo.class);
        log.info("示例接收告警及告警视频：{}", alertVideo);
        log.info("接收到的视频文件名大小：{}", video.getSize());

    }


}
