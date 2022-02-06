function save_options() {
  localStorage.setItem('solaceURL', document.getElementById('solaceURL').value);
  localStorage.setItem('solaceVpnName', document.getElementById('vpnName').value);
  localStorage.setItem('solaceUserName', document.getElementById('userName').value);
  localStorage.setItem('solacePassword', document.getElementById('password').value);
  
}
function restore_options() {
  document.getElementById('solaceURL').value = localStorage.getItem('solaceURL') || '';
  document.getElementById('vpnName').value = localStorage.getItem('solaceVpnName') || '';
  document.getElementById('userName').value = localStorage.getItem('solaceUserName') || '';
  document.getElementById('password').value = localStorage.getItem('solacePassword') || '';
  
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
