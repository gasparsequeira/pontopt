/* ═══════════════════════════════════════════════════════════════════════════
   Uma onda de pontos, à maneira das demos.

   A técnica é antiga e de toda a gente: uma grelha de pontos no plano, a
   altura dada por senos que andam com o tempo, projectada em perspectiva.
   Está escrita de raiz — não é o código de ninguém, só o método.

   Sem bibliotecas, sem pedidos de rede. Quem pedir menos movimento leva um
   único fotograma, parado.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var tela = document.getElementById("onda");
  if (!tela || !tela.getContext) return;

  var ctx = tela.getContext("2d");
  var LADO = 406;
  var COLS = 96, FILAS = 78;       // 7488 pontos, malha mais fina
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  tela.width = LADO * dpr;
  tela.height = LADO * dpr;
  ctx.scale(dpr, dpr);

  var parado = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function desenha(t) {
    ctx.fillStyle = "#0b0c0b";
    ctx.fillRect(0, 0, LADO, LADO);

    var inclina = 0.52;              // quanto se vê o plano de cima
    var giro = t * 0.00016;          // rotação em torno do eixo vertical
    var cosG = Math.cos(giro), senG = Math.sin(giro);

    for (var i = 0; i < COLS; i++) {
      for (var j = 0; j < FILAS; j++) {
        var x = (i / (COLS - 1) - 0.5) * 2;
        var z = (j / (FILAS - 1) - 0.5) * 2;

        // duas ondas cruzadas, de períodos diferentes, para não repetir cedo
        var y = Math.sin(x * 2.6 + t * 0.0026) * 0.20
              + Math.cos(z * 3.1 - t * 0.0019) * 0.16
              + Math.sin((x + z) * 1.7 + t * 0.0012) * 0.10;

        var rx = x * cosG - z * senG;
        var rz = x * senG + z * cosG;

        var prof = rz + 2.6;                    // afasta a câmara
        if (prof < 0.35) continue;
        var k = 1.55 / prof;                    // perspectiva

        var px = LADO / 2 + rx * k * LADO * 0.42;
        var py = LADO / 2 + (y - rz * inclina) * k * LADO * 0.42 + LADO * 0.06;

        if (px < 0 || px > LADO || py < 0 || py > LADO) continue;

        // os pontos longe apagam-se; os próximos ficam maiores
        var luz = Math.max(0, Math.min(1, (2.15 - prof * 0.62)));
        luz = luz * luz;                        // o longe dissolve-se mais depressa
        var tam = k > 0.70 ? 1.5 : 1;
        ctx.fillStyle = "rgba(232,234,229," + (0.06 + luz * 0.88).toFixed(3) + ")";
        ctx.fillRect(px, py, tam, tam);
      }
    }
  }

  if (parado) {
    desenha(0);
    return;
  }

  var inicio = null, decorrido = 0, pausa = 0;
  function passo(agora) {
    if (inicio === null) inicio = agora;
    decorrido = agora - inicio - pausa;
    desenha(decorrido);
    if (!document.hidden) requestAnimationFrame(passo);
  }

  /* com o separador escondido não há nada para ver: pára, e retoma de onde
     ficou em vez de dar um salto no tempo */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      pausa -= performance.now();
    } else {
      pausa += performance.now();
      requestAnimationFrame(passo);
    }
  });

  requestAnimationFrame(passo);
})();
