# 上传 server 到云服务器（操作说明）

## 需要上传的文件（仅此几样）

```
server/
├── package.json
├── package-lock.json
├── .npmrc
├── .env.example
├── src/              ← 含管理 API 与 /admin 静态托管
├── public/admin/     ← 可在服务器 build 生成，也可本地 build 后上传
└── UPLOAD.md

admin-web/              ← 管理页源码（在 server 目录内）
├── package.json
├── src/
└── vite.config.js
```

**不要上传：** `node_modules`、`.env`、`data/`、日志、`admin-web/node_modules`

**可删除：** 服务器上旧的 `/www/wwwroot/jian/admin` 目录、宝塔 `admin.jiankalka.cn` 站点

---

## 一、本地打包

1. 确认没有 `node_modules` 文件夹  
2. 将 `server` 文件夹打成 **server.zip**（不要包含上面的排除项）

---

## 二、上传到宝塔

1. 宝塔 → **文件** → 进入 `/www/wwwroot/jiankalka-kaoyan/`（没有就新建）  
2. 上传 **server.zip** → **解压**  
3. 得到路径：`/www/wwwroot/jiankalka-kaoyan/server/`

---

## 三、服务器上配置 .env

宝塔 → **终端**：

```bash
cd /www/wwwroot/jiankalka-kaoyan/server
cp .env.example .env
nano .env
```

必改项：

| 变量 | 说明 |
|------|------|
| MYSQL_PASSWORD | 宝塔数据库密码 |
| WX_APPID | 小程序 AppID |
| WX_SECRET | 小程序 AppSecret |
| JWT_SECRET | 随机长字符串 |
| SEED_ADMIN_PASSWORD | 管理员密码（可选） |
| SMTP_* / MAIL_FROM | 邮箱提醒（见 `docs/email-remind.md`） |

保存后确认：

```bash
grep MYSQL_ .env
```

---

## 四、安装依赖并建表

若 `npm install` 报 404、URL 含 `mirrors.tuna.tsinghua.edu.cn/nodejs-release`，说明 **npm 源配错**（不是 Node 装好了就行）。在宝塔 **Node 版本管理器** 把 **registry 源** 改为 `https://registry.npmmirror.com`，然后执行：

```bash
cd /www/wwwroot/jian/server
bash install.sh
npm run db:migrate
```

或手动：

```bash
echo "registry=https://registry.npmmirror.com" > .npmrc
npm install --registry=https://registry.npmmirror.com
```

看到 `Migration OK: wxjiankalka` 即成功。

---

## 五、宝塔 Node 项目

1. **网站** → **Node 项目** → **添加**  
2. 项目路径：`/www/wwwroot/jiankalka-kaoyan/server`  
3. 启动文件：`src/index.js`  
4. 端口：`3000`  
5. Node 版本：**v20**  
6. 点击 **启动**

测试：

```bash
curl http://127.0.0.1:3000/api/v1/health
```

---

## 六、域名（若未配置）

网站 → 你的站点 → **反向代理** → `http://127.0.0.1:3000`  
或 Node 项目里绑定 `www.jiankalka.cn` + SSL。

外网测试（API 子域名）：

```bash
curl https://server.jiankalka.cn/api/v1/health
```

---

## 七、小程序

HBuilderX 重新编译上传；`miniapp/config/index.js` 已是 `ENV=prod` 指向线上 API。

---

## 八、网页管理后台（已集成在 server，无需 admin 域名）

管理页与 API **同一域名、同一 Node 进程**：

**`https://server.jiankalka.cn/admin/#/login`**

服务器执行（只需一个 `server` 目录）：

```bash
export PATH=/www/server/nodejs/v20.18.3/bin:$PATH
cd /www/wwwroot/jian/server
npm install --registry=https://registry.npmmirror.com
cd admin-web && npm install --registry=https://registry.npmmirror.com && cd ..
npm run db:migrate
npm run build:admin
ls public/admin/index.html
pm2 restart jiankalka-api
```

启动日志应有：`[admin] static at /admin -> .../public/admin`

验证：

```bash
curl -sI https://server.jiankalka.cn/admin/
curl -s -X POST https://server.jiankalka.cn/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"你的密码"}'
```

---

## 常见问题

| 现象 | 处理 |
|------|------|
| 管理登录「账号或密码错误」 | 密码以**数据库里哈希为准**，不一定等于你此刻输入的。在服务器执行：`npm run admin:reset-password` 或 `npm run admin:reset-password -- 新密码`（见下） |
| MySQL 连接失败 | 检查 `.env` 与宝塔库名 `wxjiankalka`、用户、密码 |
| 端口占用 | 改 `.env` 的 `PORT` 或停掉占用 3000 的进程 |
| 表不存在 | 再执行 `npm run db:migrate` |

### 重置管理员密码（不删学员）

```bash
cd /www/wwwroot/jian/server
grep SEED_ADMIN .env
npm run admin:reset-password
# 或指定密码：node src/db/reset-admin.js admin1234
```

按终端输出的账号密码登录。

### 批量导入任务（Excel）

管理后台侧栏 **批量导入**：下载模板 → 填写 → 上传。  
更新后需 `npm install`（新增 `xlsx`、`multer`）并 `npm run build:admin`。

### 学习上报查询与导出

侧栏 **学习上报**：按日期范围筛选、分页查看、导出 Excel。
