/* ===========================================================================
   POUCH CLUB — la ruleta
   ---------------------------------------------------------------------------
   Canvas dibujado a mano: bisel dorado, bombillos, segmentos biselados,
   trinquete con resorte que golpea en cada separador y sonido de clac.
   El premio se decide ANTES de girar (por peso, en app.js); la rueda solo
   se encarga de aterrizar donde corresponde.
   =========================================================================== */

(function () {
  "use strict";

  var TAU = Math.PI * 2;

  var GAJOS = 16;   /* cuántos gajos tiene la rueda */

  var SKIN = {
    nada:   { fill: ["#07432C", "#042A1C"], text: "rgba(247,242,232,.82)" },
    comun:  { fill: ["#A7C196", "#71906A"], text: "#07301F" },
    raro:   { fill: ["#179C7E", "#0B6552"], text: "#F7F2E8" },
    gratis: { fill: ["#F0C43F", "#C2900F"], text: "#2E2102" }
  };

  /* A cada premio le toca un color según qué es, no según su id: así se
     pueden renombrar o cambiar los premios sin tocar esta parte. */
  function pieles(premios) {
    var conPrecio = premios.filter(function (p) { return p.tipo === "precio"; })
                           .sort(function (a, b) { return b.peso - a.peso; });
    var mapa = {};
    premios.forEach(function (p) {
      if (p.tipo === "nada") mapa[p.id] = SKIN.nada;
      else if (p.tipo === "gratis") mapa[p.id] = SKIN.gratis;
      else mapa[p.id] = (conPrecio.indexOf(p) === 0) ? SKIN.comun : SKIN.raro;
    });
    return mapa;
  }

  /* Reparte los gajos en proporción a los pesos (mínimo uno por premio) y los
     entrelaza, para que los premios raros queden separados entre sí y no
     amontonados. Cada gajo recibe una posición ideal entre 0 y 1 y después se
     ordena por esa posición. */
  function repartir(premios, n) {
    var suma = premios.reduce(function (a, p) { return a + Math.max(0, p.peso); }, 0) || 1;

    /* cuántos gajos le tocan a cada uno, repartiendo los restos al mayor */
    var cupos = premios.map(function (p) {
      var exacto = Math.max(0, p.peso) / suma * n;
      var base = Math.floor(exacto);
      /* a quien le prestamos el gajo mínimo lo dejamos fuera del reparto de
         sobrantes: ya recibió más de lo que le tocaba */
      return { p: p, n: Math.max(1, base), resto: base < 1 ? -1 : exacto - base };
    });
    var usados = cupos.reduce(function (a, c) { return a + c.n; }, 0);
    var sobran = cupos.slice().sort(function (a, b) { return b.resto - a.resto; });
    var i = 0;
    while (usados < n) { sobran[i % sobran.length].n++; usados++; i++; }
    while (usados > n) {
      var mayor = cupos.slice().sort(function (a, b) { return b.n - a.n; })[0];
      if (mayor.n <= 1) break;
      mayor.n--; usados--;
    }

    /* Cada premio arranca con un desfase distinto, si no los que tienen un solo
       gajo caerían todos en el mismo punto y quedarían pegados. */
    var puestos = [];
    cupos.forEach(function (c, idx) {
      var fase = (idx + 0.5) / cupos.length;
      for (var k = 0; k < c.n; k++) puestos.push({ p: c.p, pos: (k + fase) / c.n });
    });
    puestos.sort(function (a, b) { return a.pos - b.pos; });
    return puestos.map(function (x) { return x.p; });
  }

  /* ---------- escudo redondo del centro ----------
     Se carga una sola vez y, cuando llega, se pide un redibujo de cada rueda
     que ya esté en pantalla. Si el archivo no cargara, el centro se dibuja
     igual (solo sin el escudo), no se rompe nada. */
  var ESCUDO = null, ESCUDO_OK = false;
  var RUEDAS = [];

  /* Acabado del escudo del centro:
       "crema"      escudo crema dentro del aro dorado  (el que está puesto)
       "oro"        escudo dorado dentro del aro dorado
       "oro-limpio" escudo dorado grande, SIN aro: el escudo mismo hace de borde */
  var ESCUDO_ACABADO = "oro-limpio";
  var escudoCache = {};

  /* Repinta el escudo con el mismo metal dorado del aro. El escudo entra como
     recorte (source-in), así el degradado solo cae donde hay dibujo y el
     monograma calado sigue dejando ver el fondo. */
  function escudoDorado(lado) {
    var k = Math.round(lado);
    if (escudoCache[k]) return escudoCache[k];
    var cv = document.createElement("canvas");
    cv.width = cv.height = k;
    var x = cv.getContext("2d");
    x.drawImage(ESCUDO, 0, 0, k, k);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = conic(x, k / 2, k / 2, [
      [0, "#8A6708"], [0.09, "#F6E7AC"], [0.19, "#C9981A"], [0.28, "#7B5A06"],
      [0.39, "#FBF0C4"], [0.5, "#B98C12"], [0.61, "#6E5005"], [0.72, "#F6E6A8"],
      [0.82, "#C0920F"], [0.92, "#7B5A06"], [1, "#8A6708"]
    ], -Math.PI / 2);
    x.fillRect(0, 0, k, k);
    escudoCache[k] = cv;
    return cv;
  }

  function cargarEscudo() {
    if (ESCUDO) return;
    ESCUDO = new Image();
    ESCUDO.onload = function () {
      ESCUDO_OK = true;
      RUEDAS.forEach(function (w) { w.dirty = true; });
    };
    ESCUDO.onerror = function () { ESCUDO_OK = false; };
    ESCUDO.src = "img/logo-redondo-crema.svg";
  }

  /* ---------- sonido: un "clac" corto generado al vuelo ---------- */
  var actx = null, muted = false;
  function audio() {
    if (actx === null) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { actx = false; }
    }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function clack(strength) {
    var a = audio();
    if (!a || muted) return;
    var t = a.currentTime;
    var o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = "square";
    o.frequency.setValueAtTime(1400 + Math.random() * 220, t);
    o.frequency.exponentialRampToValueAtTime(260, t + 0.035);
    f.type = "bandpass"; f.frequency.value = 1700; f.Q.value = 1.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.085 * (strength || 1), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(f); f.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + 0.08);
  }
  function fanfare(win) {
    var a = audio();
    if (!a || muted) return;
    var notes = win ? [523.25, 659.25, 783.99, 1046.5] : [392, 329.6];
    notes.forEach(function (hz, i) {
      var t = a.currentTime + i * 0.11;
      var o = a.createOscillator(), g = a.createGain();
      o.type = "triangle"; o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + 0.45);
    });
  }

  /* ---------- helpers de dibujo ---------- */
  function conic(ctx, cx, cy, stops, rot) {
    var g;
    if (ctx.createConicGradient) {
      g = ctx.createConicGradient(rot || 0, cx, cy);
    } else {
      g = ctx.createLinearGradient(cx - 300, cy - 300, cx + 300, cy + 300);
    }
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }

  /* Archivo no trae el signo ₡, así que ese carácter lo dibuja Inter.
     Dibuja el texto alineado a la derecha, de derecha a izquierda. */
  function mixedRight(ctx, text, x, y, size, weight) {
    var runs = [], cur = "", curCol = /₡/.test(text[0]);
    for (var i = 0; i < text.length; i++) {
      var isCol = text[i] === "₡";
      if (isCol !== curCol && cur) { runs.push([cur, curCol]); cur = ""; }
      curCol = isCol; cur += text[i];
    }
    if (cur) runs.push([cur, curCol]);

    var fA = weight + " " + size + 'px Archivo, "Helvetica Neue", Arial, sans-serif';
    var fI = "600 " + Math.round(size * 0.84) + 'px Inter, "Helvetica Neue", Arial, sans-serif';
    var cx2 = x;
    for (var j = runs.length - 1; j >= 0; j--) {
      ctx.font = runs[j][1] ? fI : fA;
      ctx.fillText(runs[j][0], cx2, y);
      cx2 -= ctx.measureText(runs[j][0]).width;
    }
  }

  function roundedWedge(ctx, cx, cy, rOut, rIn, a0, a1) {
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, a0, a1);
    ctx.arc(cx, cy, rIn, a1, a0, true);
    ctx.closePath();
  }

  /* =========================================================================
     Wheel
     ========================================================================= */
  function Wheel(canvas, prizes, opts) {
    opts = opts || {};
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.prizes = {};
    prizes.forEach(function (p) { this.prizes[p.id] = p; }, this);
    this.piel = pieles(prizes);
    this.segs = repartir(prizes, GAJOS);
    this.n = this.segs.length;
    this.seg = TAU / this.n;

    this.rot = -this.seg * 0.5;
    this.pawl = 0;          // ángulo del trinquete
    this.pawlV = 0;         // velocidad angular del trinquete
    this.lastIdx = -1;
    this.spinning = false;
    this.glow = 0;          // 0..1, brillo de los bombillos
    this.chase = 0;
    this.showPointer = opts.pointer !== false;
    this.R = 0;

    this.resize();
    RUEDAS.push(this);
    cargarEscudo();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);

    if (document.fonts && document.fonts.ready) {
      var self = this;
      document.fonts.ready.then(function () { self.dirty = true; });
    }
  }

  Wheel.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var box = this.cv.getBoundingClientRect();
    var size = Math.round((box.width || this.cv.width) );
    if (!size) size = 620;
    this.cv.width = size * dpr;
    this.cv.height = size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = size;
    this.cx = size / 2;
    this.cy = size / 2;
    /* Con aguja hay que dejarle aire arriba: el soporte sobresale por encima
       del perno y, con el margen viejo, quedaba cortado por el borde. */
    this.R = size / 2 - (this.showPointer ? size * 0.05 : 2);
    this.dirty = true;
  };

  /* ---------- bisel exterior + bombillos (no gira) ---------- */
  Wheel.prototype._bezel = function () {
    var c = this.ctx, cx = this.cx, cy = this.cy, R = this.R;

    /* sombra proyectada */
    c.save();
    c.shadowColor = "rgba(0,0,0,.55)";
    c.shadowBlur = R * 0.13;
    c.shadowOffsetY = R * 0.05;
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fillStyle = "#07301F"; c.fill();
    c.restore();

    /* aro dorado con aspecto de metal cepillado */
    var ring = conic(c, cx, cy, [
      [0, "#8A6708"], [0.08, "#F3DE92"], [0.17, "#C9981A"], [0.26, "#7B5A06"],
      [0.37, "#EBCB63"], [0.5, "#B98C12"], [0.6, "#6E5005"], [0.7, "#F6E6A8"],
      [0.8, "#C0920F"], [0.9, "#775706"], [1, "#8A6708"]
    ], -Math.PI / 2);
    c.beginPath(); c.arc(cx, cy, R, 0, TAU);
    c.arc(cx, cy, R * 0.874, 0, TAU, true);
    c.fillStyle = ring; c.fill();

    /* filos del aro */
    c.lineWidth = Math.max(1, R * 0.008);
    c.beginPath(); c.arc(cx, cy, R - c.lineWidth / 2, 0, TAU);
    c.strokeStyle = "rgba(0,0,0,.45)"; c.stroke();
    c.beginPath(); c.arc(cx, cy, R * 0.878, 0, TAU);
    c.strokeStyle = "rgba(0,0,0,.5)"; c.stroke();
    c.beginPath(); c.arc(cx, cy, R * 0.962, 0, TAU);
    c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = Math.max(1, R * 0.005); c.stroke();

    /* bombillos */
    var N = 24, rr = R * 0.924, br = R * 0.026;
    for (var i = 0; i < N; i++) {
      var a = -Math.PI / 2 + (i / N) * TAU;
      var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      var lit = ((i + Math.floor(this.chase)) % 2 === 0);
      var k = lit ? 0.35 + this.glow * 0.65 : 0.12 + this.glow * 0.2;

      c.beginPath(); c.arc(x, y, br * 1.32, 0, TAU);
      c.fillStyle = "rgba(0,0,0,.4)"; c.fill();

      var g = c.createRadialGradient(x - br * 0.35, y - br * 0.4, br * 0.1, x, y, br);
      g.addColorStop(0, "rgba(255,252,230," + (0.95 * k + 0.05) + ")");
      g.addColorStop(0.55, "rgba(243,215,120," + (0.85 * k + 0.08) + ")");
      g.addColorStop(1, "rgba(120,88,8," + (0.6 * k + 0.35) + ")");
      c.beginPath(); c.arc(x, y, br, 0, TAU); c.fillStyle = g; c.fill();

      if (this.glow > 0.05 && lit) {
        c.save();
        c.globalCompositeOperation = "lighter";
        var hg = c.createRadialGradient(x, y, 0, x, y, br * 3.6);
        hg.addColorStop(0, "rgba(255,226,140," + (0.5 * this.glow) + ")");
        hg.addColorStop(1, "rgba(255,226,140,0)");
        c.beginPath(); c.arc(x, y, br * 3.6, 0, TAU); c.fillStyle = hg; c.fill();
        c.restore();
      }
    }
  };

  /* ---------- cara giratoria ---------- */
  Wheel.prototype._face = function () {
    var c = this.ctx, cx = this.cx, cy = this.cy, R = this.R;
    var rOut = R * 0.862, rIn = R * 0.3;

    c.save();
    c.translate(cx, cy);
    c.rotate(this.rot);

    for (var i = 0; i < this.n; i++) {
      var p = this.segs[i];
      var sk = this.piel[p.id] || SKIN.nada;
      var a0 = -Math.PI / 2 - this.seg / 2 + i * this.seg;
      var a1 = a0 + this.seg;
      var am = (a0 + a1) / 2;

      /* relleno con degradado radial del gajo */
      var g = c.createLinearGradient(
        Math.cos(am) * rIn, Math.sin(am) * rIn,
        Math.cos(am) * rOut, Math.sin(am) * rOut
      );
      g.addColorStop(0, sk.fill[1]);
      g.addColorStop(0.45, sk.fill[0]);
      g.addColorStop(1, sk.fill[1]);

      roundedWedge(c, 0, 0, rOut, rIn, a0, a1);
      c.fillStyle = g; c.fill();

      /* bisel: filo claro de un lado, oscuro del otro */
      c.save(); c.clip();
      c.lineWidth = R * 0.016;
      c.beginPath();
      c.moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn);
      c.lineTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut);
      c.strokeStyle = "rgba(255,255,255,.16)"; c.stroke();
      c.beginPath();
      c.moveTo(Math.cos(a1) * rIn, Math.sin(a1) * rIn);
      c.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
      c.strokeStyle = "rgba(0,0,0,.3)"; c.stroke();
      /* viñeta hacia el borde */
      var vg = c.createRadialGradient(0, 0, rOut * 0.6, 0, 0, rOut);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,.33)");
      c.fillStyle = vg; c.fill();
      c.restore();

      /* separador dorado */
      c.beginPath();
      c.moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn);
      c.lineTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut);
      c.lineWidth = Math.max(1, R * 0.0075);
      c.strokeStyle = "rgba(212,162,28,.75)";
      c.stroke();

      /* texto radial */
      c.save();
      c.rotate(am);
      c.textAlign = "right";
      c.textBaseline = "middle";
      var big = Math.round(R * (p.id === "nada" ? 0.082 : 0.092));
      c.fillStyle = sk.text;
      c.shadowColor = "rgba(0,0,0,.4)";
      c.shadowBlur = R * 0.012;
      c.shadowOffsetY = R * 0.004;
      mixedRight(c, p.corto, rOut - R * 0.055, 0, big, "800");
      c.shadowBlur = 0; c.shadowOffsetY = 0;

      /* punto dorado al final del gajo, como marca de premio */
      if (p.id !== "nada") {
        c.beginPath();
        c.arc(rIn + R * 0.055, 0, R * 0.013, 0, TAU);
        c.fillStyle = p.id === "gratis" ? "rgba(46,33,2,.5)" : "rgba(212,162,28,.9)";
        c.fill();
      }
      c.restore();
    }

    /* aro interno que remata los gajos */
    c.beginPath(); c.arc(0, 0, rOut, 0, TAU);
    c.lineWidth = Math.max(1.5, R * 0.012);
    c.strokeStyle = "rgba(212,162,28,.55)"; c.stroke();

    c.restore();
  };

  /* ---------- centro ---------- */
  Wheel.prototype._hub = function () {
    var c = this.ctx, cx = this.cx, cy = this.cy, R = this.R;
    var r = R * 0.3;

    c.save();
    c.shadowColor = "rgba(0,0,0,.5)";
    c.shadowBlur = R * 0.06;
    c.beginPath(); c.arc(cx, cy, r, 0, TAU);
    c.fillStyle = "#06402B"; c.fill();
    c.restore();

    var sinAro = (ESCUDO_ACABADO === "oro-limpio");

    if (!sinAro) {
      /* anillo dorado del centro */
      var g = conic(c, cx, cy, [
        [0, "#7B5A06"], [0.14, "#F1D982"], [0.3, "#B98C12"], [0.46, "#6E5005"],
        [0.62, "#EFD685"], [0.78, "#B0840F"], [0.9, "#7B5A06"], [1, "#7B5A06"]
      ], -Math.PI / 2);
      c.beginPath(); c.arc(cx, cy, r, 0, TAU);
      c.arc(cx, cy, r * 0.84, 0, TAU, true);
      c.fillStyle = g; c.fill();

      c.beginPath(); c.arc(cx, cy, r * 0.845, 0, TAU);
      c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = Math.max(1, R * 0.006); c.stroke();
    }

    /* escudo del club: viene en crema y con el "PC" calado, así que el verde
       del centro se ve a través del monograma */
    if (ESCUDO_OK) {
      /* sin aro el escudo crece hasta casi todo el cubo: pasa a ser el borde */
      var d = sinAro ? r * 1.94 : r * 1.46;
      c.save();
      if (ESCUDO_ACABADO === "crema") {
        c.globalAlpha = 0.95;
        c.drawImage(ESCUDO, cx - d / 2, cy - d / 2, d, d);
      } else {
        c.shadowColor = "rgba(0,0,0,.5)";
        c.shadowBlur = r * (sinAro ? 0.12 : 0.07);
        c.drawImage(escudoDorado(d), cx - d / 2, cy - d / 2, d, d);
      }
      c.restore();
    }

    /* tornillos (van sobre el aro, así que sin aro no se dibujan) */
    for (var i = 0; !sinAro && i < 6; i++) {
      var a = -Math.PI / 2 + (i / 6) * TAU + 0.52;
      var x = cx + Math.cos(a) * r * 0.92, y = cy + Math.sin(a) * r * 0.92;
      var sr = R * 0.011;
      c.beginPath(); c.arc(x, y, sr, 0, TAU);
      c.fillStyle = "rgba(60,44,4,.75)"; c.fill();
      c.beginPath(); c.arc(x - sr * 0.3, y - sr * 0.3, sr * 0.45, 0, TAU);
      c.fillStyle = "rgba(255,240,190,.5)"; c.fill();
    }
  };

  /* ---------- trinquete ---------- */
  Wheel.prototype._pointer = function () {
    if (!this.showPointer) return;
    var c = this.ctx, cx = this.cx, cy = this.cy, R = this.R;
    var px = cx, py = cy - R * 0.985;
    var L = R * 0.265, W = R * 0.075;

    /* soporte fijo detrás del perno */
    c.save();
    c.beginPath();
    c.moveTo(px - W * 1.5, py - W * 0.2);
    c.lineTo(px + W * 1.5, py - W * 0.2);
    c.lineTo(px + W * 0.75, py - W * 1.5);
    c.lineTo(px - W * 0.75, py - W * 1.5);
    c.closePath();
    var bg = c.createLinearGradient(px - W, py - W * 1.5, px + W, py);
    bg.addColorStop(0, "#5E4406"); bg.addColorStop(.5, "#B98C12"); bg.addColorStop(1, "#4A3504");
    c.fillStyle = bg; c.fill();
    c.restore();

    c.save();
    c.translate(px, py);
    c.rotate(this.pawl);

    /* sombra de la aguja sobre la rueda */
    c.save();
    c.shadowColor = "rgba(0,0,0,.6)";
    c.shadowBlur = R * 0.045;
    c.shadowOffsetY = R * 0.018;

    c.beginPath();
    c.moveTo(-W, 0);
    c.quadraticCurveTo(-W * 0.72, L * 0.62, 0, L);
    c.quadraticCurveTo(W * 0.72, L * 0.62, W, 0);
    c.quadraticCurveTo(0, -W * 0.55, -W, 0);
    c.closePath();
    var g = c.createLinearGradient(-W, 0, W, L);
    g.addColorStop(0, "#FBEDB4");
    g.addColorStop(0.35, "#D4A21C");
    g.addColorStop(0.72, "#9E7710");
    g.addColorStop(1, "#5E4406");
    c.fillStyle = g; c.fill();
    c.restore();

    c.lineWidth = Math.max(1, R * 0.005);
    c.strokeStyle = "rgba(60,42,2,.65)"; c.stroke();

    /* brillo central de la aguja */
    c.beginPath();
    c.moveTo(-W * 0.3, W * 0.1);
    c.quadraticCurveTo(-W * 0.18, L * 0.6, 0, L * 0.84);
    c.quadraticCurveTo(W * 0.1, L * 0.55, W * 0.14, W * 0.1);
    c.closePath();
    c.fillStyle = "rgba(255,247,214,.42)"; c.fill();

    /* perno */
    var pr = W * 0.92;
    var pg = c.createRadialGradient(-pr * 0.3, -pr * 0.35, pr * 0.1, 0, 0, pr);
    pg.addColorStop(0, "#FFF6D0");
    pg.addColorStop(0.5, "#D9AA25");
    pg.addColorStop(1, "#6B4E07");
    c.beginPath(); c.arc(0, 0, pr, 0, TAU); c.fillStyle = pg; c.fill();
    c.beginPath(); c.arc(0, 0, pr * 0.38, 0, TAU);
    c.fillStyle = "rgba(50,35,2,.8)"; c.fill();

    c.restore();
  };

  /* ---------- loop ---------- */
  Wheel.prototype._loop = function (now) {
    requestAnimationFrame(this._loop);

    var moving = this.spinning;

    /* resorte del trinquete */
    if (Math.abs(this.pawl) > 1e-4 || Math.abs(this.pawlV) > 1e-4) {
      this.pawlV += (-58 * this.pawl - 7.4 * this.pawlV) * (1 / 60);
      this.pawl += this.pawlV * (1 / 60);
      moving = true;
    } else { this.pawl = 0; this.pawlV = 0; }

    if (this.spinning) {
      var t = Math.min(1, (now - this.t0) / this.dur);
      this.rot = this.from + (this.to - this.from) * this.ease(t)
                 + this.over * this.rebote(t);

      /* ¿pasó un separador por la aguja? */
      var idx = this.indexAt();
      if (idx !== this.lastIdx) {
        if (this.lastIdx !== -1) {
          var speed = 1 - t;
          this.pawlV -= 2.6 + speed * 3.4;
          clack(0.35 + speed * 0.65);
        }
        this.lastIdx = idx;
      }

      this.chase += 0.55 * (1 - t) + 0.05;
      this.glow = Math.min(1, this.glow + 0.06);

      if (t >= 1) { this._finish(); }
    } else if (this.glow > 0) {
      this.glow = Math.max(0, this.glow - 0.012);
      this.chase += 0.04;
      moving = true;
    }

    if (!moving && !this.dirty) return;
    this.dirty = false;
    this.render();
  };

  /* cierra el giro una sola vez, venga de la animación o de la red de seguridad */
  Wheel.prototype._finish = function () {
    if (!this.spinning) return;
    clearTimeout(this._safety);
    this.spinning = false;
    this.rot = this.to;
    this.dirty = true;
    if (this.onDone) { var cb = this.onDone; this.onDone = null; cb(); }
  };

  /* Frenada: monótona, nunca se pasa del destino. */
  Wheel.prototype.ease = function (t) {
    t = t < 0 ? 0 : (t > 1 ? 1 : t);   // con t>1 el exponente fraccionario da NaN
    return 1 - Math.pow(1 - t, 4.1);
  };

  /* El pequeño rebote del final, aparte de la frenada.
     Va de 0 a 0 con un pico cerca del cierre, y se mide SOBRE UN GAJO, no
     sobre el recorrido: antes era un porcentaje del total y, con 5 a 7 vueltas
     de giro, terminaba pasándose más de un gajo entero y la rueda retrocedía
     a otro premio al asentarse. */
  Wheel.prototype.rebote = function (t) {
    if (t < 0.72) return 0;
    if (t > 1) return 0;
    return Math.sin((t - 0.72) / 0.28 * Math.PI);
  };

  /** índice del gajo que está bajo la aguja */
  Wheel.prototype.indexAt = function () {
    var a = ((-this.rot) % TAU + TAU) % TAU;
    return Math.floor((a + this.seg / 2) / this.seg) % this.n;
  };

  Wheel.prototype.render = function () {
    var c = this.ctx;
    c.clearRect(0, 0, this.size, this.size);
    this._bezel();
    this._face();
    this._hub();
    this._pointer();
  };

  /** gira hasta un gajo cuyo premio sea prizeId */
  Wheel.prototype.spinTo = function (prizeId, done) {
    if (this.spinning) return;
    var opts = [];
    for (var i = 0; i < this.n; i++) if (this.segs[i].id === prizeId) opts.push(i);
    if (!opts.length) opts = [0];
    var k = opts[Math.floor(Math.random() * opts.length)];

    var turns = 5 + Math.floor(Math.random() * 3);
    var jitter = (Math.random() - 0.5) * this.seg * 0.62;
    var target = turns * TAU - k * this.seg + jitter;
    /* siempre hacia adelante */
    while (target <= this.rot + TAU * 4) target += TAU;

    this.from = this.rot;
    this.to = target;
    /* el rebote es siempre menos de medio gajo: así jamás cruza al vecino */
    this.over = this.seg * 0.3;
    this.dur = 5200 + Math.random() * 900;
    this.t0 = performance.now();
    this.lastIdx = this.indexAt();
    this.spinning = true;
    this.glow = 0.2;
    audio();
    this.onDone = done;

    /* si el navegador congela las animaciones (pestaña en segundo plano,
       lector sin compositor), el giro se resuelve igual y nadie queda trabado */
    var self = this;
    clearTimeout(this._safety);
    this._safety = setTimeout(function () { self._finish(); }, this.dur + 1500);
  };

  Wheel.prototype.celebrate = function (win) { fanfare(win); };

  /* =========================================================================
     Confeti
     ========================================================================= */
  function confetti(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var colors = ["#D4A21C", "#F7F2E8", "#8CA680", "#E8BE4A", "#0E7C66"];
    var ps = [];
    var n = opts.count || 150;
    for (var i = 0; i < n; i++) {
      ps.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.45,
        y: H * 0.42 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 11,
        vy: -6 - Math.random() * 11,
        w: 5 + Math.random() * 8,
        h: 7 + Math.random() * 11,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.34,
        c: colors[(Math.random() * colors.length) | 0],
        life: 1
      });
    }

    var t0 = performance.now();
    (function frame(now) {
      var el = now - t0;
      ctx.clearRect(0, 0, W, H);
      var alive = false;
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.vy += 0.33;
        p.vx *= 0.995;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (el > 1400) p.life -= 0.016;
        if (p.life <= 0 || p.y > H + 60) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot)));
        ctx.restore();
      }
      if (alive) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  Wheel.acabadoEscudo = function (v) {
    ESCUDO_ACABADO = v;
    escudoCache = {};
    RUEDAS.forEach(function (w) { w.dirty = true; });
  };

  window.PouchWheel = Wheel;
  window.PouchConfetti = confetti;
  window.PouchSound = {
    get muted() { return muted; },
    set muted(v) { muted = !!v; },
    tick: clack
  };
})();
