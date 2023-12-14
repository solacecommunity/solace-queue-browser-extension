// [LeoPhillips][02-11-23][v3][START]
function save_options() {
  var loginDetails = {
    solaceURL: null,
    solaceVpnName: null,
    solaceUserName: null,
    solacePassword: null,
  }

  loginDetails.solaceURL = document.getElementById('solaceURL').value;
  loginDetails.solaceVpnName = document.getElementById('vpnName').value;
  loginDetails.solaceUserName = document.getElementById('userName').value;
  loginDetails.solacePassword = document.getElementById('password').value;
  
  chrome.storage.local.set({'loginDetails': loginDetails});
}
// [LeoPhillips][02-11-23][v3][END]


// [LeoPhillips][02-11-23][v3][START]
function restore_options() {
  chrome.storage.local.get(["loginDetails"]).then((result) => {
    if (result.loginDetails.solaceURL) {
      document.getElementById('solaceURL').value = result.loginDetails.solaceURL;
    }
    if (result.loginDetails.solaceVpnName) {
      document.getElementById('vpnName').value = result.loginDetails.solaceVpnName;
    }
    if (result.loginDetails.solaceUserName) {

      document.getElementById('userName').value = result.loginDetails.solaceUserName;
    }
    if (result.loginDetails.solacePassword) {
      document.getElementById('password').value = result.loginDetails.solacePassword;
    }
  });
}
// [LeoPhillips][02-11-23][v3][END]

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);