/* ═══════════════════════════════════════════════════════════════════════════
   Proveniência das fontes.

   Cada ligação diz de onde vem, e a etiqueta é deduzida do próprio href — não
   há nada para manter à mão. Acrescentar uma lei nova continua a ser escrever
   um <li> com um <a> lá dentro; a marca aparece sozinha.

   A única marca que não se deduz do domínio é a digitalização anotada pelo
   próprio: essa reconhece-se pela nota de copyright que já acompanha o link.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // ordem importa: a primeira regra que casar é a que vale
  var RULES = [
    { test: /pgdlisboa\.pt/i,                 label: "PGDL",     title: "Procuradoria-Geral Distrital de Lisboa" },
    { test: /diariodarepublica\.pt|dre\.pt/i, label: "DR",       title: "Diário da República" },
    { test: /eur-lex\.europa\.eu/i,           label: "EUR-Lex",  title: "EUR-Lex" },
    { test: /europarl\.europa\.eu|oeil\./i,   label: "PE",       title: "Parlamento Europeu" },
    { test: /curia\.europa\.eu/i,             label: "TJUE",     title: "Tribunal de Justiça da UE" },
    { test: /tribunalconstitucional\.pt/i,    label: "TC",       title: "Tribunal Constitucional" },
    { test: /dgsi\.pt/i,                      label: "DGSI",     title: "DGSI" },
    { test: /direitoemdia\.pt/i,              label: "DED",      title: "Direito em Dia" },
    { test: /igac\.gov\.pt/i,                 label: "IGAC",     title: "IGAC" },
    { test: /inpi\.pt|aopi\.pt/i,             label: "INPI/AOPI", title: "INPI · AOPI" },
    { test: /arbitrare\.pt/i,                 label: "ARBITRARE", title: "ARBITRARE" },
    { test: /icann\.org/i,                    label: "ICANN",    title: "ICANN" },
    { test: /legifrance\.gouv\.fr/i,          label: "Légifrance", title: "Légifrance" },
    { test: /gdpr-info\.eu/i,                 label: "GDPR-INFO", title: "gdpr-info.eu" },
    { test: /springlex\.eu/i,                 label: "SpringLex", title: "SpringLex" }
  ];

  function classify(a) {
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return null;

    var external = /^https?:\/\//i.test(href);

    if (external) {
      for (var i = 0; i < RULES.length; i++) {
        if (RULES[i].test.test(href)) return RULES[i];
      }
      // domínio desconhecido: mostra-o tal como é, sem www
      var host = "";
      try {
        host = new URL(href).hostname.replace(/^www\./, "");
      } catch (e) {
        return null;
      }
      return { label: host, title: host, plain: true };
    }

    if (/\.pdf$/i.test(href)) return { label: "PDF", title: "ficheiro PDF", pdf: true };
    return null; // ligação interna do próprio sítio: não precisa de marca
  }

  /* A digitalização anotada pelo próprio já se anuncia pela nota de copyright
     que está a seguir ao link. Reconhecemo-la por aí, trocamos a nota — que
     repete "© 2026 Diogo Gaspar Sequeira" dezenas de vezes — por uma marca só. */
  function ownScan(a) {
    var n = a.nextElementSibling;
    while (n && n.tagName === "BR") n = n.nextElementSibling;
    if (!n || n.tagName !== "SPAN") return null;
    if (!/Diogo Gaspar Sequeira/i.test(n.textContent)) return null;
    return n;
  }

  function badge(label, title, cls) {
    var s = document.createElement("span");
    s.className = "src" + (cls ? " " + cls : "");
    s.textContent = label;
    if (title) s.title = title;
    return s;
  }

  /* Uma marca que repete o texto da ligação não informa nada — "PGDL PGDL".
     Nesses casos a ligação já se apresenta sozinha, e calamo-nos.             */
  function redundant(a, label) {
    var t = a.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    var l = label.toLowerCase();
    if (t === l) return true;
    if (t.length < 40 && t.indexOf(l) !== -1) return true;
    // "INPI/AOPI" contra um link que diz só "AOPI"
    return l.split("/").some(function (part) { return part && t === part; });
  }

  var seen = Object.create(null);
  var list = document.querySelector(".writings-list");
  if (!list) return;

  var links = list.querySelectorAll("a[href]");
  for (var i = 0; i < links.length; i++) {
    var a = links[i];
    if (a.querySelector(".src")) continue;

    var scanNote = ownScan(a);
    if (scanNote) {
      scanNote.parentNode.removeChild(scanNote);
      a.insertAdjacentElement("afterend", badge("anotado", "digitalização sublinhada e anotada por Diogo Gaspar Sequeira", "src--scan"));
      seen["anotado"] = { label: "anotado", desc: "digitalização anotada pelo próprio", cls: "src--scan" };
      continue;
    }

    var kind = classify(a);
    if (!kind) continue;
    if (redundant(a, kind.label)) continue;

    a.insertAdjacentElement("afterend", badge(kind.label, kind.title, kind.pdf ? "src--pdf" : ""));
    if (!kind.plain) {
      seen[kind.label] = { label: kind.label, desc: kind.title, cls: kind.pdf ? "src--pdf" : "" };
    }
  }

  /* Legenda: só o vocabulário que se repete o suficiente para valer a pena
     explicar. As restantes marcas dizem o nome da casa por extenso e
     dispensam nota de rodapé. */
  var legend = document.getElementById("srcLegend");
  if (!legend) return;

  var EXPLAIN = ["anotado", "PGDL", "DR", "EUR-Lex", "PDF"];

  EXPLAIN.forEach(function (k) {
    var e = seen[k];
    if (!e) return;
    var row = document.createElement("div");
    var dt = document.createElement("dt");
    dt.appendChild(badge(e.label, "", e.cls));
    var dd = document.createElement("dd");
    dd.textContent = e.desc;
    row.appendChild(dt);
    row.appendChild(dd);
    legend.appendChild(row);
  });
})();
