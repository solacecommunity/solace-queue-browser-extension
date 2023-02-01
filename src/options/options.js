function save_options() {
  chrome.storage.local.set({'solaceURL':document.getElementById('solaceURL').value});
  chrome.storage.local.set({'solaceVpnName':document.getElementById('vpnName').value});
  chrome.storage.local.set({'solaceUserName':document.getElementById('userName').value});
  chrome.storage.local.set({'solacePassword':document.getElementById('password').value});
}

function restore_options() {
  chrome.storage.local.get(["solaceURL"]).then((result) => {
    if (result.solaceURL) {
      document.getElementById('solaceURL').value = result.solaceURL;
    }
  });
  chrome.storage.local.get(["solaceVpnName"]).then((result) => {
    if(result.solaceVpnName) {
      document.getElementById('vpnName').value = result.solaceVpnName;
    }
  });
  chrome.storage.local.get(["solaceUserName"]).then((result) => {
    if(result.solaceUserName) {
      document.getElementById('userName').value = result.solaceUserName;
    }
  });
  chrome.storage.local.get(["solacePassword"]).then((result) => {
    if(result.solacePassword) {
      document.getElementById('password').value = result.solacePassword;
    }
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);