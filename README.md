# electorn-obfuscator-bytenode
electorn自定义加密打包脚手架


###### 自动替换electorn信息
#### 加密方式

1. 先使用ncc将全部包打到一个js里面
2. 使用javascript-obfuscator加密上述js
3. 使用bytenode将上述js打包为jsc二进制加密
4. 创建main.js引用jsc，再用asar压成一个包

###### pack方法自动使用nsis将dist文件打包成exe安装包

###### 打包使用前提，必须全局安装nsis，并将nsis安装目录下的makensis.exe注册到环境变量

#### 使用方式

```
#下载后执行，安装扩展
npm i

#开发运行
npm run dev

#发布编译
npm run build

#测试运行已编译文件
npm run start

#打包exe安装包
npm run pack
```

#### 目录解释
1. dist是编译生成的绿色文件包，自动生成
2. build是打包放置安装包的目录，自动生成
3. config.json是exe配置文件
4. icon/icon.ico是exe图标，可根据config.json的ico配置动态更改
5. build.nsi是nsis打包的模板
6. src下面是工程文件，main.js是主入口文件