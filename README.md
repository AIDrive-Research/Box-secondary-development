# XiaoZhi AI Device Secondary Development Sample Code
This project provides **sample code for secondary development** of the XiaoZhi AI all-in-one devices. You can use the **official BBS API documentation** along with these sample codes to quickly develop your own applications.
The sample code we provide is **ready-to-run** and can interact with your device directly. You can follow the coding style in these examples to implement your own secondary development.
For the most commonly used APIs, we provide sample code in **Python** and **Java**. For other APIs, we provide Python or other language examples only.
We are only responsible for the provided sample code. For developers, we assume you have the necessary programming skills. We do not provide support for debugging your own code.

The repository mainly includes the following sample categories:
- **Receiving Device Real-Time Alerts**(most common)
- **Full Integration with Device APIs**(for advanced users)
- **Receiving large-model review alerts**(for users with large-model devices)
- **Heartbeat monitoring**(for advanced users)

## Receiving Device Real-Time Alerts
This is the most commonly used secondary development sample. Most users use it to display real-time alert information from the device on their business platform.
We provide three ways of sample code:

- **HTTP protocol** (most common)  
- **TCP protocol** (often used in PLC control)  
- **Custom API** (useful if your platform requires a specific alert data format)

## Full Integration with Device APIs
For users who deeply use the device, this secondary development method allows you not only to receive alerts but also to **control the device**. Main features include:
- **Live video streaming & real-time detection boxes** 
- **Camera configuration & algorithm binding**  
- **Database grouping & facial recognition library**
- **Viewing device information**  

## Receiving Large-Model Review Alerts
A few users require this interface. This method receives **review results from the device’s large AI model**.

## Heartbeat Monitoring
A few users require this interface. The sample code helps check whether the device is **online**.

## Image_Source
The image stream sample code supports invocation via both HTTP and MQTT protocols.
