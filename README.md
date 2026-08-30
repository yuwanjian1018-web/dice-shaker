# 好运骰盅 · 原生微信小程序

这是一个从零创建的微信原生小程序：点击按钮后，骰盅先盖下、摇动，再自动揭开并显示五颗随机骰子及总点数。

## 已实现

- 五颗标准六面骰子，每次独立随机生成 1～6 点
- 骰盅盖下、连续摇动、向上揭开的完整动画
- 五种骰子落地动画与点阵显示
- 动画期间锁定按钮，防止连续点击导致计时器叠加
- 自动计算并显示五颗骰子的总点数
- 无图片依赖，骰子和骰盅均由 WXML/WXSS 绘制
- Node.js 自动化测试与项目结构检查

## 在微信开发者工具中打开

1. 安装并打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 先按微信官方说明[扫码申请免费测试号](https://developers.weixin.qq.com/miniprogram/dev/devtools/sandbox.html)，复制分配给你的小程序 AppID。
3. 点击开发者工具中的 **“+” / 导入项目**。
4. 项目目录选择：

   ```text
   C:\Users\xiaojian\Documents\WeChatProjects\dice-shaker
   ```

5. 项目已配置测试 AppID；如果以后换成正式小程序，可在开发者工具的项目设置中更新 AppID。
6. 导入后点击顶部 **编译**，再点击页面中的 **摇一摇**。

> 微信当前已将 `touristappid` 视为无效值；游客模式只能编辑本地项目。要使用模拟器、真机预览或发布，请使用测试 AppID 或你正式注册的小程序 AppID。AppID 不是密码，但 **AppSecret 永远不要写进前端代码或提交到 Git**。

## 运行测试

在 WSL 终端执行：

```bash
cd /mnt/c/Users/xiaojian/Documents/WeChatProjects/dice-shaker
npm test
npm run check
```

项目没有第三方 npm 依赖，因此不需要先运行 `npm install`。

## Git 新手说明

Git 用来保存代码的历史快照。推荐使用以下最小流程：

```bash
# 只需配置一次；请换成你自己的姓名和邮箱
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"

# 查看改动
git status

# 选择要放入下一次快照的文件
git add .

# 创建快照
git commit -m "feat: create dice shaker mini program"
```

- `git add` 只是把改动放进“待提交区”，并没有上传网络。
- `git commit` 只在本机创建历史记录，也没有上传网络。
- GitHub/Gitee 是远程代码托管平台，以后需要备份或协作时再连接即可。
- `project.private.config.json` 已写入 `.gitignore`，它是开发者工具生成的个人配置，不应提交。
- 提交前先运行 `npm test && npm run check`。

## 目录结构

```text
├── app.js / app.json / app.wxss       小程序全局配置
├── pages/index/                       主页面、样式与动画
├── utils/dice.js                      骰子随机与点阵模型
├── utils/game.js                      盖下、摇动、揭盖状态流程
├── tests/                             Node.js 自动化测试
├── scripts/check-project.js           项目结构及语法检查
└── project.config.json                微信开发者工具项目配置
```

## 第一次开发需要特别注意

1. **前端不能保存秘密**：AppSecret、支付密钥、数据库密码必须放在服务端，不能写入小程序代码。
2. **真机表现要复测**：开发者工具与手机的字体、性能和安全区域可能略有差异。
3. **不要直接改测试来掩盖错误**：业务变更时先明确期望，再修改测试和实现。
4. **当前随机数用于娱乐展示**：`Math.random()` 适合普通小游戏，不适合赌博、抽奖兑付或任何资金场景。
5. **小步提交 Git**：每完成一个独立功能就提交一次，出问题时更容易退回。

## 当前交互时间

- 盖下骰盅：280 ms
- 摇动骰盅：1200 ms
- 随后自动揭盖并展示结果

这些时间定义在 `utils/game.js`，动画外观定义在 `pages/index/index.wxss`。
