const { contextBridge: bridge, ipcRenderer } = require('electron');

bridge.exposeInMainWorld('ipcRenderer', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, fun) => ipcRenderer.on(channel, fun),
    sendSync: (channel, fun) => ipcRenderer.sendSync(channel, fun)
});

bridge.exposeInMainWorld('node', {});
