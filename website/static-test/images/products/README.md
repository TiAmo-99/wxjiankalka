# 产品展示图片

网站引用 `./images/products/` 下英文文件名，便于上传与 CDN。

## 一键复制（本机）

在仓库根目录 `jiankalka-kaoyan` 任选一种方式：

**方式 A（推荐，免改系统策略）**

```bat
website\scripts\copy-product-images.bat
```

或双击 `website\scripts\copy-product-images.bat`。

**方式 B（Python）**

```bat
python website\scripts\copy-product-images.py
```

**方式 C（PowerShell，若提示禁止运行脚本）**

```powershell
powershell -ExecutionPolicy Bypass -File .\website\scripts\copy-product-images.ps1
```

脚本会从**仓库根目录**下的 `产品图片`（与 `miniapp`、`website` 同级）复制；也支持 `uniapp\产品图片` 或命令行指定路径。

默认位置示例：

```text
jiankalka-kaoyan/
├── 产品图片/          ← 放这里（当前项目结构）
├── website/
└── miniapp/
```

## 手动复制对照表

| 网站文件名 | 源文件（产品图片目录内） |
|------------|-------------------------|
| `ac-7kw-e3.jpg` | `9-交流桩/7kW个人有序交流充电桩-E3.jpg` |
| `dc-120-180kw.jpg` | `1-社会版-一体机2025/1-120-180kW一体机/中性一体机---正面.jpg` |
| `dc-240kw-truck.png` | `1-社会版-一体机2025/2-240kW-400kW重卡充电桩/lQLPJw8vB1eu1QXNDaXNE4iwbpN1EwDYUgwJlc0ZUfgoAQ_5000_3493.png` |
| `host-liquid-cool-cabinet.png` | `7-全液冷主机柜/全液冷光储充放主机柜---.png` |
| `terminal-liquid-cool.png` | `2-社会版-四种充电终端/1-液冷充电终端-正面.png` |
| `dc-small-power.png` | `3-小功率直流桩/小直流.png` |
| `storage-charge-unit.png` | `储充一体机效果图.png`（根目录） |
| `eu-standard-dc.png` | `8-欧标直流桩/欧标直流桩.png` |

## 上传到服务器

与 `index.html` 一并上传到 `/www/wwwroot/www.jiankalka.cn/images/products/`。
