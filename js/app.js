/* 2026 世界杯预测大赛 —— 核心逻辑 */
(function () {
  "use strict";

  // ===== 计分规则（想改规则只改这里，单位：元） =====
  var PT_EXACT = 1;     // 比分全对 +1 元
  var PT_OUTCOME = 0;   // 仅胜平负对，不得钱
  var UNIT = "元";

  var STAGE_NAMES = {
    group: "小组赛", r32: "32强 · 1/16决赛", r16: "16强 · 1/8决赛",
    qf: "1/4决赛", sf: "半决赛", third: "季军赛", final: "决赛"
  };
  var STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"];

  // 固定玩家名单（只有这七个人能玩）
  var PLAYERS = ["RiT", "ST", "RT", "ArP", "AP", "SP", "NP"];

  var MATCHES = window.WC_MATCHES || [];
  var PREDICTIONS = window.WC_PREDICTIONS || {};
  var RESULTS = window.WC_RESULTS || { scores: {}, teams: {} };
  var TEAMS = window.WC_TEAMS || [];

  // ===== 工具 =====
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._tm);
    toast._tm = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  // 淘汰赛球队可在 results.js 的 teams 里补充
  function teamsOf(m) {
    var t = (RESULTS.teams || {})[m.id];
    if (t && t[0] && t[1]) return { home: t[0], away: t[1], known: true };
    if (m.home && m.away) return { home: m.home, away: m.away, known: true };
    return { home: "待定", away: "待定", known: false };
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
  // 命中类型：exact 比分全对 / outcome 仅胜平负对 / miss 没中
  function hitType(pred, res) {
    if (!pred || !res) return null;
    if (pred[0] === res[0] && pred[1] === res[1]) return "exact";
    if (Math.sign(pred[0] - pred[1]) === Math.sign(res[0] - res[1])) return "outcome";
    return "miss";
  }
  function matchPoints(pred, res) {
    var t = hitType(pred, res);
    if (t === null) return null;
    return t === "exact" ? PT_EXACT : t === "outcome" ? PT_OUTCOME : 0;
  }

  // ===== 排行榜 =====
  function computeBoard() {
    return PLAYERS.map(function (name) {
      var total = 0, exact = 0, outcome = 0, predicted = 0;
      MATCHES.forEach(function (m) {
        var pred = predOf(name, m);
        if (pred) predicted++;
        var t = hitType(pred, resultOf(m));
        if (t === null) return;
        total += t === "exact" ? PT_EXACT : t === "outcome" ? PT_OUTCOME : 0;
        if (t === "exact") exact++;
        else if (t === "outcome") outcome++;
      });
      return { name: name, total: total, exact: exact, outcome: outcome, predicted: predicted };
    }).sort(function (a, b) {
      return b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name, "zh");
    });
  }

  function renderBoard() {
    var board = computeBoard();
    var el = $("#tab-board");
    if (!board.length) {
      el.innerHTML = '<div class="card"><h2>🏆 排行榜</h2><p class="hint">还没有任何预测数据，去「填写预测」页提交第一份吧！</p></div>';
      return;
    }
    var medals = ["🥇", "🥈", "🥉"];
    var podium = '<div class="podium">' + board.slice(0, 3).map(function (p, i) {
      return '<div class="spot' + (i === 0 ? " first" : "") + '">' +
        '<div class="medal">' + medals[i] + '</div>' +
        '<div class="name">' + esc(p.name) + '</div>' +
        '<div class="pts">' + p.total + ' <small>' + UNIT + '</small></div></div>';
    }).join("") + "</div>";

    var max = Math.max(board[0].total, 1);
    var bars = '<div class="card"><h2>奖金对比（' + UNIT + '）</h2>' + board.map(function (p) {
      return '<div class="bar-row"><div class="bname">' + esc(p.name) + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round(p.total / max * 100) + '%"></div></div>' +
        '<div class="bpts">' + p.total + '</div></div>';
    }).join("") + "</div>";

    var finished = MATCHES.filter(function (m) { return resultOf(m); }).length;
    var rows = board.map(function (p, i) {
      return "<tr><td>" + (i + 1) + "</td><td><b>" + esc(p.name) + "</b></td><td>" + p.total + "</td>" +
        "<td>" + p.exact + "</td><td>" + p.outcome + "</td><td>" + p.predicted + "</td></tr>";
    }).join("");
    var table = '<div class="card"><h2>明细（已完赛 ' + finished + ' / ' + MATCHES.length + ' 场）</h2>' +
      '<div class="table-wrap"><table><thead><tr><th>排名</th><th>玩家</th><th>奖金(' + UNIT + ')</th><th>比分全对</th><th>仅胜负对</th><th>已预测场次</th></tr></thead><tbody>' +
      rows + "</tbody></table></div></div>";

    el.innerHTML = podium + bars + table;
  }

  // ===== 赛程 & 预测 =====
  function predCell(player, m) {
    var pred = predOf(player, m);
    if (!pred) return '<span class="pred empty">—</span>';
    var res = resultOf(m);
    var txt = pred[0] + "-" + pred[1];
    if (!res) return '<span class="pred wait">' + txt + "</span>";
    var t = hitType(pred, res);
    var cls = t === "exact" ? "hit3" : t === "outcome" ? "hit1" : "hit0";
    return '<span class="pred ' + cls + '">' + txt + "</span>";
  }

  function matchTable(ms) {
    var head = "<tr><th>场次</th><th>日期</th><th style='text-align:left'>对阵</th><th>赛果</th>" +
      PLAYERS.map(function (p) { return "<th>" + esc(p) + "</th>"; }).join("") + "</tr>";
    var rows = ms.map(function (m) {
      var t = teamsOf(m);
      var res = resultOf(m);
      var vs = t.known
        ? esc(t.home) + ' <span class="vs">vs</span> ' + esc(t.away)
        : '<span class="tbd">' + esc(m.label || "待定") + "</span>";
      return "<tr><td>" + m.id + "</td><td>" + esc(m.date) + '</td><td class="match-cell">' + vs + "</td>" +
        '<td class="res' + (res ? "" : " pending") + '">' + (res ? res[0] + "-" + res[1] : "未赛") + "</td>" +
        PLAYERS.map(function (p) { return "<td>" + predCell(p, m) + "</td>"; }).join("") + "</tr>";
    }).join("");
    return '<div class="table-wrap"><table><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  }

  function renderMatches() {
    var html = '<div class="legend">图例：<span class="pred hit3">2-1</span> 比分全对 +' + PT_EXACT + UNIT +
      ' <span class="pred hit1">1-0</span> 仅胜负对（不得钱） ' +
      '<span class="pred hit0">0-2</span> 没猜中 <span class="pred wait">3-1</span> 未开赛</div>';
    STAGE_ORDER.forEach(function (st) {
      var ms = MATCHES.filter(function (m) { return m.stage === st; });
      if (!ms.length) return;
      html += '<h2 class="stage-title">' + STAGE_NAMES[st] + "</h2>";
      if (st === "group") {
        "ABCDEFGHIJKL".split("").forEach(function (g) {
          var gm = ms.filter(function (m) { return m.group === g; });
          if (!gm.length) return;
          html += '<h3 class="group-title">' + g + " 组</h3>" + matchTable(gm);
        });
      } else {
        html += matchTable(ms);
      }
    });
    $("#tab-matches").innerHTML = html;
  }

  // ===== 填写预测 =====
  var DRAFT_KEY = "wc2026_draft";

  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveDraft(d) { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }

  function renderPredict() {
    var draft = loadDraft();
    var name = draft.name || "";

    var playerOpts = '<option value="">— 我是谁 —</option>' + PLAYERS.map(function (p) {
      return '<option value="' + esc(p) + '"' + (p === name ? " selected" : "") + ">" + esc(p) + "</option>";
    }).join("");

    var html = '<div class="card"><h2>✍️ 填写我的预测</h2>' +
      '<div class="form-row"><label>我的名字</label>' +
      '<select id="pname">' + playerOpts + "</select></div>" +
      '<p class="hint">可以一场一场提交：填了哪场就交哪场，没填的以后再来填。' +
      '点底部「生成 predictions.js」复制内容发给管理员替换 <code>data/predictions.js</code>。' +
      "🔒 已提交的场次锁定不能再改；⛔ 已出赛果的场次不能再提交。草稿自动存在本机浏览器。</p></div>";

    STAGE_ORDER.forEach(function (st) {
      var ms = MATCHES.filter(function (m) { return m.stage === st; });
      if (!ms.length) return;
      html += '<div class="card"><h2>' + STAGE_NAMES[st] + "</h2>";
      ms.forEach(function (m) {
        var t = teamsOf(m);
        var sub = predOf(name, m);   // 已提交 → 锁定
        var played = !!resultOf(m);  // 已出赛果 → 不能再提交
        var locked = !!sub || played;
        var v = sub || (!played && draft.scores && draft.scores[m.id]) || ["", ""];
        var mark = sub ? " · 🔒已提交" : (played ? " · ⛔已结束" : "");
        var dis = locked ? " disabled" : "";
        html += '<div class="match-form-row' + (locked ? " played" : "") + '">' +
          '<span class="mid">#' + m.id + " " + esc(m.date) + mark + "</span>" +
          '<span class="teams">' + (t.known ? esc(t.home) + ' <span class="vs">vs</span> ' + esc(t.away)
            : '<span class="tbd">' + esc(m.label || "待定") + "</span>") + "</span>" +
          '<span class="inputs"><input class="score" type="number" min="0" max="20" data-mid="' + m.id + '" data-side="0" value="' + v[0] + '"' + dis + '>' +
          '<span class="vs">:</span>' +
          '<input class="score" type="number" min="0" max="20" data-mid="' + m.id + '" data-side="1" value="' + v[1] + '"' + dis + '></span></div>';
      });
      html += "</div>";
    });

    html += '<div class="sticky-actions">' +
      '<button class="btn" id="btn-export-pred">📋 生成 predictions.js 并复制</button>' +
      '<button class="btn ghost" id="btn-clear-draft">清空草稿</button></div>' +
      '<textarea class="export" id="pred-export" readonly></textarea>';

    var el = $("#tab-predict");
    el.innerHTML = html;

    // 事件
    el.addEventListener("input", function (e) {
      var d = loadDraft();
      if (e.target.classList.contains("score")) {
        d.scores = d.scores || {};
        var mid = e.target.dataset.mid;
        var cur = d.scores[mid] || ["", ""];
        cur[+e.target.dataset.side] = e.target.value;
        d.scores[mid] = cur;
        saveDraft(d);
      }
    });

    // 切换玩家后重新渲染，套用对应的锁定状态
    $("#pname").addEventListener("change", function (e) {
      var d = loadDraft();
      d.name = e.target.value;
      saveDraft(d);
      renderPredict();
    });

    $("#btn-clear-draft").onclick = function () {
      localStorage.removeItem(DRAFT_KEY);
      renderPredict();
      toast("草稿已清空");
    };

    $("#btn-export-pred").onclick = function () {
      var pname = $("#pname").value;
      if (!pname) { toast("请先选择你是谁"); return; }
      var scores = {};
      el.querySelectorAll("input.score:not(:disabled)").forEach(function (inp) {
        var mid = inp.dataset.mid, side = +inp.dataset.side;
        if (inp.value === "") return;
        scores[mid] = scores[mid] || [null, null];
        scores[mid][side] = Math.max(0, parseInt(inp.value, 10) || 0);
      });
      // 只保留两边都填了、且还没出赛果的场次
      var fresh = {};
      Object.keys(scores).forEach(function (k) {
        if (scores[k][0] != null && scores[k][1] != null && !(RESULTS.scores || {})[k]) fresh[k] = scores[k];
      });
      if (!Object.keys(fresh).length) { toast("没有新的预测可提交"); return; }

      // 已提交过的场次保持原样，只追加新场次
      var merged = JSON.parse(JSON.stringify(PREDICTIONS));
      var mine = (merged[pname] && merged[pname].scores) || {};
      Object.keys(fresh).forEach(function (k) { if (!mine[k]) mine[k] = fresh[k]; });
      merged[pname] = { scores: mine };
      copyOut("#pred-export", buildPredictionsFile(merged),
        "已复制！发给管理员替换 data/predictions.js");
    };
  }

  function buildPredictionsFile(obj) {
    var lines = ["// 各玩家的预测数据（由页面自动生成）", "window.WC_PREDICTIONS = {"];
    var names = Object.keys(obj);
    names.forEach(function (n, i) {
      var p = obj[n];
      lines.push('  "' + n.replace(/"/g, '\\"') + '": {');
      lines.push("    scores: {");
      var ids = Object.keys(p.scores || {}).sort(function (a, b) { return a - b; });
      ids.forEach(function (id, j) {
        var s = p.scores[id];
        lines.push('      "' + id + '": [' + s[0] + ", " + s[1] + "]" + (j < ids.length - 1 ? "," : ""));
      });
      lines.push("    }");
      lines.push("  }" + (i < names.length - 1 ? "," : ""));
    });
    lines.push("};");
    return lines.join("\n");
  }

  // ===== 录入赛果（管理员） =====
  function renderAdmin() {
    var html = '<div class="card"><h2>🛠️ 录入赛果（管理员用）</h2>' +
      '<p class="hint">填真实比分；淘汰赛对阵确定后在左边两个框里填球队名（输入时有 48 队自动补全，写法要和小组赛一致）。' +
      '填完点底部按钮生成 <code>data/results.js</code> 整体替换提交即可。</p></div>' +
      '<datalist id="team-list">' + TEAMS.map(function (t) {
        return '<option value="' + esc(t) + '">';
      }).join("") + "</datalist>";

    STAGE_ORDER.forEach(function (st) {
      var ms = MATCHES.filter(function (m) { return m.stage === st; });
      if (!ms.length) return;
      html += '<div class="card"><h2>' + STAGE_NAMES[st] + "</h2>";
      ms.forEach(function (m) {
        var t = teamsOf(m);
        var r = resultOf(m) || ["", ""];
        var teamsHtml;
        if (m.stage === "group") {
          teamsHtml = '<span class="teams">' + esc(m.home) + ' <span class="vs">vs</span> ' + esc(m.away) + "</span>";
        } else {
          var tv = (RESULTS.teams || {})[m.id] || ["", ""];
          teamsHtml = '<span class="teams"><input class="team-in" list="team-list" data-mid="' + m.id + '" data-side="0" placeholder="主队" value="' + esc(tv[0] || "") + '">' +
            ' <span class="vs">vs</span> <input class="team-in" list="team-list" data-mid="' + m.id + '" data-side="1" placeholder="客队" value="' + esc(tv[1] || "") + '">' +
            ' <span class="tbd" style="font-size:.78rem">' + esc(m.label || "") + "</span></span>";
        }
        html += '<div class="match-form-row">' +
          '<span class="mid">#' + m.id + " " + esc(m.date) + "</span>" + teamsHtml +
          '<span class="inputs"><input class="score rscore" type="number" min="0" max="20" data-mid="' + m.id + '" data-side="0" value="' + r[0] + '">' +
          '<span class="vs">:</span>' +
          '<input class="score rscore" type="number" min="0" max="20" data-mid="' + m.id + '" data-side="1" value="' + r[1] + '"></span></div>';
      });
      html += "</div>";
    });

    html += '<div class="sticky-actions"><button class="btn gold" id="btn-export-res">📋 生成 results.js 并复制</button></div>' +
      '<textarea class="export" id="res-export" readonly></textarea>';

    var el = $("#tab-admin");
    el.innerHTML = html;

    $("#btn-export-res").onclick = function () {
      var scores = {}, teams = {};
      el.querySelectorAll("input.rscore").forEach(function (inp) {
        if (inp.value === "") return;
        var mid = inp.dataset.mid;
        scores[mid] = scores[mid] || [null, null];
        scores[mid][+inp.dataset.side] = Math.max(0, parseInt(inp.value, 10) || 0);
      });
      Object.keys(scores).forEach(function (k) {
        if (scores[k][0] == null || scores[k][1] == null) delete scores[k];
      });
      el.querySelectorAll("input.team-in").forEach(function (inp) {
        var v = inp.value.trim();
        if (!v) return;
        var mid = inp.dataset.mid;
        teams[mid] = teams[mid] || ["", ""];
        teams[mid][+inp.dataset.side] = v;
      });

      var lines = ["// 真实赛果（由页面自动生成）", "window.WC_RESULTS = {", "  scores: {"];
      var ids = Object.keys(scores).sort(function (a, b) { return a - b; });
      ids.forEach(function (id, i) {
        lines.push('    "' + id + '": [' + scores[id][0] + ", " + scores[id][1] + "]" + (i < ids.length - 1 ? "," : ""));
      });
      lines.push("  },", "  teams: {");
      var tids = Object.keys(teams).sort(function (a, b) { return a - b; });
      tids.forEach(function (id, i) {
        lines.push('    "' + id + '": ["' + teams[id][0].replace(/"/g, '\\"') + '", "' + teams[id][1].replace(/"/g, '\\"') + '"]' + (i < tids.length - 1 ? "," : ""));
      });
      lines.push("  }", "};");
      copyOut("#res-export", lines.join("\n"), "已复制！替换 data/results.js 后提交");
    };
  }

  // ===== 复制输出 =====
  function copyOut(sel, text, okMsg) {
    var ta = $(sel);
    ta.value = text;
    ta.style.display = "block";
    ta.select();
    var done = function () { toast(okMsg); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        document.execCommand("copy"); done();
      });
    } else {
      document.execCommand("copy"); done();
    }
  }

  // ===== Tab 切换 =====
  $("#tabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (!btn) return;
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
    document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
    btn.classList.add("active");
    $("#tab-" + btn.dataset.tab).classList.add("active");
  });

  // ===== 启动 =====
  renderBoard();
  renderMatches();
  renderPredict();
  renderAdmin();
})();
