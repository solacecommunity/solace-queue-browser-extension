function old_save_options() {
  localStorage.setItem('solaceURL', document.getElementById('solaceURL').value);
  localStorage.setItem('solaceVpnName', document.getElementById('vpnName').value);
  localStorage.setItem('solaceUserName', document.getElementById('userName').value);
  localStorage.setItem('solacePassword', document.getElementById('password').value);
  
}
function save_options() {
  chrome.storage.local.set({'solaceURL':document.getElementById('solaceURL').value});
  chrome.storage.local.set({'solaceVpnName':document.getElementById('vpnName').value});
  chrome.storage.local.set({'solaceUserName':document.getElementById('userName').value});
  chrome.storage.local.set({'solacePassword':document.getElementById('password').value});
}

function old_restore_options() {
  document.getElementById('solaceURL').value = localStorage.getItem('solaceURL') || '';
  document.getElementById('vpnName').value = localStorage.getItem('solaceVpnName') || '';
  document.getElementById('userName').value = localStorage.getItem('solaceUserName') || '';
  document.getElementById('password').value = localStorage.getItem('solacePassword') || '';
  
}
function restore_options() {
  chrome.storage.local.get(["solaceURL"]).then((result) => {
    console.log(result.solaceURL)
    if (result.solaceURL) {
      document.getElementById('solaceURL').value = result.solaceURL;
    }
  });
  chrome.storage.local.get(["solaceVpnName"]).then((result) => {
    console.log(result.solaceVpnName)
    if(result.solaceVpnName) {
      document.getElementById('vpnName').value = result.solaceVpnName;
    }
  });
  chrome.storage.local.get(["solaceUserName"]).then((result) => {
    console.log(result.solaceUserName)
    if(result.solaceUserName) {
      document.getElementById('userName').value = result.solaceUserName;
    }
  });
  chrome.storage.local.get(["solacePassword"]).then((result) => {
    console.log(result.solacePassword)
    console.log(Object.keys(result).length)
    if(result.solacePassword) {
      document.getElementById('password').value = result.solacePassword;
    }
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
