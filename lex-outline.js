/* ═══════════════════════════════════════════════════════════════════════════
   Sumário lateral, secções que abrem e fecham, e um filtro que serve.

   Tudo se constrói a partir do que já está no HTML. Acrescentar uma fonte
   continua a ser escrever um <li> com um <a>; o carril, a contagem e o filtro
   apanham-na sozinhos.

   O filtro antigo escondia a secção inteira quando o texto não casava — quem
   procurasse "marcas" perdia a secção onde as marcas estão. Este casa ao nível
   da folha, guarda os pais que dão contexto, e diz quantos encontrou.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var list = document.querySelector(".writings-list");
  var rail = document.getElementById("rail");
  var input = document.getElementById("lexSearch");
  var countEl = document.getElementById("lexCount");
  var toggleAll = document.getElementById("toggleAll");
  if (!list) return;

  var STORE = "lex.collapsed.v1";
  var sections = Array.prototype.slice.call(list.children).filter(function (el) {
    return el.classList && el.classList.contains("writing-item");
  });

  /* ── nomes e âncoras ───────────────────────────────────────────────────── */

  function slug(s) {
    return s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  function labelOf(sec) {
    var t = sec.querySelector(":scope > .writing-title");
    if (t) return t.textContent.replace(/\s+/g, " ").trim();
    var a = sec.querySelector(":scope > a");
    return a ? a.textContent.replace(/\s+/g, " ").trim() : "secção";
  }

  /* quantas fontes (ligações) guarda a secção */
  function tallyOf(sec) {
    return sec.querySelectorAll("a[href]").length;
  }

  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { saved = {}; }

  function remember() {
    var state = {};
    sections.forEach(function (sec) {
      if (sec.classList.contains("is-collapsed")) state[sec.id] = 1;
    });
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* modo privado */ }
  }

  /* ── preparar cada secção ──────────────────────────────────────────────── */

  var used = Object.create(null);
  var entries = [];

  sections.forEach(function (sec, i) {
    var label = labelOf(sec);
    var id = "s-" + (slug(label) || "seccao");
    while (used[id]) id = id + "-" + i;
    used[id] = 1;
    sec.id = id;

    var titleSpan = sec.querySelector(":scope > .writing-title");
    var sublist = sec.querySelector(":scope > .writing-sublist");
    var tally = tallyOf(sec);

    // só faz sentido abrir/fechar quem tem conteúdo por baixo
    if (titleSpan && sublist) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sect-toggle";
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-controls", id + "-body");
      sublist.id = id + "-body";

      var tri = document.createElement("span");
      tri.className = "sect-tri";
      tri.setAttribute("aria-hidden", "true");

      var lab = document.createElement("span");
      lab.className = "sect-label";
      while (titleSpan.firstChild) lab.appendChild(titleSpan.firstChild);

      var num = document.createElement("span");
      num.className = "sect-tally";
      num.textContent = tally + (tally === 1 ? " fonte" : " fontes");

      btn.appendChild(tri);
      btn.appendChild(lab);
      btn.appendChild(num);
      titleSpan.appendChild(btn);

      btn.addEventListener("click", function () {
        var open = sec.classList.toggle("is-collapsed") === false;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        remember();
        if (rail && rail.__spy) rail.__spy();
      });

      if (saved[id]) {
        sec.classList.add("is-collapsed");
        btn.setAttribute("aria-expanded", "false");
      }
    }

    entries.push({ el: sec, id: id, label: label, tally: tally });
  });

  /* ── carril ────────────────────────────────────────────────────────────── */

  var railLinks = {};

  if (rail) {
    var h = document.createElement("p");
    h.className = "rail-title";
    h.textContent = "secções";
    rail.appendChild(h);

    var ol = document.createElement("ol");
    ol.className = "rail-list";

    entries.forEach(function (e) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + e.id;
      a.textContent = e.label;

      var c = document.createElement("span");
      c.className = "rail-count";
      c.textContent = e.tally;
      a.appendChild(c);

      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        // uma secção fechada abre-se para receber quem a vem visitar
        if (e.el.classList.contains("is-collapsed")) {
          e.el.classList.remove("is-collapsed");
          var b = e.el.querySelector(".sect-toggle");
          if (b) b.setAttribute("aria-expanded", "true");
          remember();
        }
        e.el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + e.id);
      });

      li.appendChild(a);
      ol.appendChild(li);
      railLinks[e.id] = a;
    });

    rail.appendChild(ol);
  }

  /* ── onde estou ────────────────────────────────────────────────────────── */

  /* Uma conta de posições, não um IntersectionObserver: secções com 1500px de
     altura entram e saem mal de qualquer banda que se escolha, e assim o
     comportamento é o mesmo em todo o lado — a secção activa é a última cuja
     cabeceira já passou a linha de leitura.                                   */
  if (rail) {
    var LINE = 96;
    var marks = [];

    /* Medir uma vez, comparar sempre. O handler de scroll só lê scrollY —
       não toca no layout, e por isso não precisa de estrangulamento nenhum. */
    function measure() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      marks = entries
        .filter(function (e) { return !e.el.classList.contains("is-filtered-out"); })
        .map(function (e) { return { e: e, top: e.el.getBoundingClientRect().top + y }; });
    }

    function spy() {
      if (!marks.length) return;

      var y = (window.pageYOffset || document.documentElement.scrollTop || 0) + LINE;
      var doc = document.documentElement;
      var atBottom = y - LINE + window.innerHeight >= doc.scrollHeight - 4;

      var current = atBottom ? marks[marks.length - 1].e : marks[0].e;
      if (!atBottom) {
        for (var i = 0; i < marks.length; i++) {
          if (marks[i].top <= y) current = marks[i].e;
          else break;
        }
      }

      entries.forEach(function (e) {
        var a = railLinks[e.id];
        if (!a) return;
        if (e === current) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }

    function refresh() { measure(); spy(); }

    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", refresh, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    refresh();

    // filtrar ou fechar secções muda as alturas: é preciso remedir
    rail.__spy = refresh;
  }

  /* ── realce ────────────────────────────────────────────────────────────── */

  function unmark(root) {
    var marks = root.querySelectorAll("mark");
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
    }
    if (marks.length) root.normalize();
  }

  function mark(root, needle) {
    if (!needle) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (p.closest("mark, .sect-tally, .rail, .src")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var targets = [], n;
    while ((n = walker.nextNode())) {
      if (fold(n.nodeValue).indexOf(needle) !== -1) targets.push(n);
    }

    targets.forEach(function (node) {
      var hay = fold(node.nodeValue);
      var frag = document.createDocumentFragment();
      var at = 0, hit;
      while ((hit = hay.indexOf(needle, at)) !== -1) {
        if (hit > at) frag.appendChild(document.createTextNode(node.nodeValue.slice(at, hit)));
        var m = document.createElement("mark");
        m.textContent = node.nodeValue.slice(hit, hit + needle.length);
        frag.appendChild(m);
        at = hit + needle.length;
      }
      if (at < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(at)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* acentos não deviam atrapalhar quem procura "codigo" */
  function fold(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  /* ── filtro ────────────────────────────────────────────────────────────── */

  var empty = document.createElement("p");
  empty.className = "filter-empty";
  empty.hidden = true;
  list.parentNode.insertBefore(empty, list.nextSibling);

  var TOTAL = list.querySelectorAll("a[href]").length;

  function ownText(li) {
    // o texto do próprio item, sem o das sub-listas que lhe pendem
    var clone = li.cloneNode(true);
    clone.querySelectorAll(".writing-sublist, .sect-tally").forEach(function (n) { n.remove(); });
    return fold(clone.textContent.replace(/\s+/g, " "));
  }

  function clear() {
    list.querySelectorAll(".is-filtered-out").forEach(function (n) { n.classList.remove("is-filtered-out"); });
    list.querySelectorAll(".is-context").forEach(function (n) { n.classList.remove("is-context"); });
    Object.keys(railLinks).forEach(function (k) { railLinks[k].classList.remove("is-empty"); });
    unmark(list);
    empty.hidden = true;
    if (countEl) { countEl.textContent = ""; countEl.classList.remove("is-none"); }
  }

  function apply() {
    var q = fold(input.value.trim());
    clear();
    if (!q) return;

    var hits = 0;

    sections.forEach(function (sec) {
      var secHit = ownText(sec).indexOf(q) !== -1;
      var items = Array.prototype.slice.call(sec.querySelectorAll("li"));
      var keep = new Set();
      var localHits = 0;

      if (secHit) {
        // o nome da secção casou: fica inteira
        localHits = sec.querySelectorAll("a[href]").length;
      } else {
        items.forEach(function (li) {
          if (ownText(li).indexOf(q) === -1) return;
          localHits += Math.max(1, li.querySelectorAll(":scope > a[href]").length);
          keep.add(li);
          // os pais ficam, para não se perder de onde vem a norma
          var p = li.parentElement;
          while (p && p !== sec) {
            if (p.tagName === "LI") keep.add(p);
            p = p.parentElement;
          }
        });

        items.forEach(function (li) {
          if (keep.has(li)) {
            if (ownText(li).indexOf(q) === -1) li.classList.add("is-context");
          } else {
            li.classList.add("is-filtered-out");
          }
        });
      }

      hits += localHits;

      if (localHits === 0) {
        sec.classList.add("is-filtered-out");
        if (railLinks[sec.id]) railLinks[sec.id].classList.add("is-empty");
      } else {
        // uma secção fechada que tenha resultados abre-se sozinha
        if (sec.classList.contains("is-collapsed")) {
          sec.classList.remove("is-collapsed");
          var b = sec.querySelector(".sect-toggle");
          if (b) b.setAttribute("aria-expanded", "true");
        }
      }
    });

    mark(list, q);

    if (countEl) {
      countEl.textContent = hits + " de " + TOTAL;
      countEl.classList.toggle("is-none", hits === 0);
    }

    if (hits === 0) {
      empty.hidden = false;
      empty.textContent = "Nada para «" + input.value.trim() + "».";
    }

    if (rail && rail.__spy) rail.__spy();
  }

  if (input) {
    input.addEventListener("input", apply);

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        input.value = "";
        apply();
        input.blur();
      }
    });

    // "/" põe o cursor no filtro, como em qualquer sítio que se preze
    document.addEventListener("keydown", function (e) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      input.focus();
      input.select();
    });
  }

  /* ── abrir / fechar tudo ───────────────────────────────────────────────── */

  if (toggleAll) {
    toggleAll.addEventListener("click", function () {
      var anyOpen = sections.some(function (s) {
        return s.querySelector(".sect-toggle") && !s.classList.contains("is-collapsed");
      });
      sections.forEach(function (s) {
        var b = s.querySelector(".sect-toggle");
        if (!b) return;
        s.classList.toggle("is-collapsed", anyOpen);
        b.setAttribute("aria-expanded", anyOpen ? "false" : "true");
      });
      toggleAll.textContent = anyOpen ? "expandir tudo" : "colapsar tudo";
      remember();
      if (rail && rail.__spy) rail.__spy();
    });

    var startCollapsed = sections.every(function (s) {
      return !s.querySelector(".sect-toggle") || s.classList.contains("is-collapsed");
    });
    toggleAll.textContent = startCollapsed ? "expandir tudo" : "colapsar tudo";
  }

  /* chegar por #âncora a uma secção fechada deve abri-la */
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains("is-collapsed")) {
      target.classList.remove("is-collapsed");
      var tb = target.querySelector(".sect-toggle");
      if (tb) tb.setAttribute("aria-expanded", "true");
    }
  }
})();
