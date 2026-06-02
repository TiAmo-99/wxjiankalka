# 考研学习记录系统（jiankalka-kaoyan）

微信小程序 + 云服务器 API + 网页管理后台，用于考研学员学习计划查看与每日学习上报。

## 文档（开发前请先阅读）

| 文档 | 说明 |
|------|------|
| [docs/考研学习记录系统-需求与实施方案.md](./docs/考研学习记录系统-需求与实施方案.md) | **主文档**：需求、架构、数据模型、API 概要、分阶段计划 |
| [docs/api-convention.md](./docs/api-convention.md) | 接口约定 |
| `docs/api-spec.md` | 详细 API 说明（阶段 1+ 创建） |
| `docs/test-checklist.md` | 测试清单（阶段 7 创建） |
| [docs/deploy.md](./docs/deploy.md) | **阿里云 + 宝塔部署**（www.jiankalka.cn） |
| [docs/vocab.md](./docs/vocab.md) | **英语单词**：词库导入、API、小程序页面 |

## 规划中的目录结构

```
jiankalka-kaoyan/
├── miniapp/     # uni-app 微信小程序
├── server/      # API + 管理后台（admin-web、public/admin）
└── docs/        # 项目文档
```

| [miniapp/](./miniapp/) | 三 Tab：计划｜今日｜我的，见 [miniapp/README.md](./miniapp/README.md) |
| [server/](./server/) | API + 网页管理后台，见 [server/README.md](./server/README.md) |

## 开发顺序

按主文档 **第 15 节「分阶段实现计划」** 执行：  
**0 初始化 → 1 服务端 → 2 管理后台 → 3 学员 API → 4 小程序 → 5 部署 → 7 测试文档**（阶段 6 提醒可二期）。
