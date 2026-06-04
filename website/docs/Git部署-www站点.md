# 通过 Git 部署 www 静态站

适用于：代码推送到 GitHub/Gitee 后，在服务器 `git pull` 更新官网。

**仓库示例**：`https://github.com/TiAmo-99/wxjiankalka`

**宝塔 HTML 站点根目录**：`/www/wwwroot/www.jiankalka.cn`  
**API Node 项目**（另管）：`/www/wwwroot/jian/server`

---

## 一、本机：提交并推送代码

在项目根目录（含 `miniapp/`、`server/`、`website/`）执行：

```bash
cd D:\Desktop\NewProject\cursor\uniapp\jiankalka-kaoyan

git status
git add website/static-test website/docs website/README.md
# 若有其它已改文件按需 git add

git commit -m "feat(website): 添加 static-test 公网测试页与部署文档"
git push origin main
```

> 分支名可能是 `main` 或 `master`，以你仓库为准：`git branch`

---

## 二、服务器：首次克隆（只做一次）

SSH 登录服务器，或使用 **宝塔 → 终端**。

### 方式 A：整库克隆（推荐，与 server 同级）

```bash
cd /www/wwwroot/jian

# 若目录已存在可跳过 clone，改做「三、日常更新」
git clone https://github.com/TiAmo-99/wxjiankalka.git repo
cd repo
```

克隆后测试页路径为：

```text
/www/wwwroot/jian/repo/website/static-test/
```

### 方式 B：服务器上已有 server，仅补拉整库

若你之前只上传了 `server` 文件夹、没有 Git 整库，建议仍用 **方式 A** 克隆到 `repo`，以后 `server` 与 `website` 都在同一仓库里更新。

---

## 三、发布测试站到 www（二选一）

### 方案 1：改宝塔网站根目录（推荐，pull 即生效）

1. 宝塔 → **网站** → **HTML项目** → 点击 `www.jiankalka.cn` → **设置**
2. **网站目录 / 根目录** 改为：
   ```text
   /www/wwwroot/jian/repo/website/static-test
   ```
3. 保存后访问：`https://www.jiankalka.cn/`

以后只需：

```bash
cd /www/wwwroot/jian/repo
git pull
```

无需复制文件。

---

### 方案 2：根目录仍为 www.jiankalka.cn，用脚本同步

保持宝塔根目录为 `/www/wwwroot/www.jiankalka.cn`，每次 pull 后执行：

```bash
cd /www/wwwroot/jian/repo
git pull
bash website/scripts/deploy-www.sh
```

脚本会把 `website/static-test/` 同步到 `/www/wwwroot/www.jiankalka.cn/`。

---

## 四、日常更新（每次改完代码推送后）

**本机**

```bash
git add .
git commit -m "update website"
git push
```

**服务器**

```bash
cd /www/wwwroot/jian/repo
git pull origin main
```

- 使用 **方案 1**：pull 完成即可，刷新浏览器  
- 使用 **方案 2**：再执行 `bash website/scripts/deploy-www.sh`

---

## 五、私有仓库 / 免密拉取

### HTTPS + 令牌

```bash
git clone https://<用户名>:<GitHub_PAT>@github.com/TiAmo-99/wxjiankalka.git repo
```

### SSH（推荐）

1. 服务器生成密钥：`ssh-keygen -t ed25519 -C "server-jiankalka"`  
2. 把 `~/.ssh/id_ed25519.pub` 加到 GitHub → Settings → SSH keys  
3. 克隆：`git clone git@github.com:TiAmo-99/wxjiankalka.git repo`

---

## 六、验证清单

| 检查 | 命令或操作 |
|------|------------|
| 代码已更新 | `cd /www/wwwroot/jian/repo && git log -1 --oneline` |
| 文件存在 | `ls /www/wwwroot/jian/repo/website/static-test/index.html` |
| 公网访问 | 浏览器打开 `https://www.jiankalka.cn/` |
| 样式正常 | 页面非纯白、无 404（说明 css/js 路径正确） |

---

## 七、常见问题

**Q：`git pull` 提示权限不够**  
A: 使用 SSH 或 PAT；不要用他人账号。

**Q：pull 后页面没变**  
A: 强制刷新 `Ctrl+F5`；确认宝塔根目录指向 `static-test` 或已执行 `deploy-www.sh`。

**Q：只有 server 没有整库**  
A: 按「二、方式 A」克隆 `repo`，Node 项目可逐步改到 `repo/server` 再改 PM2 路径（可选）。

**Q：以后 Vue 正式站**  
A: 在服务器 `cd website/web && npm run build`，再把 `dist/` 同步到 www 根目录，或把根目录改到 `dist`（方案 1 同理）。

---

## 八、目录关系示意

```text
/www/wwwroot/jian/
├── server/              ← 现有 Node API（PM2）
└── repo/                ← git clone 整库
    ├── miniapp/
    ├── server/          ← 可与上面 server 二选一统一
    └── website/
        └── static-test/ ← 测试站源码（方案1 直接作网站根目录）

/www/wwwroot/www.jiankalka.cn/   ← 方案2 时由脚本同步目标
```
