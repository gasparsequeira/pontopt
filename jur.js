/* ═══════════════════════════════════════════════════════════════════════════
   Jurisprudência: 21 acórdãos, ~20 000 palavras de sumário.

   Abertos todos ao mesmo tempo, são uma parede. Fechados sem mais, obrigam a
   abrir um a um às cegas. Por isso cada sumário fechado mostra a primeira
   linha — o suficiente para se saber se vale a pena abrir.

   Os descritores já lá estavam, mas eram enfeite. Agora filtram.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var list = document.querySelector(".writings-list");
  var rail = document.getElementById("rail");
  var input = document.getElementById("jurSearch");
  var countEl = document.getElementById("jurCount");
  var tagBox = document.getElementById("jurTags");
  var toggleAll = document.getElementById("jurToggleAll");
  if (!list) return;

  var cases = Array.prototype.slice.call(list.querySelectorAll(":scope > .writing-item"));
  var TOTAL = cases.length;

  function fold(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function slug(s) {
    return fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  }

  /* ── primeira linha do sumário, para se ver sem abrir ──────────────────── */

  cases.forEach(function (c) {
    var det = c.querySelector(".sumario");
    if (!det) return;
    var label = det.querySelector(".sumario-label");
    var first = det.querySelector("p");
    if (!label || !first) return;

    var txt = first.textContent.replace(/\s+/g, " ").trim();
    // saltar a numeração romana com que quase todos abrem ("I - ", "1. ")
    txt = txt.replace(/^(?:[IVXL]+|\d+)\s*[-–.)]\s*/, "");

    var peek = document.createElement("span");
    peek.className = "sumario-peek";
    peek.textContent = txt.slice(0, 96) + (txt.length > 96 ? "…" : "");
    label.appendChild(peek);
  });

  /* ── descritores: de enfeite a filtro ─────────────────────────────────── */

  var tagsOf = new Map();   // caso -> Set de descritores
  var allTags = new Map();  // descritor -> nº de acórdãos

  cases.forEach(function (c) {
    var set = new Set();
    c.querySelectorAll(".descritores li").forEach(function (li) {
      var t = li.textContent.replace(/\s+/g, " ").trim();
      if (!t) return;
      set.add(t);
      allTags.set(t, (allTags.get(t) || 0) + 1);
    });
    tagsOf.set(c, set);
  });

  var active = new Set();

  /* só vale a pena oferecer como filtro o que aparece em mais do que um
     acórdão — o resto encontra-se pela caixa de texto */
  var offered = Array.from(allTags.entries())
    .filter(function (e) { return e[1] > 1; })
    .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0], "pt"); });

  if (tagBox) {
    offered.forEach(function (e) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-chip";
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = e[0];

      var n = document.createElement("span");
      n.className = "chip-n";
      n.textContent = e[1];
      btn.appendChild(n);

      btn.addEventListener("click", function () {
        if (active.has(e[0])) { active.delete(e[0]); btn.classList.remove("active"); btn.setAttribute("aria-pressed", "false"); }
        else { active.add(e[0]); btn.classList.add("active"); btn.setAttribute("aria-pressed", "true"); }
        apply();
      });

      tagBox.appendChild(btn);
    });

    // também clicáveis onde já estavam, dentro de cada acórdão
    cases.forEach(function (c) {
      c.querySelectorAll(".descritores li").forEach(function (li) {
        var t = li.textContent.replace(/\s+/g, " ").trim();
        if (!allTags.has(t) || allTags.get(t) < 2) return;
        li.classList.add("is-clickable");
        li.setAttribute("role", "button");
        li.setAttribute("tabindex", "0");
        li.title = "filtrar por «" + t + "»";
        function pick() {
          var chip = Array.prototype.find.call(tagBox.children, function (b) {
            return b.firstChild && b.firstChild.nodeValue === t;
          });
          if (chip) { chip.click(); chip.scrollIntoView({ block: "nearest" }); }
        }
        li.addEventListener("click", pick);
        li.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); }
        });
      });
    });
  }

  /* ── carril: os tribunais ─────────────────────────────────────────────── */

  var railLinks = {};
  var headings = Array.prototype.slice.call(
    list.querySelectorAll(":scope > .jur-group, :scope > .jur-court")
  );

  headings.forEach(function (h, i) {
    if (!h.id) h.id = "c-" + (slug(h.textContent) || "tribunal") + "-" + i;
  });

  /* que acórdãos pertencem a cada cabeçalho */
  function casesUnder(h) {
    var out = [], n = h.nextElementSibling;
    while (n) {
      if (n.classList.contains("jur-group") || n.classList.contains("jur-court")) break;
      if (n.classList.contains("writing-item")) out.push(n);
      n = n.nextElementSibling;
    }
    return out;
  }

  var groups = headings.map(function (h) {
    return { el: h, id: h.id, isCourt: h.classList.contains("jur-court"), items: casesUnder(h) };
  });

  if (rail) {
    var title = document.createElement("p");
    title.className = "rail-title";
    title.textContent = "tribunais";
    rail.appendChild(title);

    var ol = document.createElement("ol");
    ol.className = "rail-list";

    groups.forEach(function (g) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + g.id;
      a.textContent = g.el.textContent.replace(/\s+/g, " ").trim();
      if (!g.isCourt) a.className = "is-group";

      if (g.items.length) {
        var c = document.createElement("span");
        c.className = "rail-count";
        c.textContent = g.items.length;
        a.appendChild(c);
      }

      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        g.el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + g.id);
      });

      li.appendChild(a);
      ol.appendChild(li);
      railLinks[g.id] = a;
    });

    rail.appendChild(ol);
  }

  var LINE = 96;
  var marks = [];

  function measure() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    marks = groups
      .filter(function (g) { return g.el.offsetParent !== null; })
      .map(function (g) { return { g: g, top: g.el.getBoundingClientRect().top + y }; });
  }

  function spy() {
    if (!marks.length || !rail) return;
    var y = (window.pageYOffset || document.documentElement.scrollTop || 0) + LINE;
    var current = marks[0].g;
    for (var i = 0; i < marks.length; i++) {
      if (marks[i].top <= y) current = marks[i].g;
      else break;
    }
    groups.forEach(function (g) {
      var a = railLinks[g.id];
      if (!a) return;
      if (g === current) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  function refresh() { measure(); spy(); }

  /* ── realce ───────────────────────────────────────────────────────────── */

  function unmark(root) {
    var ms = root.querySelectorAll("mark");
    for (var i = 0; i < ms.length; i++) {
      ms[i].parentNode.replaceChild(document.createTextNode(ms[i].textContent), ms[i]);
    }
    if (ms.length) root.normalize();
  }

  function mark(root, needle) {
    if (!needle) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (n.parentNode.closest("mark, .rail, .tag-filter, .sumario-peek")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var hits = [], n;
    while ((n = w.nextNode())) if (fold(n.nodeValue).indexOf(needle) !== -1) hits.push(n);

    hits.forEach(function (node) {
      var hay = fold(node.nodeValue), frag = document.createDocumentFragment(), at = 0, i;
      while ((i = hay.indexOf(needle, at)) !== -1) {
        if (i > at) frag.appendChild(document.createTextNode(node.nodeValue.slice(at, i)));
        var m = document.createElement("mark");
        m.textContent = node.nodeValue.slice(i, i + needle.length);
        frag.appendChild(m);
        at = i + needle.length;
      }
      if (at < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(at)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ── filtrar ──────────────────────────────────────────────────────────── */

  var empty = document.createElement("p");
  empty.className = "filter-empty";
  empty.hidden = true;
  list.parentNode.insertBefore(empty, list.nextSibling);

  function apply() {
    var q = input ? fold(input.value.trim()) : "";
    unmark(list);

    var shown = 0;

    cases.forEach(function (c) {
      var byTag = active.size === 0 || Array.from(active).every(function (t) {
        return tagsOf.get(c).has(t);
      });
      var byText = !q || fold(c.textContent).indexOf(q) !== -1;
      var ok = byTag && byText;
      c.classList.toggle("is-filtered-out", !ok);
      if (ok) shown++;
    });

    // um cabeçalho sem acórdãos por baixo não tem que ficar a ocupar espaço
    groups.forEach(function (g) {
      var any = g.items.some(function (c) { return !c.classList.contains("is-filtered-out"); });
      var alive = g.isCourt ? any : true;
      if (!g.isCourt) {
        // o grupo ("Nacional") só desaparece se nenhum tribunal dele sobreviver
        var idx = groups.indexOf(g), sub = false;
        for (var i = idx + 1; i < groups.length; i++) {
          if (!groups[i].isCourt) break;
          if (groups[i].items.some(function (c) { return !c.classList.contains("is-filtered-out"); })) sub = true;
        }
        alive = sub || any;
      }
      g.el.classList.toggle("is-filtered-out", !alive);
      if (railLinks[g.id]) railLinks[g.id].classList.toggle("is-empty", !alive);
    });

    if (q) mark(list, q);

    var filtering = q || active.size;
    if (countEl) {
      countEl.textContent = filtering ? shown + " de " + TOTAL + " acórdãos" : "";
      countEl.classList.toggle("is-none", filtering && shown === 0);
    }

    empty.hidden = !(filtering && shown === 0);
    if (!empty.hidden) empty.textContent = "Nenhum acórdão corresponde a esse critério.";

    refresh();
  }

  if (input) {
    input.addEventListener("input", apply);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; apply(); input.blur(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      input.focus();
      input.select();
    });
  }

  /* ── abrir / fechar todos os sumários ─────────────────────────────────── */

  if (toggleAll) {
    toggleAll.addEventListener("click", function () {
      var dets = list.querySelectorAll(".sumario");
      var anyClosed = Array.prototype.some.call(dets, function (d) { return !d.open; });
      Array.prototype.forEach.call(dets, function (d) { d.open = anyClosed; });
      toggleAll.textContent = anyClosed ? "fechar sumários" : "abrir sumários";
      refresh();
    });
  }

  list.addEventListener("toggle", function () { refresh(); }, true);

  window.addEventListener("scroll", spy, { passive: true });
  window.addEventListener("resize", refresh, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  refresh();
})();
