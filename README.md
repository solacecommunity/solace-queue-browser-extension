[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

# Solace-browser-extension
View the payload of a message from the console inline

## Overview
This extension was build to proof that the payload of messages can be viewed inline. If you want to add new features or make improvements, feel free to add a pull request!

## Getting started quickly
1.  Clone or download this repository to a folder on your device.
2.  Go to  **[chrome://extensions/](chrome://extensions/)**
3.  At the top right, turn on  **Developer mode**.
4.  Click  **Load unpacked**.
5.  Find and select the folder.
6. Click in Detail button, scroll down and click on Extension options
![image](https://user-images.githubusercontent.com/8796208/112061250-7faa8380-8b5e-11eb-811b-de013e44fd6a.png)
8. Fill in your connection details you find on Solace Web Messaging:
URL: Secured Web Messaging Host like wss://xxxxxxxxpz3.messaging.solace.cloud:443
8. Go to https://console.solace.cloud/ -> Cluster Manager -> Manage -> Click on the Queues tile
9. Select your queue in the list 
10. View Tab Messages Queued
11. Right click on the list and select in your context menu "Find messages on queue"
![image](https://user-images.githubusercontent.com/8796208/112063582-ea10f300-8b61-11eb-992a-cdfa2a67ff3a.png)
13. messages will be displayed inline 
![image](https://user-images.githubusercontent.com/8796208/112061173-6570a580-8b5e-11eb-8803-9f3a4ca691c9.png)


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
