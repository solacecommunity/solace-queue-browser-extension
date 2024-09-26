[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

# Solace-browser-extension
View the message content of a queued message directly in the Messages Queued.

## Overview
This extension was built to prove that the payload of messages can be viewed inline. If you want to add new features or make improvements, feel free to add a pull request!

## Getting started quickly
### Installing the Extension
1. Clone or download this repository to a folder on your device.
2. If downloaded, unzip the package.
3. Go to **[chrome://extensions/](chrome://extensions/)**
4. At the top right, turn on **Developer mode**.
5. Click **Load unpacked** and select the unzipped **solace-queue-browser-extension-main** folder.

### Getting Connected

1. Click on the extensions icon in the top right corner and then click the newly installed **Emixa Solace message view Extension**.
   * A new page should open prompting for an encryption key.
   * This key will be used to securely encrypt the connections you save locally.

   ![image](https://github.com/user-attachments/assets/6ac6b057-ac04-4815-81b0-938fe8a3ae9b)
   
3. Enter a key and click save.
4. To create a connection, click the green New Connection button.
5. Now on the right side of the page, start filling in the required connection detail fields.
7. To obtain these credentials, open Solace Cluster Manager and select the Service you want to connect with.
8. For Username and Password, please refer to the official [Creating a Client Username](https://docs.solace.com/Admin/Broker-Manager/broker-manager-create-client-username.htm) documentation.
9. For the Message VPN, navigate to **Manage -> SEMP - REST API**.
    * Here you will find the Message VPN Name. Copy this value.
10. For the Host name, navigate to **Connect -> Connect with JavaScript -> Solace JavaScript API**.
    * Here you will find Host URIs.
    * Find a URI that looks similar to this _wss://mr-connection-abcd1234.messaging.solace.cloud:443_ and copy the **mr-connection-abcd1234** value.
11. Click save.
    * Clicking save will automatically make an attempt to connect to the Message VPN.
    * The result will be displayed in the top right hand corner.


### Displaying Messages

1. Open **Cluster Manager** and select the Service whose queued messages you would like to see.
2. Navigate to **Manage -> Message VPN -> Queues**.
3. Click a queue from the list and then click the **Messages Queued** tab.
4. In the top-right corner of the window there is a green button **Find Messages**.
5. 
    ![image](https://github.com/user-attachments/assets/184f3b13-1e55-4391-a430-0d5d254a1b7a)

6. Messages will be displayed inline.
   
    ![image](https://github.com/solacecommunity/solace-queue-browser-extension/assets/20181973/7fc630a1-3ea2-4b52-a891-67bf90f713ad)
   
8. If you have toggled ON Display User Properties, you will also see the User Properties of each message displayed next to the queue message.
   
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
