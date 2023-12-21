// [LeoPhillips][02-11-23][v3][START]
function save_options() {
  var loginDetails = {
    smfHost: null,
    msgVpn: null,
    userName: null,
    password: null,
  }

  loginDetails.smfHost = document.getElementById('smfHost').value;
  loginDetails.msgVpn = document.getElementById('msgVpn').value;
  loginDetails.userName = document.getElementById('userName').value;
  loginDetails.password = document.getElementById('password').value;
  
  chrome.storage.local.set({'loginDetails': loginDetails});
}
// [LeoPhillips][02-11-23][v3][END]


// [LeoPhillips][02-11-23][v3][START]
function restore_options() {
  chrome.storage.local.get(["loginDetails"]).then((result) => {
    if (result.loginDetails) {
      if (result.loginDetails.smfHost) {
        document.getElementById('smfHost').value = result.loginDetails.smfHost;
      }
      if (result.loginDetails.msgVpn) {
        document.getElementById('msgVpn').value = result.loginDetails.msgVpn;
      }
      if (result.loginDetails.userName) {
  
        document.getElementById('userName').value = result.loginDetails.userName;
      }
      if (result.loginDetails.password) {
        document.getElementById('password').value = result.loginDetails.password;
      }
    }
  });
}
// [LeoPhillips][02-11-23][v3][END]

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);