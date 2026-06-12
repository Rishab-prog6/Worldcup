# ⚽ 2026 世界杯预测大赛

和朋友一起预测世界杯比分、自动算分排名的纯静态小网站。
无需后端、无需数据库，所有数据就是 `data/` 目录下的三个 JS 文件，直接部署到 GitHub Pages。

## 本地打开

直接双击 `index.html` 就能用（数据用 `<script>` 引入，不依赖 fetch，无跨域问题）。

## 部署到 GitHub Pages

```bash
git add -A
git commit -m "init: world cup prediction site"
# 在 GitHub 新建仓库（比如 wc2026），然后：
git remote add origin https://github.com/<你的用户名>/wc2026.git
git push -u origin main
```

然后在仓库 **Settings → Pages → Source** 选 `main` 分支根目录，保存。
几分钟后访问 `https://<你的用户名>.github.io/wc2026/` 即可，把链接发给朋友。

## 玩法 / 日常维护

| 角色 | 做什么 |
|------|--------|
| 朋友 | 打开网页 →「填写预测」→ 下拉框选自己（固定七人：RiT/ST/RT/ArP/AP/SP/NP）→ 填比分 → 点「生成 predictions.js 并复制」→ 把内容发给你。可一场一场提交；已提交场次锁定，已出赛果场次不能再提交 |
| 你（管理员） | 用收到的内容替换 `data/predictions.js`，提交推送；每天比赛结束后在「录入赛果」页填真实比分 → 生成并替换 `data/results.js` → 推送 |

- 淘汰赛对阵确定后，在「录入赛果」页对应场次填上两队名字（输入框带 48 队自动补全），导出 results.js 即可，**不用改 matches.js**。
- 草稿自动存浏览器 localStorage，朋友没填完下次接着填。
- 「锁定」由页面逻辑保证：导出时已提交的场次永远保持原值、只追加新场次。管理员合并文件时留意别用旧文件覆盖新预测。

## 奖金规则（可在 `js/app.js` 顶部修改）

- 比分完全猜对：**+1 元**
- 猜错（包括只猜对胜负）：**0 元**
- 淘汰赛按 90 分钟 + 加时的比分计算，点球不计入。

## 数据文件

| 文件 | 内容 | 谁改 |
|------|------|------|
| `data/matches.js` | 104 场赛程（已内置 2026 真实赛程与官方场次编号） | 基本不用动 |
| `data/predictions.js` | 所有人的预测 | 管理员粘贴朋友发来的内容 |
| `data/results.js` | 真实比分、淘汰赛对阵、冠军 | 管理员通过页面生成 |

> 注：赛程日期为大致比赛日（来源按英国时间整理），与北京时间可能差一天，仅作参考，不影响算分。
> 玩家固定为 RiT / ST / RT / ArP / AP / SP / NP 七人，想增减人改 `js/app.js` 顶部的 `PLAYERS`，并在 `data/predictions.js` 里加对应空记录。
