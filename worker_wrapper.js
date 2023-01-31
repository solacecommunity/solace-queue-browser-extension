
// MV3 only allows for a single script file to be imported in the service_worker
//  to get around this we import the required scripts here.
importScripts('src/lib/solclient.js', 'src/contextmenus.js', 'src/findmessages.js');