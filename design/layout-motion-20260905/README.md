# 2026-09-05 骰子位置与体感模式验证

本轮基于工作区原有未提交改动继续开发；未提交 Git、未上传或发布。

## 当前行为

- 骰子层向前移动 34 rpx，在椭圆区域内重新随机选择位置，不再以固定排列加少量抖动生成布局；角度范围为 ±28°，保留最小中心间距。
- 只在完整摇动结束或数量改变时重新分配位置；拖动开合、锁定中断和后台中断不会改变本轮布局。
- 设置中新增体感摇骰开关。默认关闭；点完成保存到本机，关闭面板取消草稿。
- 体感开启时移除摇动按钮，唯一的锁定按钮占用原主按钮位置；关闭时恢复摇动按钮和右侧锁图标。
- 设置面板、后台及关闭体感时停止传感器监听；锁定阻止触发；传感器启动失败则恢复按钮并提示。
- 完全合盖时隐藏骰子，避免前移后的骰子从杯沿外露出。

## 已验证

- `node --test tests/*.test.js`：29 / 29 通过。随机布局测试含 1–6 颗共 1800 组边界/间距检查，以及 900 组分布变化检查。
- `node scripts/check-project.js`：通过。
- 官方 wechatide 的 `compile_wxml`、`compile_wxss`：均返回 success。
- `scripts/verify-motion-devtools.js`：真实模拟器页面的 24 项检查通过，包含主按钮的移除、唯一锁定按钮的位置及尺寸、设置取消/保存、传感器生命周期、注入加速度触发、锁定和 1–6 颗渲染。
- 通过元素接口打开设置、触发原生 switch 的 change 事件并点击完成，读回 `motionEnabled: true`。
- 截图目视核对：按钮模式、体感开/关设置、中央锁定/解锁、五颗与六颗骰子、完整合盖。截图先输出到工程外，再复制归档，避免截图写入触发热重载。

## 复现集成检查

在已授权且已打开项目的 Windows PowerShell 中执行（函数源码含显式分号，可安全合并为一行传给 CMD 入口）：

```powershell
$diceQa = (Get-Content -LiteralPath 'D:\DATE\vibecoding\dice-shaker\scripts\verify-motion-devtools.js' | Where-Object { $_ -notmatch '^//' }) -join ' '
wechatide -c Codex automation_evaluate --project 'D:\DATE\vibecoding\dice-shaker' --fn-source $diceQa
```

检查会暂时修改娱乐骰局，结束后恢复骰子数量、操作模式和锁定状态，并保持开盖便于查看。它不会恢复测试前的点数。

## 验证边界

本轮使用开发者工具模拟器和注入的加速度数据，未进行手机实机摇动；真实体感灵敏度、手机音效听感和不同机型仍需实机确认。模拟器检查不等于真机验收。
