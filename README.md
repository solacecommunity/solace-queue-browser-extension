[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

# Solace-browser-extension
View the payload of a message from the console inline

## Overview
This extension was build to prove that the payload of messages can be viewed inline. If you want to add new features or make improvements, feel free to add a pull request!

## Getting started quickly
### Installing the Extension
1. Clone or download this repository to a folder on your device.
2. If downloaded, unzip the package.
3. Go to **[chrome://extensions/](chrome://extensions/)**
4. At the top right, turn on **Developer mode**.
5. Click **Load unpacked** and select the unzipped **solace-queue-browser-extension-main** folder.\

### Getting Connected

1. From the **[chrome://extensions/](chrome://extensions/)** page, click the Detail button, scroll down, and click on Extension options
    ![image](https://user-images.githubusercontent.com/8796208/112061250-7faa8380-8b5e-11eb-811b-de013e44fd6a.png)
    * This page contains the input fields required to establish a connection.
2. To obtain these credentials, open Solace Cluster Manager and select the Service you want to connect with.
3. For Username and Password, please refer to the official [Creating a Client Username](https://docs.solace.com/Admin/Broker-Manager/broker-manager-create-client-username.htm) documentation.
4. For the Message VPN, navigate to **Manage -> SEMP - REST API**.
    * Here you will find Message VPN Name. Copy this value.
5. For the JavaScript API Endpoint, navigate to **Connect -> Connect with JavaScript -> Solace JavaScript API**.
    * Here you will find Host URIs. Copy the URI that looks similar to this example: **wss://example.messaging.solace.cloud:12345**
6. Click save.


### Displaying Messages

1. Open **Cluster Manager** and select the Service whose queued messages you would like to see.
2. Navigate to **Manage -> Message VPN -> Queues**.
3. Click a queue from the list and then click the **Messages Queued** tab.
4. Right-click on the list and select **Find messages on queue** from your context menu.
    ![image](https://user-images.githubusercontent.com/8796208/112063582-ea10f300-8b61-11eb-992a-cdfa2a67ff3a.png)
5. Messages will be displayed inline.
    ![image](https://github.com/solacecommunity/solace-queue-browser-extension/assets/20181973/7fc630a1-3ea2-4b52-a891-67bf90f713ad)
6. If you have toggled ON Display User Properties, you will also see the User Properties of each message displayed next to the queue message.
    ![image](https://github.com/solacecommunity/solace-queue-browser-extension/assets/20181973/20bba23e-5983-41df-99c4-3e68042243da)



## Documentation
See also a thread on https://solace.community/discussion/comment/2103#Comment_2103
Please note that the use of this extension is at your own risk.

## Resources

For more information try these resources:

- The Solace Developer Portal website at: https://solace.dev
- Ask the [Solace Community](https://solace.community)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

See the list of [contributors](https://github.com/solacecommunity/<github-repo>/graphs/contributors) who participated in this project.

## License

See the [LICENSE](LICENSE) file for details.
