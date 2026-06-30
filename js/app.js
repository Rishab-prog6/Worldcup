/* 2026 World Cup Prediction League — core logic
 * Data lives in Supabase: friends submit predictions straight from the page
 * (no account needed); the database enforces locking (insert-only, no edits).
 * The admin signs in on the "Enter Results" tab to record real scores. */
(function () {
  "use strict";

  // ===== Supabase config =====
  var SB_URL = "https://bhovsbvijzlqfdwgulcc.supabase.co";
  var SB_KEY = "sb_publishable_D1HzrfwZDBKJi_j-FZW_YA_uO8qG1tU";

  // ===== Scoring (unit = RMB) =====
  // Exact score → every OTHER player pays the hitter this amount.
  // Leaderboard shows each player's net balance (can go negative).
  var PT_EXACT = 1;

  // ===== Fixed roster =====
  var PLAYERS = ["RiT", "ST", "RT", "ArP", "AP", "SP", "NP"];

  var MATCHES = window.WC_MATCHES || [];
  var TEAMS = window.WC_TEAMS || [];
  var STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"];

  // filled from Supabase
  var PREDICTIONS = {};
  var RESULTS = { scores: {}, teams: {} };

  // ===== i18n =====
  var LANG_KEY = "wc2026_lang";
  var LANG = localStorage.getItem(LANG_KEY) || "en";

  var TEAM_ZH = {
    "Mexico": "墨西哥", "South Korea": "韩国", "South Africa": "南非", "Czechia": "捷克",
    "Canada": "加拿大", "Switzerland": "瑞士", "Qatar": "卡塔尔", "Bosnia & Herzegovina": "波黑",
    "Brazil": "巴西", "Morocco": "摩洛哥", "Haiti": "海地", "Scotland": "苏格兰",
    "USA": "美国", "Paraguay": "巴拉圭", "Australia": "澳大利亚", "Turkey": "土耳其",
    "Germany": "德国", "Ivory Coast": "科特迪瓦", "Ecuador": "厄瓜多尔", "Curacao": "库拉索",
    "Netherlands": "荷兰", "Sweden": "瑞典", "Tunisia": "突尼斯", "Japan": "日本",
    "Belgium": "比利时", "Egypt": "埃及", "Iran": "伊朗", "New Zealand": "新西兰",
    "Spain": "西班牙", "Cape Verde": "佛得角", "Saudi Arabia": "沙特", "Uruguay": "乌拉圭",
    "France": "法国", "Senegal": "塞内加尔", "Iraq": "伊拉克", "Norway": "挪威",
    "Argentina": "阿根廷", "Algeria": "阿尔及利亚", "Austria": "奥地利", "Jordan": "约旦",
    "Portugal": "葡萄牙", "DR Congo": "刚果(金)", "Uzbekistan": "乌兹别克斯坦", "Colombia": "哥伦比亚",
    "England": "英格兰", "Croatia": "克罗地亚", "Ghana": "加纳", "Panama": "巴拿马"
  };

  var I18N = {
    en: {
      doc_title: "2026 World Cup Prediction League",
      title: "⚽ 2026 World Cup Prediction League 🏆",
      subtitle: "USA · Canada · Mexico · Jun 11 – Jul 19 · 48 teams · 104 matches",
      tab_board: "🏆 Leaderboard", tab_matches: "📅 Fixtures", tab_predict: "✍️ My Predictions",
      tab_admin: "🛠️ Enter Results", tab_rules: "📖 Rules",
      footer: "Static site + Supabase · hosted on GitHub Pages",
      stage_group: "Group Stage", stage_r32: "Round of 32", stage_r16: "Round of 16",
      stage_qf: "Quarter-finals", stage_sf: "Semi-finals", stage_third: "Third-place Match", stage_final: "Final",
      unit: "RMB",
      loading: "Loading…",
      toast_load_failed: "Couldn't load data — check your network and refresh",
      board_empty: "No predictions yet — head to “My Predictions” and submit the first one!",
      bars_title: "Net balance (RMB)",
      detail_title: "Details ({a} / {b} played)",
      th_rank: "Rank", th_player: "Player", th_money: "Net (RMB)", th_exact: "Exact scores", th_predicted: "Predicted",
      legend: 'Legend: <span class="pred hit3">2-1</span> exact — everyone else pays them 1 RMB <span class="pred hit0">0-2</span> miss <span class="pred wait">3-1</span> not played yet',
      th_no: "#", th_date: "Date", th_fixture: "Fixture", th_result: "Result",
      pending: "–", tbd: "TBD",
      group_title: "Group {g}",
      predict_title: "✍️ My Predictions",
      who_label: "I am", who_placeholder: "— select your name —",
      predict_hint: "Pick your name, fill in any matches you like and hit <b>🚀 Submit</b> — done, no account needed. " +
        "Whatever you fill in is what you submit; the rest can wait for another day. " +
        "🔒 Submitted matches are locked for good — the database refuses any change; " +
        "⛔ once a match kicks off (Beijing time shown) it closes automatically — no more submissions, no peeking at the live score. Drafts auto-save in this browser.",
      mark_submitted: " · 🔒Submitted", mark_finished: " · ⛔Finished", mark_started: " · ⛔Kicked off",
      btn_submit: "🚀 Submit", btn_clear_draft: "Clear draft",
      toast_pick_name: "Pick your name first", toast_nothing: "Nothing new to submit",
      toast_submitting: "Submitting…",
      toast_submit_ok: "{n} prediction(s) submitted ✔",
      toast_submit_locked: "{n} match(es) already locked — not changed",
      toast_submit_failed: "{n} failed (network) — try again",
      toast_draft_cleared: "Draft cleared",
      admin_title: "🛠️ Enter Results (admin)",
      admin_hint: "Enter real scores; for knockout matches type the two team names once the pairing is known " +
        "(English names, autocomplete from the 48 teams). Click 💾 Save — changes go live for everyone right away.",
      admin_login_hint: "Admin sign-in (Supabase user)",
      ph_email: "Email", ph_password: "Password",
      btn_login: "Sign in", btn_logout: "Sign out",
      toast_login_failed: "Sign-in failed — check email / password",
      toast_logged_in: "Signed in ✔",
      ph_home: "Home", ph_away: "Away",
      btn_save_res: "💾 Save results",
      toast_res_saved: "Results saved ✔",
      toast_res_failed: "Save failed — try signing in again",
      toast_nothing_save: "Nothing to save",
      rules_html:
        '<div class="card"><h2>📖 Rules</h2>' +
        '<ul class="rules-list">' +
        '<li><span class="pt pt-3">+1 each</span> Exact score (you said 2-1, it ended 2-1) — <b>every other player pays you 1 RMB</b> (with 7 players that\'s +6)</li>' +
        '<li><span class="pt pt-0">pay up</span> Miss — you pay 1 RMB to each player who nailed that match; the right winner with the wrong score counts as a miss too</li>' +
        '<li>The leaderboard shows everyone\'s net balance, so it can go negative 📉</li>' +
        "</ul>" +
        "<h3>Knockout rounds</h3>" +
        '<ul class="rules-list plain">' +
        "<li>Scores count at the end of 90 minutes + extra time; penalty shoot-outs don't change the score.</li>" +
        "<li>E.g. you predict 1-1 (betting on a shoot-out) and it's 1-1 after extra time → exact score, +1 RMB.</li>" +
        "<li>Knockout fixtures open for predictions once the two teams are known.</li>" +
        "</ul>" +
        "<h3>How to play</h3>" +
        '<ol class="rules-list plain">' +
        "<li>On “My Predictions”, pick your name (only RiT / ST / RT / ArP / AP / SP / NP), fill in scores and hit Submit — no account needed.</li>" +
        "<li>Submit as few or as many matches as you like, whenever you like. <b>Once submitted, a match is locked — the database refuses edits. Matches with a recorded result can't be submitted.</b></li>" +
        "<li>Between kickoff and the result being entered, please behave 😄 — honour system.</li>" +
        "</ol></div>",
      cfg_missing: "⚠️ Supabase key not configured yet — submissions are disabled."
    },
    zh: {
      doc_title: "2026 世界杯预测大赛",
      title: "⚽ 2026 世界杯预测大赛 🏆",
      subtitle: "美加墨 · 6月11日 — 7月19日 · 48 队 104 场",
      tab_board: "🏆 排行榜", tab_matches: "📅 赛程 & 预测", tab_predict: "✍️ 填写预测",
      tab_admin: "🛠️ 录入赛果", tab_rules: "📖 规则",
      footer: "静态页面 + Supabase · 部署在 GitHub Pages",
      stage_group: "小组赛", stage_r32: "32强 · 1/16决赛", stage_r16: "16强 · 1/8决赛",
      stage_qf: "1/4决赛", stage_sf: "半决赛", stage_third: "季军赛", stage_final: "决赛",
      unit: "元",
      loading: "加载中…",
      toast_load_failed: "数据加载失败，请检查网络后刷新",
      board_empty: "还没有任何预测数据，去「填写预测」页提交第一份吧！",
      bars_title: "净收支（元）",
      detail_title: "明细（已完赛 {a} / {b} 场）",
      th_rank: "排名", th_player: "玩家", th_money: "净收支(元)", th_exact: "比分全对", th_predicted: "已预测场次",
      legend: '图例：<span class="pred hit3">2-1</span> 比分全对·其他每人给他1元 <span class="pred hit0">0-2</span> 没猜中 <span class="pred wait">3-1</span> 未开赛',
      th_no: "场次", th_date: "日期", th_fixture: "对阵", th_result: "赛果",
      pending: "未赛", tbd: "待定",
      group_title: "{g} 组",
      predict_title: "✍️ 填写我的预测",
      who_label: "我的名字", who_placeholder: "— 我是谁 —",
      predict_hint: "选自己的名字，想填哪场填哪场，点 <b>🚀 提交</b> 即可——不需要注册任何账号。" +
        "填了就能交，没填的以后再来。🔒 已提交的场次永久锁定，数据库直接拒绝修改；" +
        "⛔ 比赛一开球（显示北京时间）就自动锁定，不能再提交，杜绝看着直播下注。草稿自动存在本机浏览器。",
      mark_submitted: " · 🔒已提交", mark_finished: " · ⛔已结束", mark_started: " · ⛔已开赛",
      btn_submit: "🚀 提交", btn_clear_draft: "清空草稿",
      toast_pick_name: "请先选择你是谁", toast_nothing: "没有新的预测可提交",
      toast_submitting: "提交中…",
      toast_submit_ok: "成功提交 {n} 场 ✔",
      toast_submit_locked: "{n} 场已锁定，未改动",
      toast_submit_failed: "{n} 场提交失败（网络问题），请重试",
      toast_draft_cleared: "草稿已清空",
      admin_title: "🛠️ 录入赛果（管理员用）",
      admin_hint: "填真实比分；淘汰赛对阵确定后在左边填两队英文名（48 队自动补全）。" +
        "点 💾 保存后立即对所有人生效。",
      admin_login_hint: "管理员登录（Supabase 账号）",
      ph_email: "邮箱", ph_password: "密码",
      btn_login: "登录", btn_logout: "退出登录",
      toast_login_failed: "登录失败，请检查邮箱/密码",
      toast_logged_in: "已登录 ✔",
      ph_home: "主队", ph_away: "客队",
      btn_save_res: "💾 保存赛果",
      toast_res_saved: "赛果已保存 ✔",
      toast_res_failed: "保存失败，请重新登录后再试",
      toast_nothing_save: "没有可保存的内容",
      rules_html:
        '<div class="card"><h2>📖 奖金规则</h2>' +
        '<ul class="rules-list">' +
        '<li><span class="pt pt-3">每人+1</span> 比分完全猜对（如预测 2-1，实际 2-1）——<b>其他每个人都要给你 1 元</b>（7 人局就是 +6 元）</li>' +
        '<li><span class="pt pt-0">掏钱</span> 没猜中——这场谁猜中了你就给谁 1 元；只猜对胜负也算没中</li>' +
        "<li>排行榜显示每个人的净收支，所以可能是负数 📉</li>" +
        "</ul>" +
        "<h3>淘汰赛说明</h3>" +
        '<ul class="rules-list plain">' +
        "<li>淘汰赛按「90 分钟 + 加时」结束时的比分计算，点球大战不计入比分。</li>" +
        "<li>例如预测 1-1（即认为会拖入点球），实际加时后 1-1，则比分全对。</li>" +
        "<li>淘汰赛对阵确定后才开放预测，请及时来填。</li>" +
        "</ul>" +
        "<h3>怎么玩</h3>" +
        '<ol class="rules-list plain">' +
        "<li>在「填写预测」页下拉框选自己（仅限 RiT / ST / RT / ArP / AP / SP / NP 七人），填比分点提交——不需要注册账号。</li>" +
        "<li>可以一场一场提交：填几场交几场。<b>提交即永久锁定，数据库拒绝任何修改；已出赛果的场次不能再提交。</b></li>" +
        "<li>开赛后、管理员还没录比分前的空档请自觉别钻 😄，朋友间诚信第一。</li>" +
        "</ol></div>",
      cfg_missing: "⚠️ Supabase key 还没配置，暂时无法提交。"
    }
  };

  function t(k) {
    var d = I18N[LANG] || I18N.en;
    return d[k] != null ? d[k] : (I18N.en[k] != null ? I18N.en[k] : k);
  }
  function tn(team) { return LANG === "zh" ? (TEAM_ZH[team] || team) : team; }

  var MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  // a match is "started" once its kickoff time has passed (predictions then close)
  function started(m) {
    return m.kickoff ? Date.now() >= new Date(m.kickoff).getTime() : false;
  }
  function dateText(m) {
    if (m.kickoff) {
      // show in Beijing time (UTC+8); read UTC fields of the shifted instant
      var b = new Date(new Date(m.kickoff).getTime() + 8 * 3600 * 1000);
      var mo = b.getUTCMonth() + 1, day = b.getUTCDate();
      var time = pad2(b.getUTCHours()) + ":" + pad2(b.getUTCMinutes());
      return LANG === "zh" ? (mo + "月" + day + "日 " + time) : (MONTHS_EN[mo - 1] + " " + day + " " + time);
    }
    var d = m.date;
    if (LANG === "zh") return d;
    var mt = /(\d+)月(\d+)日/.exec(d || "");
    return mt ? MONTHS_EN[+mt[1] - 1] + " " + mt[2] : d;
  }

  function slotText(code) {
    var m;
    if ((m = /^1([A-L])$/.exec(code))) return LANG === "zh" ? m[1] + "组第一" : "Group " + m[1] + " winner";
    if ((m = /^2([A-L])$/.exec(code))) return LANG === "zh" ? m[1] + "组第二" : "Group " + m[1] + " runner-up";
    if ((m = /^3([A-L]+)$/.exec(code))) {
      var gs = m[1].split("").join("/");
      return LANG === "zh" ? gs + "组第三" : "3rd of " + gs;
    }
    if ((m = /^W(\d+)$/.exec(code))) return LANG === "zh" ? m[1] + "场胜者" : "Winner of #" + m[1];
    if ((m = /^L(\d+)$/.exec(code))) return LANG === "zh" ? m[1] + "场负者" : "Loser of #" + m[1];
    return code;
  }
  function labelOf(m) { return m.slots ? slotText(m.slots[0]) + " vs " + slotText(m.slots[1]) : t("tbd"); }

  // ===== Helpers =====
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._tm);
    toast._tm = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }
  function fmt(key, n) { return t(key).replace("{n}", n); }

  // ===== Supabase REST =====
  var TOKEN_KEY = "wc2026_admin_token";
  function cfgOk() { return SB_KEY.indexOf("PASTE") === -1; }
  function sbFetch(path, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    opts.headers.apikey = SB_KEY;
    if (!opts.headers.Authorization) opts.headers.Authorization = "Bearer " + SB_KEY;
    if (opts.body) opts.headers["Content-Type"] = "application/json";
    return fetch(SB_URL + path, opts);
  }

  function fetchData() {
    return Promise.all([
      sbFetch("/rest/v1/predictions?select=player,match_id,home,away").then(function (r) {
        if (!r.ok) throw new Error("predictions " + r.status);
        return r.json();
      }),
      sbFetch("/rest/v1/results?select=match_id,home,away,team_home,team_away").then(function (r) {
        if (!r.ok) throw new Error("results " + r.status);
        return r.json();
      })
    ]).then(function (data) {
      PREDICTIONS = {};
      PLAYERS.forEach(function (n) { PREDICTIONS[n] = { scores: {} }; });
      data[0].forEach(function (row) {
        if (PREDICTIONS[row.player]) PREDICTIONS[row.player].scores[row.match_id] = [row.home, row.away];
      });
      RESULTS = { scores: {}, teams: {} };
      data[1].forEach(function (row) {
        if (row.home != null && row.away != null) RESULTS.scores[row.match_id] = [row.home, row.away];
        if (row.team_home && row.team_away) RESULTS.teams[row.match_id] = [row.team_home, row.team_away];
      });
    });
  }

  // ===== Data accessors =====
  function teamsOf(m) {
    var tt = (RESULTS.teams || {})[m.id];
    if (tt && tt[0] && tt[1]) return { home: tt[0], away: tt[1], known: true };
    if (m.home && m.away) return { home: m.home, away: m.away, known: true };
    return { home: "", away: "", known: false };
  }
  function resultOf(m) {
    var r = (RESULTS.scores || {})[m.id];
    return (r && r.length === 2 && r[0] != null && r[1] != null) ? r : null;
  }
  function predOf(player, m) {
    var p = PREDICTIONS[player];
    if (!p || !p.scores) return null;
    var v = p.scores[m.id] != null ? p.scores[m.id] : p.scores[String(m.id)];
    return (v && v.length === 2 && v[0] != null && v[1] != null) ? v : null;
  }
  function isExact(pred, res) {
    if (!pred || !res) return null;
    return pred[0] === res[0] && pred[1] === res[1];
  }

  // ===== Leaderboard =====
  function computeBoard() {
    var bal = {}, exact = {}, predicted = {};
    PLAYERS.forEach(function (n) { bal[n] = 0; exact[n] = 0; predicted[n] = 0; });
    MATCHES.forEach(function (m) {
      var res = resultOf(m);
      PLAYERS.forEach(function (n) { if (predOf(n, m)) predicted[n]++; });
      if (!res) return;
      var hitters = PLAYERS.filter(function (n) { return isExact(predOf(n, m), res); });
      hitters.forEach(function (h) {
        exact[h]++;
        PLAYERS.forEach(function (p) {
          if (p === h) return;
          bal[h] += PT_EXACT;
          bal[p] -= PT_EXACT;
        });
      });
    });
    return PLAYERS.map(function (name) {
      return { name: name, total: bal[name], exact: exact[name], predicted: predicted[name] };
    }).sort(function (a, b) {
      return b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name);
    });
  }

  function renderBoard() {
    var board = computeBoard();
    var el = $("#tab-board");
    var medals = ["🥇", "🥈", "🥉"];
    var podium = '<div class="podium">' + board.slice(0, 3).map(function (p, i) {
      return '<div class="spot' + (i === 0 ? " first" : "") + '">' +
        '<div class="medal">' + medals[i] + '</div>' +
        '<div class="name">' + esc(p.name) + '</div>' +
        '<div class="pts">' + p.total + ' <small>' + t("unit") + '</small></div></div>';
    }).join("") + "</div>";

    var maxAbs = Math.max.apply(null, board.map(function (p) { return Math.abs(p.total); }).concat([1]));
    var bars = '<div class="card"><h2>' + t("bars_title") + "</h2>" + board.map(function (p) {
      var neg = p.total < 0;
      return '<div class="bar-row"><div class="bname">' + esc(p.name) + '</div>' +
        '<div class="bar-track"><div class="bar-fill' + (neg ? " neg" : "") + '" style="width:' + Math.round(Math.abs(p.total) / maxAbs * 100) + '%"></div></div>' +
        '<div class="bpts' + (neg ? " neg" : "") + '">' + p.total + "</div></div>";
    }).join("") + "</div>";

    var finished = MATCHES.filter(function (m) { return resultOf(m); }).length;
    var rows = board.map(function (p, i) {
      return "<tr><td>" + (i + 1) + "</td><td><b>" + esc(p.name) + "</b></td><td>" + p.total + "</td>" +
        "<td>" + p.exact + "</td><td>" + p.predicted + "</td></tr>";
    }).join("");
    var table = '<div class="card"><h2>' + t("detail_title").replace("{a}", finished).replace("{b}", MATCHES.length) + "</h2>" +
      '<div class="table-wrap"><table><thead><tr><th>' + [t("th_rank"), t("th_player"), t("th_money"), t("th_exact"), t("th_predicted")].join("</th><th>") +
      "</th></tr></thead><tbody>" + rows + "</tbody></table></div></div>";

    el.innerHTML = podium + bars + table;
  }

  // ===== Fixtures & predictions =====
  function predCell(player, m) {
    var pred = predOf(player, m);
    if (!pred) return '<span class="pred empty">—</span>';
    var res = resultOf(m);
    var txt = pred[0] + "-" + pred[1];
    if (!res) return '<span class="pred wait">' + txt + "</span>";
    return '<span class="pred ' + (isExact(pred, res) ? "hit3" : "hit0") + '">' + txt + "</span>";
  }

  function matchTable(ms) {
    var head = "<tr><th>" + t("th_no") + "</th><th>" + t("th_date") + "</th><th style='text-align:left'>" + t("th_fixture") + "</th><th>" + t("th_result") + "</th>" +
      PLAYERS.map(function (p) { return "<th>" + esc(p) + "</th>"; }).join("") + "</tr>";
    var rows = ms.map(function (m) {
      var tt = teamsOf(m);
      var res = resultOf(m);
      var vs = tt.known
        ? esc(tn(tt.home)) + ' <span class="vs">vs</span> ' + esc(tn(tt.away))
        : '<span class="tbd">' + esc(labelOf(m)) + "</span>";
      return "<tr><td>" + m.id + "</td><td>" + esc(dateText(m)) + '</td><td class="match-cell">' + vs + "</td>" +
        '<td class="res' + (res ? "" : " pending") + '">' + (res ? res[0] + "-" + res[1] : t("pending")) + "</td>" +
        PLAYERS.map(function (p) { return "<td>" + predCell(p, m) + "</td>"; }).join("") + "</tr>";
    }).join("");
    return '<div class="table-wrap"><table><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  }

  function renderMatches() {
    var html = '<div class="legend">' + t("legend") + "</div>";
    STAGE_ORDER.forEach(function (st) {
      var ms = MATCHES.filter(function (m) { return m.stage === st; });
      if (!ms.length) return;
      html += '<h2 class="stage-title">' + t("stage_" + st) + "</h2>";
      if (st === "group") {
        "ABCDEFGHIJKL".split("").forEach(function (g) {
          var gm = ms.filter(function (m) { return m.group === g; });
          if (!gm.length) return;
          html += '<h3 class="group-title">' + t("group_title").replace("{g}", g) + "</h3>" + matchTable(gm);
        });
      } else {
        html += matchTable(ms);
      }
    });
    $("#tab-matches").innerHTML = html;
  }

  // ===== My predictions =====
  var DRAFT_KEY = "wc2026_draft";

  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveDraft(d) { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }

  function renderPredict() {
    var draft = loadDraft();
    var name = draft.name || "";

    var playerOpts = '<option value="">' + t("who_placeholder") + "</option>" + PLAYERS.map(function (p) {
      return '<option value="' + esc(p) + '"' + (p === name ? " selected" : "") + ">" + esc(p) + "</option>";
    }).join("");

    var html = '<div class="card"><h2>' + t("predict_title") + "</h2>" +
      '<div class="form-row"><label>' + t("who_label") + "</label>" +
      '<select id="pname">' + playerOpts + "</select></div>" +
      '<p class="hint">' + t("predict_hint") + "</p>" +
      (cfgOk() ? "" : '<p class="hint" style="color:var(--red)">' + t("cfg_missing") + "</p>") + "</div>";

    STAGE_ORDER.forEach(function (st) {
      var ms = MATCHES.filter(function (m) { return m.stage === st; });
      if (!ms.length) return;
      html += '<div class="card"><h2>' + t("stage_" + st) + "</h2>";
      ms.forEach(function (m) {
        var tt = teamsOf(m);
        var sub = predOf(name, m);   // already submitted → locked
        var played = !!resultOf(m);  // result recorded → closed
        var live = started(m);       // kickoff passed → closed
        var locked = !!sub || played || live;
        var v = sub || (!locked && draft.scores && draft.scores[m.id]) || ["", ""];
        var mark = sub ? t("mark_submitted") : (played ? t("mark_finished") : (live ? t("mark_started") : ""));
        var dis = locked ? " disabled" : "";
        html += '<div class="match-form-row' + (locked ? " played" : "") + '">' +
          '<span class="mid">#' + m.id + " " + esc(dateText(m)) + mark + "</span>" +
          '<span class="teams">' + (tt.known ? esc(tn(tt.home)) + ' <span class="vs">vs</span> ' + esc(tn(tt.away))
            : '<span class="tbd">' + esc(labelOf(m)) + "</span>") + "</span>" +
          '<span class="inputs"><input class="score" type="number" min="0" max="20" data-mid="' + m.id + '" data-side="0" value="' + v[0] + '"' + dis + ">" +
          '<span class="vs">:</span>' +
          '<input class="score" type="number" min="0" max="20" data-mid="' + m.id + '" data-side="1" value="' + v[1] + '"' + dis + "></span></div>";
      });
      html += "</div>";
    });

    html += '<div class="sticky-actions">' +
      '<button class="btn" id="btn-submit"' + (cfgOk() ? "" : " disabled") + ">" + t("btn_submit") + "</button>" +
      '<button class="btn ghost" id="btn-clear-draft">' + t("btn_clear_draft") + "</button></div>";

    var el = $("#tab-predict");
    el.innerHTML = html;

    el.addEventListener("input", function (e) {
      if (e.target.classList.contains("score")) {
        var d = loadDraft();
        d.scores = d.scores || {};
        var mid = e.target.dataset.mid;
        var cur = d.scores[mid] || ["", ""];
        cur[+e.target.dataset.side] = e.target.value;
        d.scores[mid] = cur;
        saveDraft(d);
      }
    });

    $("#pname").addEventListener("change", function (e) {
      var d = loadDraft();
      d.name = e.target.value;
      saveDraft(d);
      renderPredict();
    });

    $("#btn-clear-draft").onclick = function () {
      var d = loadDraft();
      localStorage.removeItem(DRAFT_KEY);
      if (d.name) saveDraft({ name: d.name });
      renderPredict();
      toast(t("toast_draft_cleared"));
    };

    $("#btn-submit").onclick = function () {
      var pname = $("#pname").value;
      if (!pname) { toast(t("toast_pick_name")); return; }
      var scores = {};
      el.querySelectorAll("input.score:not(:disabled)").forEach(function (inp) {
        var mid = inp.dataset.mid, side = +inp.dataset.side;
        if (inp.value === "") return;
        scores[mid] = scores[mid] || [null, null];
        scores[mid][side] = Math.max(0, parseInt(inp.value, 10) || 0);
      });
      var rows = [];
      Object.keys(scores).forEach(function (k) {
        if (scores[k][0] != null && scores[k][1] != null && !(RESULTS.scores || {})[k]) {
          rows.push({ player: pname, match_id: +k, home: scores[k][0], away: scores[k][1] });
        }
      });
      if (!rows.length) { toast(t("toast_nothing")); return; }

      var btn = this;
      btn.disabled = true;
      toast(t("toast_submitting"));
      Promise.all(rows.map(function (row) {
        return sbFetch("/rest/v1/predictions", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(row)
        }).then(function (r) { return { id: row.match_id, ok: r.ok, status: r.status }; },
          function () { return { id: row.match_id, ok: false, status: 0 }; });
      })).then(function (outs) {
        btn.disabled = false;
        var ok = outs.filter(function (o) { return o.ok; }).length;
        // 409 = duplicate (already submitted), 401/403 = RLS reject (match finished)
        var locked = outs.filter(function (o) { return !o.ok && (o.status === 409 || o.status === 403 || o.status === 401); }).length;
        var failed = outs.length - ok - locked;
        // drop successfully submitted matches from the draft
        var d = loadDraft();
        if (d.scores) outs.forEach(function (o) { if (o.ok) delete d.scores[o.id]; });
        saveDraft(d);
        var msg = [];
        if (ok) msg.push(fmt("toast_submit_ok", ok));
        if (locked) msg.push(fmt("toast_submit_locked", locked));
        if (failed) msg.push(fmt("toast_submit_failed", failed));
        toast(msg.join(" · "));
        fetchData().then(renderAll, function () {});
      });
    };
  }

  // ===== Enter results (admin) =====
  function getToken() { return sessionStorage.getItem(TOKEN_KEY) || ""; }

  function renderAdmin() {
    var el = $("#tab-admin");
    var token = getToken();

    if (!token) {
      el.innerHTML = '<div class="card"><h2>' + t("admin_title") + "</h2>" +
        '<p class="hint">' + t("admin_login_hint") + "</p>" +
        '<div class="form-row">' +
        '<input type="text" id="adm-email" placeholder="' + t("ph_email") + '" autocomplete="username">' +
        '<input type="password" id="adm-pass" placeholder="' + t("ph_password") + '" autocomplete="current-password">' +
        '<button class="btn" id="btn-login">' + t("btn_login") + "</button></div></div>";
      $("#btn-login").onclick = function () {
        var btn = this;
        btn.disabled = true;
        sbFetch("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: JSON.stringify({ email: $("#adm-email").value.trim(), password: $("#adm-pass").value })
        }).then(function (r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function (j) {
            sessionStorage.setItem(TOKEN_KEY, j.access_token);
            toast(t("toast_logged_in"));
            renderAdmin();
          })
          .catch(function () { btn.disabled = false; toast(t("toast_login_failed")); });
      };
      return;
    }

    var html = '<div class="card"><h2>' + t("admin_title") + "</h2>" +
      '<p class="hint">' + t("admin_hint") + "</p>" +
      '<button class="btn ghost" id="btn-logout">' + t("btn_logout") + "</button></div>" +
      '<datalist id="team-list">' + TEAMS.map(function (tm) {
        return '<option value="' + esc(tm) + '">';
      }).join("") + "</datalist>";

    STAGE_ORDER.forEach(function (st) {
      var ms = MATCHES.filter(function (m) { return m.stage === st; });
      if (!ms.length) return;
      html += '<div class="card"><h2>' + t("stage_" + st) + "</h2>";
      ms.forEach(function (m) {
        var r = resultOf(m) || ["", ""];
        var teamsHtml;
        if (m.stage === "group") {
          teamsHtml = '<span class="teams">' + esc(tn(m.home)) + ' <span class="vs">vs</span> ' + esc(tn(m.away)) + "</span>";
        } else {
          var tv = (RESULTS.teams || {})[m.id] || ["", ""];
          teamsHtml = '<span class="teams"><input class="team-in" list="team-list" data-mid="' + m.id + '" data-side="0" placeholder="' + t("ph_home") + '" value="' + esc(tv[0] || "") + '">' +
            ' <span class="vs">vs</span> <input class="team-in" list="team-list" data-mid="' + m.id + '" data-side="1" placeholder="' + t("ph_away") + '" value="' + esc(tv[1] || "") + '">' +
            ' <span class="tbd" style="font-size:.78rem">' + esc(labelOf(m)) + "</span></span>";
        }
        html += '<div class="match-form-row">' +
          '<span class="mid">#' + m.id + " " + esc(dateText(m)) + "</span>" + teamsHtml +
          '<span class="inputs"><input class="score rscore" type="number" min="0" max="20" data-mid="' + m.id + '" data-side="0" value="' + r[0] + '">' +
          '<span class="vs">:</span>' +
          '<input class="score rscore" type="number" min="0" max="20" data-mid="' + m.id + '" data-side="1" value="' + r[1] + '"></span></div>';
      });
      html += "</div>";
    });

    html += '<div class="sticky-actions"><button class="btn gold" id="btn-save-res">' + t("btn_save_res") + "</button></div>";
    el.innerHTML = html;

    // Only send matches the admin actually edited — keeps the payload tiny so the
    // save survives a flaky connection to Supabase (full re-send used to time out).
    var dirty = {};
    el.addEventListener("input", function (e) {
      if (e.target.classList.contains("rscore") || e.target.classList.contains("team-in")) {
        dirty[e.target.dataset.mid] = true;
      }
    });

    $("#btn-logout").onclick = function () {
      sessionStorage.removeItem(TOKEN_KEY);
      renderAdmin();
    };

    $("#btn-save-res").onclick = function () {
      var rows = [];
      Object.keys(dirty).forEach(function (mid) {
        var row = { match_id: +mid };
        var h = el.querySelector('input.rscore[data-mid="' + mid + '"][data-side="0"]');
        var a = el.querySelector('input.rscore[data-mid="' + mid + '"][data-side="1"]');
        if (h && a && h.value !== "" && a.value !== "") {
          row.home = Math.max(0, parseInt(h.value, 10) || 0);
          row.away = Math.max(0, parseInt(a.value, 10) || 0);
        }
        var th = el.querySelector('input.team-in[data-mid="' + mid + '"][data-side="0"]');
        var ta = el.querySelector('input.team-in[data-mid="' + mid + '"][data-side="1"]');
        if (th && ta && th.value.trim() && ta.value.trim()) {
          row.team_home = th.value.trim();
          row.team_away = ta.value.trim();
        }
        if (row.home != null || row.team_home) rows.push(row);
      });
      if (!rows.length) { toast(t("toast_nothing_save")); return; }

      var btn = this;
      btn.disabled = true;
      sbFetch("/rest/v1/results?on_conflict=match_id", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + getToken(),
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify(rows)
      }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) {
          if (r.status === 401) sessionStorage.removeItem(TOKEN_KEY);
          toast(t("toast_res_failed"));
          if (r.status === 401) renderAdmin();
          return;
        }
        toast(t("toast_res_saved"));
        fetchData().then(renderAll, function () {});
      }, function () {
        btn.disabled = false;
        toast(t("toast_res_failed"));
      });
    };
  }

  // ===== Rules =====
  function renderRules() {
    $("#tab-rules").innerHTML = t("rules_html");
  }

  // ===== Static chrome =====
  function applyStatic() {
    document.documentElement.lang = LANG === "zh" ? "zh-CN" : "en";
    document.title = t("doc_title");
    $("#app-title").textContent = t("title");
    $("#app-subtitle").textContent = t("subtitle");
    ["board", "matches", "predict", "admin", "rules"].forEach(function (tab) {
      $('[data-tab="' + tab + '"]').textContent = t("tab_" + tab);
    });
    $("#app-footer").innerHTML = t("footer");
    $("#lang-toggle").textContent = LANG === "zh" ? "EN" : "中文";
  }

  function renderAll() {
    applyStatic();
    renderBoard();
    renderMatches();
    renderPredict();
    renderAdmin();
    renderRules();
  }

  // ===== Tabs & language toggle =====
  $("#tabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (!btn || !btn.dataset.tab) return;
    document.querySelectorAll(".tab").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
    btn.classList.add("active");
    $("#tab-" + btn.dataset.tab).classList.add("active");
  });

  $("#lang-toggle").addEventListener("click", function () {
    LANG = LANG === "zh" ? "en" : "zh";
    localStorage.setItem(LANG_KEY, LANG);
    renderAll();
  });

  // ===== Auto-refresh =====
  // Re-pull from Supabase periodically and when the tab regains focus, so the
  // board/fixtures stay live without a manual reload. Skip while the user is
  // typing, or on the admin tab (unsaved score inputs aren't draft-backed).
  function refreshBlocked() {
    var a = document.activeElement;
    if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return true;
    if ($("#tab-admin").classList.contains("active")) return true;
    return false;
  }
  function softRefresh() {
    if (refreshBlocked()) return;
    fetchData().then(renderAll, function () {});
  }
  setInterval(softRefresh, 30000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) softRefresh();
  });

  // ===== Boot =====
  $("#tab-board").innerHTML = '<div class="card"><p class="hint">' + t("loading") + "</p></div>";
  renderAll();
  fetchData().then(renderAll, function () { toast(t("toast_load_failed")); });
})();
