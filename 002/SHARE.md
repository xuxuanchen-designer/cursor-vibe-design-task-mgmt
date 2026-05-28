# 分享给他人访问

## 当前公网链接（临时）

在本地服务与隧道进程保持运行时可访问：

**https://3c9e488fdf93a3.lhr.life**

> 说明：这是 [localhost.run](https://localhost.run) 免费隧道，链接在关闭终端或断网后会失效；重新执行下方「重新开启分享」会得到新地址。

---

## 重新开启分享

在项目目录执行（需两个终端，或一个终端里先后台运行）：

```bash
# 终端 1：静态服务
cd "/Users/haoting/Documents/cursor vibe design"
python3 -m http.server 5173

# 终端 2：公网隧道（复制输出里的 https://xxx.lhr.life 链接）
ssh -o StrictHostKeyChecking=no -R 80:localhost:5173 nokey@localhost.run
```

---

## 长期稳定链接（推荐）

将 `index.html`、`app.js` 部署到任一静态托管即可，例如：

| 方式 | 操作 |
|------|------|
| [Netlify Drop](https://app.netlify.com/drop) | 拖拽整个文件夹，获得 `*.netlify.app` 永久链接 |
| GitHub Pages | 推送到仓库 → Settings → Pages → 选分支 |
| 公司内网服务器 | 把文件放到 Nginx/对象存储静态目录 |

部署后他人通过 `https://你的域名/index.html` 访问，无需你的电脑在线。
