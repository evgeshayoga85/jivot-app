/* Логика мини-приложения. Контент лежит в data.js */
(function () {
  var DATA = window.APP_DATA;
  var KEY = "ey_course_progress_v1";
  var TYPES = {
    theory:   { label: "теория",   icon: "fa-solid fa-book-open" },
    practice: { label: "практика", icon: "fa-solid fa-play" },
    test:     { label: "тест",     icon: "fa-solid fa-clipboard-check" },
    task:     { label: "задание",  icon: "fa-solid fa-pen-to-square" },
    file:     { label: "файл",     icon: "fa-solid fa-file-arrow-down" }
  };

  /* --- состояние --- */
  var state = load();
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var s = raw ? JSON.parse(raw) : {};
      s.done = s.done || {};
      s.gates = s.gates || {};
      return s;
    } catch (e) { return { done: {}, gates: {} }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* --- утилиты --- */
  var root = document.getElementById("screen");
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function levelById(id) { for (var i = 0; i < DATA.levels.length; i++) if (DATA.levels[i].id === id) return DATA.levels[i]; return null; }
  function progress(level) {
    var total = level.items.length, done = 0;
    level.items.forEach(function (it) { if (state.done[it.id]) done++; });
    return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0 };
  }

  /* --- экран: карта уровней --- */
  function renderMap() {
    root.innerHTML = "";
    root.appendChild(el('<p class="lede">Здесь то, что живёт в чате поддержки: разборы, ответы, отчётные задания и тесты перехода. Уроки курса, как всегда, на сайте. Отмечайте пройденное, чтобы не искать, где вы остановились.</p>'));
    root.appendChild(el(
      '<div class="links">' +
        (DATA.courseUrl ? '<a class="linkbtn" href="' + DATA.courseUrl + '" target="_blank" rel="noopener">Уроки на сайте</a>' : "") +
        (DATA.chatUrl ? '<a class="linkbtn is-quiet" href="' + DATA.chatUrl + '" target="_blank" rel="noopener">Открыть чат</a>' : "") +
      "</div>"
    ));
    var map = el('<div class="map"></div>');

    DATA.levels.forEach(function (lv, i) {
      if (lv.branch) map.appendChild(el('<div class="branch-label">ветка при активном диастазе</div>'));

      var p = progress(lv);
      var cls = "level" + (lv.branch ? " is-branch" : "") + (lv.optional ? " is-optional" : "") + (lv.bonus ? " is-bonus" : "");
      var tags = "";
      if (lv.badge) tags += '<span class="tag">' + esc(lv.badge) + "</span>";
      if (lv.meta) tags += '<span class="tag is-quiet">' + esc(lv.meta) + "</span>";
      if (lv.gate) tags += '<span class="tag is-quiet">' + esc(lv.gateTag || "тест перехода") + "</span>";

      var card = el(
        '<button class="' + cls + '" data-level="' + lv.id + '">' +
          '<span class="level-top">' + (lv.hideId ? "" : '<span class="level-id">' + esc(lv.id) + "</span>") +
          '<span class="level-name">' + esc(lv.name) + "</span></span>" +
          '<div class="level-tagline">' + esc(lv.tagline) + "</div>" +
          '<div class="tags">' + tags + "</div>" +
          '<div class="bar"><i style="width:' + p.pct + '%"></i></div>' +
          '<div class="bar-note">' + p.done + " из " + p.total + " материалов</div>" +
        "</button>"
      );
      card.addEventListener("click", function () { go("#/level/" + lv.id); });
      map.appendChild(card);
      if (i < DATA.levels.length - 1) map.appendChild(el('<div class="connector"></div>'));
    });

    root.appendChild(map);
  }

  /* --- экран: уровень --- */
  function renderLevel(id) {
    var lv = levelById(id);
    if (!lv) return renderMap();
    root.innerHTML = "";

    var back = el('<button class="back"><i class="fa-solid fa-arrow-left"></i> все блоки</button>');
    back.addEventListener("click", function () { go("#/"); });
    root.appendChild(back);

    var p = progress(lv);
    root.appendChild(el(
      '<div class="level-head">' +
        (lv.hideId ? "" : '<span class="level-id">' + esc(lv.id) + "</span>") +
        '<h2>' + esc(lv.name) + "</h2>" +
        '<div class="level-tagline">' + esc(lv.tagline) + "</div>" +
        '<div class="bar"><i style="width:' + p.pct + '%"></i></div>' +
        '<div class="bar-note">' + p.done + " из " + p.total + " материалов</div>" +
      "</div>"
    ));

    var list = el('<ul class="items"></ul>');
    lv.items.forEach(function (it) { list.appendChild(itemRow(it, lv)); });
    root.appendChild(list);

    if (lv.gate) root.appendChild(gateBlock(lv));
  }

  function postLink(it) {
    if (it.link) return it.link;
    if (it.post && DATA.chatBase && DATA.chatBase.indexOf("CHANNEL_ID") === -1) {
      return DATA.chatBase.replace(/\/$/, "") + "/" + it.post;
    }
    return "";
  }

  function itemRow(it, lv) {
    var t = TYPES[it.type] || TYPES.theory;
    var href = postLink(it);
    var done = !!state.done[it.id];
    var li = el(
      '<li class="item' + (done ? " is-done" : "") + (it.pin ? " is-pin" : "") + '">' +
        '<button class="check" aria-label="отметить пройденным"></button>' +
        '<div class="item-body">' +
          (it.pin ? '<div class="pin-note">часто спрашивают</div>' : "") +
          '<div class="item-title">' + esc(it.title) + "</div>" +
          (it.note ? '<div class="item-note">' + esc(it.note) + "</div>" : "") +
          '<div class="item-meta">' +
            '<span class="type"><i class="' + t.icon + '"></i>' + t.label + "</span>" +
            (href
              ? '<a class="open" href="' + esc(href) + '" target="_blank" rel="noopener">открыть пост</a>'
              : '<span class="open is-off">пост №' + esc(it.post || "?") + ", ссылка появится</span>") +
          "</div>" +
        "</div>" +
      "</li>"
    );
    li.querySelector(".check").addEventListener("click", function () {
      if (state.done[it.id]) delete state.done[it.id]; else state.done[it.id] = true;
      save();
      renderLevel(lv.id);
    });
    return li;
  }

  /* --- тест перехода --- */
  function gateBlock(lv) {
    var g = lv.gate;
    var saved = state.gates[lv.id] || {};
    var box = el('<div class="gate"><h4>' + esc(g.title) + "</h4><p>" + esc(g.intro) + "</p></div>");
    var ul = el('<ul class="checks"></ul>');

    g.checks.forEach(function (c) {
      var on = !!saved[c.id];
      var row = el(
        '<li class="checkrow' + (on ? " is-on" : "") + '">' +
          '<span class="check"></span>' +
          "<span>" + esc(c.text) + (c.critical ? ' <span class="crit">(обязательный)</span>' : "") + "</span>" +
        "</li>"
      );
      row.addEventListener("click", function () {
        saved[c.id] = !saved[c.id];
        state.gates[lv.id] = saved;
        save();
        renderLevel(lv.id);
      });
      ul.appendChild(row);
    });
    box.appendChild(ul);

    var btn = el('<button class="btn">Показать результат</button>');
    var out = el('<div></div>');
    btn.addEventListener("click", function () {
      out.innerHTML = "";
      out.appendChild(el(verdict(g, saved)));
    });
    box.appendChild(btn);
    box.appendChild(out);
    return box;
  }

  function verdict(g, saved) {
    if (g.kind === "route") {
      var any = g.checks.some(function (c) { return saved[c.id]; });
      return '<div class="verdict ' + (any ? "is-fail" : "is-pass") + '"><b>' +
        esc(any ? g.routeYes : g.routeNo) + "</b></div>";
    }
    var missCrit = g.checks.filter(function (c) { return c.critical && !saved[c.id]; });
    var ok = missCrit.length === 0;
    var extra = "";
    if (!ok) {
      extra = "<br>Не хватает: " + missCrit.map(function (c) { return esc(c.text.toLowerCase()); }).join("; ") + ".";
    }
    return '<div class="verdict ' + (ok ? "is-pass" : "is-fail") + '"><b>' +
      esc(ok ? g.pass : g.fail) + "</b>" + extra + "</div>";
  }

  /* --- поиск --- */
  function renderSearch(q) {
    root.innerHTML = "";
    var needle = q.trim().toLowerCase();
    if (needle.length < 2) {
      root.appendChild(el('<p class="empty">Введите хотя бы две буквы.</p>'));
      return;
    }
    var found = [];
    DATA.levels.forEach(function (lv) {
      lv.items.forEach(function (it) {
        var hay = (it.title + " " + (it.note || "") + " " + (TYPES[it.type] || {}).label).toLowerCase();
        if (hay.indexOf(needle) !== -1) found.push({ lv: lv, it: it });
      });
    });
    if (!found.length) {
      root.appendChild(el('<p class="empty">Ничего не нашлось. Попробуйте другое слово, например «дыхание» или «домик».</p>'));
      return;
    }
    root.appendChild(el('<p class="lede">Нашлось материалов: ' + found.length + "</p>"));
    var list = el('<ul class="items"></ul>');
    found.forEach(function (f) {
      var row = itemRow(f.it, f.lv);
      row.querySelector(".item-body").insertBefore(
        el('<div class="result-level">' + esc(f.lv.id) + " · " + esc(f.lv.name) + "</div>"),
        row.querySelector(".item-title")
      );
      list.appendChild(row);
    });
    root.appendChild(list);
  }

  /* --- роутинг --- */
  function go(hash) {
    if (location.hash === hash) route(); else location.hash = hash;
    window.scrollTo(0, 0);
  }
  function route() {
    var h = location.hash || "#/";
    var m = h.match(/^#\/level\/(.+)$/);
    if (m) renderLevel(decodeURIComponent(m[1]));
    else renderMap();
  }
  window.addEventListener("hashchange", route);

  /* --- шапка --- */
  var searchWrap = document.getElementById("searchwrap");
  var searchInput = document.getElementById("search");
  document.getElementById("searchbtn").addEventListener("click", function () {
    searchWrap.hidden = !searchWrap.hidden;
    if (!searchWrap.hidden) searchInput.focus();
    else { searchInput.value = ""; route(); }
  });
  searchInput.addEventListener("input", function () {
    if (searchInput.value.trim()) renderSearch(searchInput.value);
    else route();
  });

  /* --- Telegram --- */
  if (window.Telegram && window.Telegram.WebApp) {
    var tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }

  document.querySelector(".brand").addEventListener("click", function () {
    searchInput.value = ""; searchWrap.hidden = true; go("#/");
  });

  route();
})();
