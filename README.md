# ⚽ 2026 World Cup Prediction League / 2026 世界杯预测大赛

和朋友一起预测世界杯比分、自动算钱排名的小网站。
页面是 GitHub Pages 静态托管，数据存在 Supabase 免费数据库里：
朋友在网页上直接提交预测（无需任何账号），提交即由数据库锁定（只许新增、禁止改删）；
管理员在「录入赛果」页用 Supabase 账号登录后直接保存赛果，立即生效，无需 git 操作。

界面默认英文，右上角「中文 / EN」按钮随时切换（选择记在浏览器里）。
球队名以英文为标准写进数据文件，中文界面自动翻译显示；管理员录入淘汰赛对阵时请填英文队名（输入框有自动补全）。

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
| 朋友 | 打开网页 →「填写预测」→ 下拉框选自己（固定七人：RiT/ST/RT/ArP/AP/SP/NP）→ 填比分 → 点提交，完事。可一场一场提交；已提交场次数据库直接锁死，已出赛果场次拒收 |
| 你（管理员） | 比赛结束后在「录入赛果」页登录（Supabase 用户邮箱+密码）→ 填比分 → 点保存，立即生效 |

- 淘汰赛对阵确定后，在「录入赛果」页对应场次填上两队英文名（输入框带 48 队自动补全）再保存，**不用改 matches.js**。
- 草稿自动存浏览器 localStorage，朋友没填完下次接着填。
- 锁定是数据库强制的：`predictions` 表对匿名用户只开放 INSERT（且唯一约束 player+match_id、已出赛果场次由 RLS 策略拒绝），UPDATE/DELETE 一律拒绝。

## 奖金规则（可在 `js/app.js` 顶部修改）

- 比分完全猜对：**其他每人给他 1 元**（7 人局即 +6）；没猜中的人给这场猜中的每个人 1 元
- 排行榜显示净收支，可以是负数；只猜对胜负也算没中
- 淘汰赛按 90 分钟 + 加时的比分计算，点球不计入。

## 数据存储

| 位置 | 内容 | 谁改 |
|------|------|------|
| `data/matches.js`（仓库内） | 104 场赛程（已内置 2026 真实赛程与官方场次编号） | 基本不用动 |
| Supabase `predictions` 表 | 所有人的预测 | 朋友在页面上提交（匿名 INSERT-only） |
| Supabase `results` 表 | 真实比分 + 淘汰赛对阵 | 管理员登录后在页面上保存 |

Supabase 的 Project URL 和 anon key 写在 `js/app.js` 顶部（anon key 本来就是公开的，配合 RLS 策略使用，放前端没有风险）。

> 注：赛程日期为大致比赛日（来源按英国时间整理），与北京时间可能差一天，仅作参考，不影响算分。
> 玩家固定为 RiT / ST / RT / ArP / AP / SP / NP 七人，想增减人改 `js/app.js` 顶部的 `PLAYERS`，并在 `data/predictions.js` 里加对应空记录。
