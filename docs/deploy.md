# 部署指南（阿里云 + 宝塔）

适用于将 `server/` API 部署到公网。API 使用独立子域名 **server.jiankalka.cn**，服务器 **182.92.157.86**。

---

## 一、部署架构（推荐）

```
用户 / 微信小程序
        ↓ HTTPS
server.jiankalka.cn (443)  ← 宝塔独立站点 + SSL + 反代
        ↓
127.0.0.1:3000             ← Node.js（/www/wwwroot/jian/server）
        ↓
MySQL wxjiankalka
```

API 地址：`https://server.jiankalka.cn/api/v1`

> 主站 `www.jiankalka.cn` 可另做官网，与 API 分离，互不影响。

---

## 二、部署前检查清单

| 项 | 操作 |
|----|------|
| 域名解析 | 添加 **A 记录**：`server` → `182.92.157.86`（API 子域名） |
| 阿里云安全组 | 入方向放行 **80、443**（宝塔面板还需 **8888** 等，按你实际面板端口） |
| 宝塔防火墙 | 放行 **80、443** |
| 微信小程序 | request 合法域名添加 **`https://server.jiankalka.cn`**（仅域名填 `server.jiankalka.cn`） |
| 小程序 AppID/Secret | 与 `server/.env` 中 `WX_APPID`、`WX_SECRET` 一致 |

解析生效验证（本机或服务器）：

```bash
ping server.jiankalka.cn
# 应显示 182.92.157.86
```

---

## 三、宝塔安装运行环境

1. 登录宝塔面板（一般为 `http://182.92.157.86:8888` 或你自定义端口）。
2. **软件商店** 安装：
   - **Nginx**（推荐 1.22+）
   - **MySQL 5.7 / 8.0**
   - **PM2 管理器**（或「Node 版本管理器」+ 自带 PM2）
3. 在 PM2 / Node 管理里安装 **Node.js 18 或 20**（项目要求 `>=18`）。

SSH 验证（可选）：

```bash
node -v   # 应 >= v18
npm -v
```

---

## 四、上传代码到服务器

任选一种方式，目标目录示例：`/www/wwwroot/jiankalka-kaoyan/server`

### 方式 A：Git（推荐）

```bash
cd /www/wwwroot
git clone <你的仓库地址> jiankalka-kaoyan
cd jiankalka-kaoyan/server
```

### 方式 B：宝塔文件管理

1. 本地将项目中的 **`server` 整个文件夹**（含 `package.json`、`src`、`.env.example`）打包为 zip。
2. 上传到 `/www/wwwroot/jiankalka-kaoyan/` 并解压。
3. 最终路径应为：`/www/wwwroot/jiankalka-kaoyan/server/package.json` 存在。

---

## 五、在宝塔创建 MySQL 数据库（必做）

1. 宝塔 → **数据库** → **添加数据库**
2. 建议填写：

| 项 | 示例 |
|----|------|
| 数据库名 | `jiankalka` |
| 用户名 | `jiankalka` |
| 密码 | 强密码（记下来） |
| 访问权限 | 本地服务器 `127.0.0.1` |

3. **只需创建空库**，不需要手动建表；下面 `npm run db:reset` 会自动建表并写入演示数据。

也可在 phpMyAdmin 中导入 `server/src/db/schema.sql`（可选，一般不必）。

---

## 六、配置环境变量

```bash
cd /www/wwwroot/jiankalka-kaoyan/server
cp .env.example .env
nano .env   # 或用宝塔「文件」在线编辑
```

**生产环境 `.env` 示例：**

```env
PORT=3000
NODE_ENV=production

JWT_SECRET=请改成至少32位随机字符串
JWT_EXPIRES_IN=7d

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=jiankalka
MYSQL_PASSWORD=宝塔里设置的数据库密码
MYSQL_DATABASE=jiankalka

WX_APPID=你的小程序AppID
WX_SECRET=你的小程序AppSecret

SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=请改成强密码
```

说明：

- `NODE_ENV=production` 时**必须**配置 `WX_APPID`、`WX_SECRET`，否则微信登录会报错。
- `MYSQL_*` 必须与宝塔数据库一致。
- `DEV_OPENID` 仅本地开发用，生产可删除或留空。
- **切勿**把 `.env` 提交到 Git。

---

## 七、安装依赖并初始化数据库

```bash
cd /www/wwwroot/jiankalka-kaoyan/server
npm install
npm run db:reset
```

成功时会输出 `Migration OK` 与 `Seed OK`。若报 `Access denied`，检查 `.env` 用户名密码与宝塔数据库是否一致。

---

## 八、用 PM2 守护 Node 进程

### 方式 1：宝塔 PM2 管理器（图形界面）

1. 打开 **PM2 管理器** → **添加项目**。
2. 启动文件：`/www/wwwroot/jiankalka-kaoyan/server/src/index.js`
3. 运行目录：`/www/wwwroot/jiankalka-kaoyan/server`
4. 项目名称：`jiankalka-api`
5. 保存并 **启动**。

### 方式 2：SSH 命令行

```bash
cd /www/wwwroot/jiankalka-kaoyan/server
pm2 start src/index.js --name jiankalka-api
pm2 save
pm2 startup   # 按提示执行，实现开机自启
```

**在服务器本机测试（不经过 Nginx）：**

```bash
curl http://127.0.0.1:3000/api/v1/health
```

期望返回：

```json
{"code":0,"message":"ok","data":{"status":"up","time":"..."}}
```

---

## 九、子域名 server.jiankalka.cn（API 专用站点）

### 1. DNS

域名控制台添加 **A 记录**：

| 主机记录 | 记录值 |
|----------|--------|
| `server` | `182.92.157.86` |

### 2. 宝塔添加站点

- **网站** → **添加站点**
- 域名：**`server.jiankalka.cn`**（仅 API，不要和 www 混在一个站里乱配）
- 根目录：随意（如 `/www/wwwroot/server.jiankalka.cn`）
- PHP：**纯静态** 或关闭

### 3. SSL

站点 → **SSL** → **Let's Encrypt** → 勾选 `server.jiankalka.cn` → 申请 → **强制 HTTPS**

### 4. 反向代理（整站转发到 Node）

**反向代理** → 添加：

| 配置项 | 值 |
|--------|-----|
| 代理名称 | `node-api` |
| 目标 URL | `http://127.0.0.1:3000` |
| 发送域名 | `$host` |

或在 **配置文件** 中使用（子域名专用，推荐整站反代）：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

保存 → **重载 Nginx**。关闭该站点的 **防跨站**（若仍 403）。

### 5. 测试

```bash
curl https://server.jiankalka.cn/api/v1/health
```

应返回 `{"code":0,...}`，而不是 HTML 403。

---

## 十、用户注册与登录（小程序）

已支持 **自助注册**，数据写入 MySQL 表 `users`（昵称、手机、姓名、openid 等）。

1. 确保 `.env` 中 `ALLOW_SELF_REGISTER=true`（默认开启）
2. 必须配置生产环境 `WX_APPID`、`WX_SECRET`
3. 小程序「我的」→ **注册** → 填写昵称、手机号 → 提交
4. 已注册用户点 **登录** 即可

**服务器更新代码后**（在 SSH 执行，无需本地配置）：

```bash
cd /www/wwwroot/jiankalka-kaoyan/server
git pull   # 或重新上传 server 目录
npm install
npm run db:migrate    # 补全 real_name、avatar_url 等字段（不删数据）
pm2 restart jiankalka-api
```

小程序用 HBuilderX **重新编译上传** 即可（项目已默认 `ENV=prod` 指向 `https://server.jiankalka.cn/api/v1`）。

关闭自助注册：`.env` 设置 `ALLOW_SELF_REGISTER=false` 后重启 PM2。

管理员账号（种子）：`admin` / 你在 `.env` 里设的 `SEED_ADMIN_PASSWORD`，供后续管理后台使用。

---

## 十一、小程序指向线上 API

编辑 `miniapp/config/index.js`：

```javascript
const ENV = 'prod'   // 发布前改为 prod

const envConfig = {
  dev: { ... },
  prod: {
    baseUrl: 'https://server.jiankalka.cn/api/v1',
    useMock: false
  }
}
```

重新用 HBuilderX 编译上传微信小程序；**不要**再勾选「不校验合法域名」。

微信公众平台 **request 合法域名** 填：`server.jiankalka.cn`（不要带 `https://` 和路径）。

---

## 十二、常用运维命令

```bash
cd /www/wwwroot/jiankalka-kaoyan/server

# 查看日志
pm2 logs jiankalka-api

# 重启
pm2 restart jiankalka-api

# 更新代码后
git pull
npm install
pm2 restart jiankalka-api

# 备份 MySQL（在宝塔「数据库」→ 备份，或命令行）
mysqldump -u jiankalka -p jiankalka > jiankalka_$(date +%F).sql
```

---

## 十三、常见问题

| 现象 | 处理 |
|------|------|
| `curl 127.0.0.1:3000` 正常，域名 502 | PM2 未启动或端口不是 3000；检查 Nginx `proxy_pass` |
| 域名无法访问 | 查 DNS、阿里云安全组、宝塔防火墙 |
| 小程序「不在合法域名列表」 | 公众平台配置域名 + 使用 `https` + `ENV=prod` |
| 登录提示「账号未开通」 | 在 `users` 表插入该微信 `openid` 的学员 |
| 登录 500 / 微信错误 | 检查 `WX_APPID`、`WX_SECRET`、服务器能否访问 `api.weixin.qq.com` |
| MySQL 连接失败 / Access denied | 检查 `.env` 的 `MYSQL_*` 与宝塔数据库账号；库是否已创建 |

---

## 十四、安全建议

1. 修改默认管理员密码；`JWT_SECRET` 使用长随机串。
2. 宝塔面板使用强密码 + 修改默认端口 + 可选 IP 白名单。
3. **不要**对公网开放 `3000` 端口，仅 Nginx 反代本机 `127.0.0.1:3000`。
4. 定期在宝塔备份 MySQL 数据库 `jiankalka`。
5. 上线前在 `.env` 删除或忽略 `DEV_OPENID` 相关依赖。

---

## 十五、快速自测命令汇总（在服务器 SSH 执行）

```bash
# 1. 进程与本地 API
curl -s http://127.0.0.1:3000/api/v1/health

# 2. 经 Nginx + HTTPS
curl -s https://server.jiankalka.cn/api/v1/health

# 3. 管理员登录（验证 JWT）
curl -s -X POST https://server.jiankalka.cn/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"你的密码"}'
```

全部正常后，即可在小程序真机/体验版联调。

---

## 十六、网页管理后台（部署在 www）

**`https://www.jiankalka.cn/manage/login.html`**

| 项 | 说明 |
|----|------|
| 静态源码 | `website/static-test/manage/` |
| 部署 | 与官网一并上传 `website/static-test/`，见 [website/static-test/README.md](../website/static-test/README.md) |
| API | `https://server.jiankalka.cn/api/v1`（`login.html` 内 `meta admin-api-base`） |
| 登录接口 | `POST /api/v1/auth/admin-login` |

`server` 仅提供 API，不再托管 `/admin`。服务端更新见 [server/SERVER-UPDATE.md](../server/SERVER-UPDATE.md)。
