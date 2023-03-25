const electron = require('electron');
const { app, BrowserWindow } = electron;
const path = require('path')

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        backgroundColor: '#333333',
        // alwaysOnTop: true,//总是置顶
        // resizable: false,//不允许跳转大小
        webPreferences: {
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.loadURL('https://livehub.oceanengine.com')
    mainWindow.setMenu(null)
    // mainWindow.webContents.openDevTools()  //打开调试
}

app.whenReady().then(async () => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    })
})