# miniapp-tool — 简卡拉卡Tool（uni-app + Vue 3）

充电桩 **蓝牙运维 / 现场调试** 独立微信小程序，与 `miniapp/`（考研学习）分离编译发布。

| 项 | 值 |
|----|-----|
| 名称 | 简卡拉卡Tool |
| 微信 AppID | `wxa1ac0f0b4deb35e7` |
| 编译产物 | `unpackage/dist/dev/mp-weixin/` |

## Tab 结构

| Tab | 路径 | 说明 |
|-----|------|------|
| 设备 | `pages/toolbox/charger-menu/charger-menu` | 蓝牙连接、充电监控、参数、固件升级 |
| 工具 | `pages/toolbox/toolbox` | 运维平台、计算器、二维码 |
| 我的 | `pages/mine/mine` | 登录、权限、个人资料 |

## 充电桩功能（与考研版 `miniapp/` 同源协议）

| 页面 | 说明 |
|------|------|
| `charger-bluetooth` | BLE 扫描连接、收发调试 |
| `charger-monitor` | SystemInfo / GunInfo 监控 |
| `charger-params` | ParamQuery / ParamModify |
| `charger-firmware` | 固件分片升级 |

详见 [docs/充电桩蓝牙调试-实施方案.md](../docs/充电桩蓝牙调试-实施方案.md)。

## 开发

1. HBuilderX 打开 **本目录** `miniapp-tool`（不是 `miniapp`）
2. 运行 → 微信开发者工具
3. 或导入：`miniapp-tool/unpackage/dist/dev/mp-weixin`

## 说明

- 仅支持 **BLE** 扫描连接；经典蓝牙 SPP（如 Niren USB 转蓝牙）不可用
- 与考研版共用后端 API；运维功能需权限 **L3+**
- 考研版 `miniapp/` 仍保留工具箱入口，本工程为独立运维小程序
