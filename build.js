const changeExe = require('changeexe');
const path = require('path');
const fs = require('fs');
const ncc = require('@vercel/ncc');
const JavaScriptObfuscator = require('javascript-obfuscator');
const bytenode = require('bytenode');
const jschardet = require('iconv-jschardet');
const asar = require('asar');
const exec = require('child_process').exec;

function shell(content) {
    return new Promise((resolve, reject) => {
        exec(content, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(stdout)
            }
        });
    })
}

function deleteFolderRecursive(folderPath) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(folderPath)) {
            fs.readdirSync(folderPath).forEach((file, index) => {
                const curPath = path.join(folderPath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(folderPath);
            resolve();
        } else {
            resolve();
        }
    });
}

function copyFolderRecursive(src, dest) {
    return new Promise((resolve, reject) => {
        // console.log(dest)
        if (!fs.existsSync(dest)) {
            try {
                fs.mkdirSync(dest);
            } catch (error) {

            }
        }
        fs.readdirSync(src).forEach((file) => {
            const curPath = path.join(src, file);
            const destPath = path.join(dest, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                copyFolderRecursive(curPath, destPath)
                    .then(() => resolve())
                    .catch((err) => reject(err));
            } else {
                fs.copyFile(curPath, destPath, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    });
};

(async () => {
    // 删除主目录dist
    await deleteFolderRecursive('./dist');

    // 复制electron到主目录
    await copyFolderRecursive('./node_modules/electron/dist', './dist');

    // 删掉默认的asar包
    fs.unlinkSync("dist/resources/default_app.asar/default_app.js");
    fs.unlinkSync("dist/resources/default_app.asar/icon.png");
    fs.unlinkSync("dist/resources/default_app.asar/index.html");
    fs.unlinkSync("dist/resources/default_app.asar/main.js");
    fs.unlinkSync("dist/resources/default_app.asar/package.json");
    fs.unlinkSync("dist/resources/default_app.asar/preload.js");
    fs.unlinkSync("dist/resources/default_app.asar/styles.css");
    fs.rmdirSync("./dist/resources/default_app.asar");

    // 读取配置文件
    const config = require('./config.json');

    // 替换electron.exe图标和版本
    await changeExe.icon('./dist/electron.exe', config.ico);
    await changeExe.versionInfo('./dist/electron.exe', {
        CompanyName: config.companyName,
        FileDescription: config.fileDescription,
        FileVersion: config.productVersion,
        LegalCopyright: config.fileDescription,
        OriginalFilename: config.productName + '.exe',
        ProductName: config.productName,
        ProductVersion: config.productVersion
    });

    // 重命名electron.exe为设置好的文件名
    fs.renameSync('./dist/electron.exe', './dist/' + config.productName + '.exe');

    // 读取main.js内容并替换不易打包的electron引用部分
    fs.writeFileSync('./src/dist.js', fs.readFileSync('./src/main.js').toString().replace("require('electron')", "{electron:true}"));

    // 将npm包的js提取并合并为一个js
    try {
        fs.mkdirSync('./dist/resources/app')
    } catch (error) {

    }
    const re = await ncc(path.join(__dirname, './src/dist.js'));
    for (const key in re.assets) {
        fs.writeFileSync('./dist/resources/app/' + key, re.assets[key].source);
    }

    fs.writeFileSync('./dist/resources/app/package.json', JSON.stringify({
        "name": config.productName,
        "productName": config.productName,
        "main": "main.js"
    }))

    fs.unlinkSync('./src/dist.js');

    // 加密/dist/resources/app/dist.js
    const obfuscationResult = JavaScriptObfuscator.obfuscate(re.code.replace("{electron:true}", "require('electron')"),
        {
            "compact": true,
            "controlFlowFlattening": true,
            "controlFlowFlatteningThreshold": 0.75,
            "deadCodeInjection": true,
            "deadCodeInjectionThreshold": 0.4,
            "debugProtection": false,
            "disableConsoleOutput": true,
            "identifierNamesGenerator": "hexadecimal",
            "log": false,
            "renameGlobals": false,
            "rotateStringArray": true,
            "selfDefending": true,
            "stringArray": true,
            "stringArrayThreshold": 0.75,
            "unicodeEscapeSequence": false
        }
    );
    fs.writeFileSync('./dist/resources/app/dist.js', obfuscationResult.getObfuscatedCode())

    // 将加密过的/dist/resources/app/dist.js进行二进制打包
    bytenode.compileFile({
        filename: path.join(__dirname, './dist/resources/app/dist.js')
    });
    fs.writeFileSync('./dist/resources/app/main.js', "require('bytenode');require('./dist.jsc');");
    fs.unlinkSync('./dist/resources/app/dist.js');
    try {
        fs.mkdirSync('./dist/resources/app/node_modules');
    } catch (error) {

    }
    await copyFolderRecursive('./node_modules/bytenode', './dist/resources/app/node_modules/bytenode');

    // 进行asar打包
    await asar.createPackage('./dist/resources/app', './dist/resources/app.asar');
    await deleteFolderRecursive('./dist/resources/app');

    // 创建build目录
    await deleteFolderRecursive('./build');
    try {
        fs.mkdirSync('./build');
    } catch (error) {

    }

    // 读取nsi模板
    let nsiContent = jschardet.decode(fs.readFileSync('./build.nsi'), 'GB2312');

    // 替换nsi配置
    nsiContent = nsiContent.replace(/nsis\_product\_name/g, config.productName)
    nsiContent = nsiContent.replace(/nsis\_version/g, config.productVersion)
    nsiContent = nsiContent.replace(/nsis\_company\_name/g, config.companyName)
    nsiContent = nsiContent.replace(/nsis\_link/g, config.link)
    nsiContent = nsiContent.replace(/nsis\_ico/g, path.join(__dirname, config.ico))
    nsiContent = nsiContent.replace(/nsis\_setup/g, path.join(__dirname, './build/' + config.productName + '_' + config.productVersion + '_setup.exe'))
    nsiContent = nsiContent.replace(/nsis\_resource\_main/g, path.join(__dirname, './dist/' + config.productName + '.exe'))
    nsiContent = nsiContent.replace(/nsis\_resource\_dir/g, path.join(__dirname, './dist') + '\\*.*')
    nsiContent = nsiContent.replace(/nsis\_dir/g, config.dir)

    // 创建nsi文件
    fs.writeFileSync('./build/build.nsi', jschardet.encode(Buffer.from(nsiContent), 'GB2312'))

    // 进行nsis打包
    await shell("makensis ./build/build.nsi")

    process.exit();
})();