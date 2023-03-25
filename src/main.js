const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;
const path = require('path')
const superagent = require("superagent");

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        backgroundColor: '#333333',
        // alwaysOnTop: true,
        // resizable: false,
        webPreferences: {
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.loadURL('https://livehub.oceanengine.com')
    mainWindow.setMenu(null)
    // mainWindow.webContents.openDevTools()


    const filter = {
        urls: [
            '*://livehub.oceanengine.com/aweme/v1/saiyan/live/card/transform/type*',
            '*://livehub.oceanengine.com/aweme/v1/saiyan/live/card/list/?account_id=*&transform_type=4&room_id=*'
        ]
    }
    mainWindow.webContents.session.webRequest.onBeforeRequest(filter, async (details, callback) => {
        let ck = await mainWindow.webContents.session.cookies.get({ url: details.url })

        // 列表
        if (details.url.indexOf('https://livehub.oceanengine.com/aweme/v1/saiyan/live/card/transform/type') == 0) {
            callback({ redirectURL: 'https://mp-d0e3f24d-d104-4137-9498-8317af57195e.cdn.bspapp.com/cloudstorage/31e9e04d-40a7-46a7-babb-0240c1bc732a.json' });
        }

        // 列表
        if (details.url.indexOf('livehub.oceanengine.com/aweme/v1/saiyan/live/card/list/') != -1) {
            let cookie = "";
            for (let index in ck) {
                if (cookie) {
                    cookie += ';'
                }

                cookie += `${ck[index].name}=${ck[index].value}`
            }
            let s = await superagent.get("https://livehub.oceanengine.com/livehub/api/v1/user/info")
                .set({
                    cookie: cookie,
                    'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.104 Electron/23.1.1 Safari/537.36",
                    "referer": "https://livehub.oceanengine.com"
                })
            let sec_uid = s.body.data.sec_uid
            callback({ redirectURL: 'https://xingtu.yunjiofo.com/api/new_uni?sec_uid=' + sec_uid });
        }
    })
}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})