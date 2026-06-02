# 英语单词功能

## 数据库

迁移时会创建 `vocabulary_words`、`vocabulary_phrases` 表。若表为空，会自动导入 `server/data/vocab-kaoyan-seed.json`（约 70 词 + 12 短语，用于演示）。

语料表支持三种类型：`phrase`（短语）、`sentence`（长句）、`passage`（阅读片段）。启用语料少于 30 条时，迁移会自动合并 `server/data/vocab-phrases-seed.json`（约 55 短语 + 18 长句 + 11 片段）。

## 导入完整考研词表（推荐，无需手录）

**一条命令**（从 GitHub 下载「5 考研-乱序.txt」约 9600 词并写入数据库）：

```bash
cd server
npm run db:migrate
npm run db:import-vocab:kaoyan
npm run db:import-phrases
```

需服务器能访问 `raw.githubusercontent.com`（仅考研词表下载需要）。

### 导入语料（短语 / 长句 / 阅读片段）

```bash
npm run db:import-phrases
# 或指定 JSON：npm run db:import-phrases -- path/to/custom.json
```

JSON 格式：`{ "phrases": [{ "kind": "phrase|sentence|passage", "title": "可选", "phraseEn": "...", "meaningZh": "..." }] }`

### 手动指定文件

```bash
npm run db:import-vocab -- data/kaoyan-kylebing.txt
npm run db:import-vocab -- /path/to/考研.json
```

支持格式：

- **`.txt`**：每行 `单词<Tab>释义`（KyleBing 乱序词表）
- **`.json`**：`{ "words": [...], "phrases": [...] }`（本项目 seed）
- JSON 数组项含 `word` + `translations`；词条内 `phrases` 会一并导入短语表

## API（无需登录）

| 接口 | 说明 |
|------|------|
| `GET /api/v1/vocab/set?wordCount=3&phrase=0` | 今日页：每次进入随机 3 词 |
| `GET /api/v1/vocab/preview?count=3` | （可选）按日期固定 3 词 |
| `GET /api/v1/vocab/set?wordCount=10&phrase=1` | 学习页：随机 10 词 + 1 条语料（短语/长句/片段随机） |
| `GET /api/v1/vocab/stats` | 词库数量统计 |

## 小程序页面

- 今日 Tab：`pages/home/home` 展示随机 3 词（每次进入刷新）+「学习更多单词」
- 学习页：`pages/vocab/vocab`（点击显示中文、「更新一组」；语料按类型显示「今日短语 / 今日长句 / 阅读片段」）

## 管理后台

登录管理后台 → 左侧 **英语词库**：

- **单词** Tab：搜索、分页、新增/编辑/启用/停用/删除
- **语料** Tab：短语、长句、阅读片段的完整 CRUD（类型筛选、多行英文/中文编辑）
- 顶部统计：单词数、短语数、长句数、阅读片段数

管理 API（需管理员登录）：

| 接口 | 说明 |
|------|------|
| `GET /api/v1/admin/vocab/stats` | 词库统计（含语料分类数量） |
| `GET /api/v1/admin/vocab/words` | 单词分页（keyword、status） |
| `POST /api/v1/admin/vocab/words` | 新增单词 |
| `PATCH /api/v1/admin/vocab/words/:id` | 修改单词 |
| `DELETE /api/v1/admin/vocab/words/:id` | 删除单词 |
| `GET /api/v1/admin/vocab/phrases` | 语料分页（keyword、status、kind） |
| `POST /api/v1/admin/vocab/phrases` | 新增语料 |
| `PATCH /api/v1/admin/vocab/phrases/:id` | 修改语料 |
| `DELETE /api/v1/admin/vocab/phrases/:id` | 删除语料 |

## 部署

上传 `server` 后执行 `npm run db:migrate`（或 `npm run db:import-vocab`），重启 API，重新编译上传小程序。
