/* ===========================================================================
   POUCH CLUB — lógica del catálogo
   =========================================================================== */

(function () {
  "use strict";

  var D = window.POUCH_DATA;
  var CFG = D.config;
  var PRODUCTOS = D.productos;
  var PREMIOS = D.ruleta;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- almacenamiento local (solo en el navegador de quien visita) -- */
  var LS = {
    get: function (k, d) {
      try { var v = localStorage.getItem("pouch." + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem("pouch." + k, JSON.stringify(v)); } catch (e) {}
    },
    del: function (k) { try { localStorage.removeItem("pouch." + k); } catch (e) {} }
  };

  /* -------------------------------------------------------------------------
     Atajo para probar: abrir con  ?resetgiro  borra el giro guardado y el
     premio, para poder girar de nuevo. Funciona ÚNICAMENTE en localhost o en
     la red local; en el sitio publicado no hace absolutamente nada.
     ------------------------------------------------------------------------- */
  (function resetDePrueba() {
    if (location.search.indexOf("resetgiro") === -1) return;
    var h = location.hostname;
    var local = h === "localhost" || h === "127.0.0.1" || h === "" ||
                /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
    if (!local) return;
    ["ultimoGiro", "premio", "premioFuera", "premioUsado"].forEach(LS.del);
  })();

  /* ---------- formato ---------- */
  function fmt(n) {
    return "₡" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  /* envuelve cualquier ₡ suelto de un texto para que lo dibuje Inter */
  function col(s) { return String(s).replace(/₡/g, '<span class="col">₡</span>'); }

  /* igual que fmt() pero con el ₡ en Inter: Archivo no trae ese glifo */
  function fmtH(n) {
    return '<span class="col">₡</span>' +
      Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function byId(id) {
    for (var i = 0; i < PRODUCTOS.length; i++) if (PRODUCTOS[i].id === id) return PRODUCTOS[i];
    return null;
  }

  var WINTER = byId("zyn-wintergreen");
  var VISIBLES = PRODUCTOS.filter(function (p) { return !p.hidden; });

  /* =========================================================================
     TOAST
     ========================================================================= */
  var toastEl = $("#toast"), toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2600);
  }

  /* =========================================================================
     DIÁLOGO DE CONFIRMACIÓN
     ========================================================================= */
  var askEl = $("#ask"), askCB = null;

  function preguntar(titulo, texto, textoSi, cb) {
    $("#ask-t").textContent = titulo;
    $("#ask-p").textContent = texto;
    $("#ask-si").textContent = textoSi || "Confirmar";
    askCB = cb;
    askEl.hidden = false;
    document.body.classList.add("is-locked");
    requestAnimationFrame(function () { askEl.classList.add("is-on"); });
    setTimeout(function () { $("#ask-no").focus(); }, 60);
  }

  function cerrarAsk(ok) {
    askEl.classList.remove("is-on");
    if (!cartEl.classList.contains("is-open") && modal.hidden) {
      document.body.classList.remove("is-locked");
    }
    setTimeout(function () { askEl.hidden = true; }, 320);
    var cb = askCB; askCB = null;
    if (ok && cb) cb();
  }

  $("#ask-si").addEventListener("click", function () { cerrarAsk(true); });
  $("#ask-no").addEventListener("click", function () { cerrarAsk(false); });
  askEl.addEventListener("click", function (e) { if (e.target === askEl) cerrarAsk(false); });

  /* =========================================================================
     PUERTA +18
     ========================================================================= */
  var arrancarIntro = null;   // lo define la sección INTRO, más abajo

  /* =========================================================================
     PANTALLA DE CARGA
     -------------------------------------------------------------------------
     Manda el orden del arranque:  carga  ->  puerta +18  ->  intro del hero.
     La barra sigue la descarga real de las fotos y las tipografías, con un
     mínimo de tiempo en pantalla para que no pegue un parpadeo, y un máximo
     por si algún archivo nunca responde.
     ========================================================================= */
  (function cargador() {
    var el = $("#loader");
    if (!el) { if (!$("#agegate") && arrancarIntro) arrancarIntro(); return; }

    document.body.classList.add("is-locked");

    var barra = $("#loader-bar"), num = $("#loader-pct");
    var MINIMO = 1200, MAXIMO = 4500;
    var t0 = performance.now();

    var recursos = PRODUCTOS.map(function (p) { return window.PouchCan.foto(p); })
                            .concat(["img/logo-mark.png", "img/logo-mark-cream.png"]);
    var total = recursos.length + 1;        // + las tipografías
    var listos = 0;
    function suma() { listos++; }

    recursos.forEach(function (src) {
      var im = new Image();
      im.onload = im.onerror = suma;
      im.src = src;
    });
    /* Las tipografías cuentan como un recurso más, pero con su propio tope:
       si el servidor de fuentes tarda o no contesta, no puede dejar la barra
       clavada esperándolo. */
    var fuentesContadas = false;
    function fuentesListas() {
      if (fuentesContadas) return;
      fuentesContadas = true;
      suma();
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fuentesListas);
    setTimeout(fuentesListas, 1200);

    var mostrado = 0, cerrado = false;

    requestAnimationFrame(function tic(ahora) {
      if (cerrado) return;
      var paso = (ahora || performance.now()) - t0;
      var real = listos / total * 100;

      /* La barra avanza SIEMPRE con el tiempo, acercándose al 97% sin llegar
         nunca, y la carga real solo la empuja más rápido. Antes el avance
         estaba limitado por la carga y se congelaba medio segundo cerca del
         final esperando a que contestaran las tipografías. */
      var porTiempo = 97 * (1 - Math.exp(-paso / 760));
      var techo = Math.min(97, Math.max(real, porTiempo));
      mostrado += (Math.max(techo, mostrado) - mostrado) * 0.16;
      if ((listos >= total && paso >= MINIMO) || paso >= MAXIMO) mostrado = 100;

      var v = Math.min(100, Math.round(mostrado));
      barra.style.width = v + "%";
      num.textContent = v + "%";

      if (v >= 100) { cerrar(); return; }
      requestAnimationFrame(tic);
    });

    /* por si el navegador congela los cuadros de animación */
    setTimeout(cerrar, MAXIMO + 600);

    function cerrar() {
      if (cerrado) return;
      cerrado = true;
      barra.style.width = "100%";
      num.textContent = "100%";

      var hayPuerta = !!$("#agegate");
      /* Sin puerta, la intro arranca junto con el telón: así el hero aparece
         ya animándose y no se ve primero quieto y después saltar. */
      if (!hayPuerta) {
        document.body.classList.remove("is-locked");
        if (arrancarIntro) arrancarIntro();
      }
      el.classList.add("is-done");
      setTimeout(function () { el.remove(); }, 900);
    }
  })();

  (function agegate() {
    var gate = $("#agegate");
    if (LS.get("mayor18", false)) { gate.remove(); return; }

    document.body.classList.add("is-locked");

    $("#age-yes").addEventListener("click", function () {
      LS.set("mayor18", true);
      gate.classList.add("is-out");
      /* La intro arranca recién cuando la puerta terminó de desaparecer
         (su transición dura .5s), no mientras todavía se está yendo. */
      setTimeout(function () {
        gate.remove();
        document.body.classList.remove("is-locked");
        if (arrancarIntro) arrancarIntro();
      }, 540);
    });
  })();

  /* =========================================================================
     HEADER + REVEAL + MARQUEE
     ========================================================================= */
  var hdr = $("#hdr");
  window.addEventListener("scroll", function () {
    hdr.classList.toggle("is-stuck", window.scrollY > 30);
  }, { passive: true });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  function watchReveals() { $$(".reveal:not(.in)").forEach(function (el) { io.observe(el); }); }

  (function marquee() {
    var frases = [
      "VELO & ZYN originales", "Pouches de nicotina", "Stock real, no por encargo",
      "Entrega coordinada", "Pedí por WhatsApp", "Solo +18"
    ];
    var html = frases.map(function (f) { return "<span>" + f + "</span>"; }).join("");
    $("#marqueetrack").innerHTML = html + html;
  })();

  /* =========================================================================
     HERO — latas flotando
     ========================================================================= */
  (function heroCans() {
    var wrap = $("#herocans");
    /* En pantallas anchas estas latas viven dentro de la franja derecha
       (.hero__cans arranca en left:54%), así que los porcentajes de "right"
       son sobre esa franja, no sobre toda la pantalla. */
    /* En pantallas anchas estas latas viven dentro de la franja derecha
       (.hero__cans arranca en left:54%), así que los porcentajes de "right"
       son sobre esa franja, no sobre toda la pantalla.
       Las posiciones están calculadas para que ninguna se pise con otra. */
    var angosto = window.matchMedia("(max-width:760px)").matches;

    var pos = [
      { p: byId("velo-watermelon-ice"),      css: "top:4%;right:18%",  mov: "top:3%;right:8%",   rot: "-11deg", dur: "9s",    dly: "0s",  sc: 1,   ein: ".48s" },
      { p: byId("velo-blueberry-ice"),       css: "top:38%;right:46%", mov: "top:30%;right:62%", rot: "10deg",  dur: "11s",   dly: "-2s", sc: .46, ein: ".65s" },
      { p: byId("zyn-mini-spearmint"),       css: "top:44%;right:6%",  mov: "top:50%;right:4%",  rot: "-5deg",  dur: "10s",   dly: "-4s", sc: .76, ein: "1.16s"   },
      { p: byId("velo-purple-grape"),        css: "top:70%;right:36%", mov: "top:70%;right:54%", rot: "7deg",   dur: "13s",   dly: "-3s", sc: .6,  ein: ".99s" },
      { p: byId("velo-freezing-peppermint"), css: "top:80%;right:16%", mov: "top:88%;right:22%", rot: "15deg",  dur: "12.5s", dly: "-6s", sc: .38, ein: ".82s" }
    ];
    pos.forEach(function (o) {
      if (!o.p) return;
      var img = document.createElement("img");
      img.className = "hero__can";
      img.alt = "";
      window.PouchCan.respaldo(img, o.p);
      img.src = window.PouchCan.foto(o.p);
      /* En celular la franja ocupa todo el ancho, así que las mismas posiciones
         quedarían apretadas: ahí se usa un reparto más abierto. */
      var css = (angosto && o.mov) ? o.mov : o.css;
      img.style.cssText = css + ";--rot:" + o.rot + ";--dur:" + o.dur + ";--dly:" + o.dly +
                          ";--dly-in:" + o.ein +
                          ";transform:rotate(" + o.rot + ");width:calc(clamp(150px,21vw,340px) * " + o.sc + ")";
      wrap.appendChild(img);
    });

    /* parallax suave con el mouse */
    if (matchMedia("(any-hover:hover)").matches) {
      var cans = $$(".hero__can", wrap);
      window.addEventListener("mousemove", function (e) {
        var dx = (e.clientX / window.innerWidth - .5);
        var dy = (e.clientY / window.innerHeight - .5);
        cans.forEach(function (c, i) {
          var k = (i + 1) * 9;
          c.style.marginLeft = (-dx * k) + "px";
          c.style.marginTop = (-dy * k) + "px";
        });
      }, { passive: true });
    }
  })();

  (function stats() {
    var marcas = {}, niveles = {};
    VISIBLES.forEach(function (p) { marcas[p.marca] = 1; niveles[p.fuerza] = 1; });
    $("#stat-marcas").textContent = Object.keys(marcas).length;
    $("#stat-intensidades").textContent = Object.keys(niveles).length;
  })();
  $("#year").textContent = new Date().getFullYear();

  /* =========================================================================
     CARRITO
     ========================================================================= */
  var cart = LS.get("carrito", {});   // { idProducto: cantidad }

  function cartCount() {
    var n = 0;
    for (var k in cart) n += cart[k];
    return n + (premioEnCarrito() ? premio.cantidad : 0);
  }
  function subtotal() {
    var t = 0;
    for (var k in cart) { var p = byId(k); if (p) t += p.precio * cart[k]; }
    return t;
  }
  function cartTotal() {
    return subtotal() + (premioEnCarrito() ? premio.precio : 0);
  }

  /* El premio es un agregado del pedido, no un pedido en sí: si sacar esto
     dejaría el carrito con el premio solo, no se permite. */
  function dejariaElPremioSolo(id) {
    if (!premioEnCarrito()) return false;
    return Object.keys(cart).filter(function (k) { return k !== id; }).length === 0;
  }
  function avisoPremioSolo() {
    toast("El premio va junto con tu pedido, no puede ir solo");
  }

  function add(id, n) {
    var p = byId(id);
    if (!p) return;
    var cur = cart[id] || 0;
    var next = Math.max(0, Math.min(p.stock, cur + (n || 1)));
    if (next === 0 && cur > 0 && dejariaElPremioSolo(id)) { avisoPremioSolo(); return; }
    if (next === cur && n > 0) { toast("No queda más stock de ese sabor"); return; }
    if (next === 0) delete cart[id]; else cart[id] = next;
    LS.set("carrito", cart);
    paint();
    if (n > 0) {
      var c = $("#cartcount");
      c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop");
    }
  }

  /* =========================================================================
     RULETA — estado
     ========================================================================= */
  var premio = LS.get("premio", null);   // { id, code, ts, cantidad, precio, titulo, sub }
  var premioFuera = LS.get("premioFuera", false);
  var premioUsado = LS.get("premioUsado", false);   // ya viajó en un pedido enviado
  var MS_SEMANA = (CFG.diasEntreGiros || 7) * 24 * 3600 * 1000;

  function ultimoGiro() { return LS.get("ultimoGiro", 0); }
  function tiempoCumplido() { return Date.now() - ultimoGiro() >= MS_SEMANA; }
  /* hay pedido = hay productos propios, sin contar el premio */
  function hayPedido() { return Object.keys(cart).length > 0; }
  /* La ruleta es un extra del pedido: sin pedido no se gira ni se gana nada. */
  function puedeGirar() { return hayPedido() && tiempoCumplido(); }
  function esperaRestante() {
    var ms = MS_SEMANA - (Date.now() - ultimoGiro());
    var d = Math.floor(ms / 86400000);
    var h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return d + (d === 1 ? " día" : " días") + (h ? " y " + h + " h" : "");
    if (h > 0) return h + (h === 1 ? " hora" : " horas");
    return Math.max(1, Math.ceil((ms % 3600000) / 60000)) + " min";
  }

  function premioEnCarrito() {
    return !!(premio && premio.id !== "nada" && !premioFuera && !premioUsado);
  }

  function nuevoCodigo() {
    var A = "ACDEFHJKLMNPQRTUVWXY349";
    var s = "";
    for (var i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
    var n = String(Math.floor(Math.random() * 90) + 10);
    return "ZC-" + s + "-" + n;
  }

  /** elige premio por peso, descartando los que no alcanza el stock */
  function sortearPremio() {
    var disp = PREMIOS.filter(function (pr) {
      if (pr.tipo === "nada") return true;
      return WINTER && WINTER.stock >= (pr.cantidad || 1);
    });
    var total = disp.reduce(function (a, p) { return a + p.peso; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < disp.length; i++) {
      r -= disp[i].peso;
      if (r <= 0) return disp[i];
    }
    return disp[disp.length - 1];
  }

  /* =========================================================================
     CATÁLOGO
     ========================================================================= */
  var FILTROS = [
    { k: "todos", t: "Todo" },
    { k: "velo", t: "Velo" },
    { k: "zyn", t: "Zyn" }
  ];
  var filtroActivo = "todos";

  function pasaFiltro(p) {
    if (filtroActivo === "todos") return true;
    if (filtroActivo === "velo" || filtroActivo === "zyn") return p.marca.toLowerCase() === filtroActivo;
    return p.tags.indexOf(filtroActivo) > -1;
  }

  function cuenta(k) {
    return VISIBLES.filter(function (p) {
      if (k === "todos") return true;
      if (k === "velo" || k === "zyn") return p.marca.toLowerCase() === k;
      return p.tags.indexOf(k) > -1;
    }).length;
  }

  function pintarFiltros() {
    $("#filters").innerHTML = FILTROS.map(function (f) {
      return '<button class="chip' + (f.k === filtroActivo ? " is-on" : "") + '" data-f="' + f.k + '" role="tab">' +
             f.t + '<small>' + cuenta(f.k) + '</small></button>';
    }).join("");
  }

  /* los puntitos tal como vienen impresos en la lata:
     VELO marca sobre 6, ZYN sobre 4 */
  function fuerzaDots(p) {
    var max = p.fuerzaMax || 6, s = "";
    for (var i = 1; i <= max; i++) s += '<i class="' + (i <= p.fuerza ? "on" : "") + '"></i>';
    return '<span class="dots" title="' + p.fuerza + ' de ' + max +
           ' en la escala ' + p.marca + '">' + s + '</span>';
  }

  function tarjeta(p) {
    var enCarrito = cart[p.id] || 0;
    var agotado = p.stock <= 0;
    var bajo = !agotado && p.stock <= (CFG.stockBajo || 3);

    var tags = '<span class="tag tag--brand">' + p.marca + '</span>';
    if (agotado) tags += '<span class="tag tag--out">Agotado</span>';
    else if (bajo) tags += '<span class="tag tag--low">Quedan ' + p.stock + '</span>';

    var accion = agotado
      ? '<button class="card__add" disabled>Agotado</button>'
      : (enCarrito
          ? '<div class="stepper">' +
              '<button data-minus="' + p.id + '" aria-label="Quitar uno"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>' +
              '<span>' + enCarrito + '</span>' +
              '<button data-plus="' + p.id + '" aria-label="Agregar uno"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' +
            '</div>'
          : '<button class="card__add" data-plus="' + p.id + '">Agregar</button>');

    return '' +
    '<article class="card reveal' + (agotado ? " is-out" : "") + '" data-id="' + p.id + '" ' +
      'style="--c1:' + p.color + ';--c1d:' + shade(p.color, -.42) + '">' +
      '<div class="card__art">' +
        '<span class="card__ring"></span>' +
        '<div class="card__tags">' + tags + '</div>' +
        '<img class="card__can" alt="Lata de ' + p.marca + ' ' + p.sabor + '" loading="lazy">' +
      '</div>' +
      '<div class="card__body">' +
        '<span class="card__brand">' + p.marca + '</span>' +
        '<h3 class="card__name">' + p.sabor + '</h3>' +
        '<div class="card__meta">' +
          '<span class="meta">' + p.nicotina + '</span>' +
          '<span class="meta">Fuerza ' + fuerzaDots(p) + '</span>' +
        '</div>' +
        '<div class="card__buy">' +
          '<span class="price">' + fmtH(p.precio) + '<small>por lata</small></span>' +
          accion +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function shade(hex, amt) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var out = "#";
    for (var i = 0; i < 3; i++) {
      var v = parseInt(hex.substr(i * 2, 2), 16);
      v = amt < 0 ? v * (1 + amt) : v + (255 - v) * amt;
      out += Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    }
    return out;
  }

  function pintarGrid() {
    var lista = VISIBLES.filter(pasaFiltro);
    $("#grid").innerHTML = lista.map(tarjeta).join("");
    $("#gridempty").hidden = lista.length > 0;

    /* foto real de cada lata; si falta el archivo cae en la ilustración */
    $$("#grid .card").forEach(function (card) {
      var p = byId(card.dataset.id);
      var img = $(".card__can", card);
      window.PouchCan.respaldo(img, p);
      img.src = window.PouchCan.foto(p);
    });

    tilt();
    watchReveals();
  }

  /* inclinación 3D en escritorio */
  function tilt() {
    if (!matchMedia("(any-hover:hover)").matches) return;
    $$("#grid .card:not(.is-out)").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5;
        var y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = "perspective(900px) rotateY(" + (x * 7) + "deg) rotateX(" + (-y * 7) +
                               "deg) translateY(-7px) scale(1.015)";
      });
      card.addEventListener("mouseleave", function () { card.style.transform = ""; });
    });
  }

  /* =========================================================================
     PANEL DEL CARRITO
     ========================================================================= */
  var cartEl = $("#cart"), scrim = $("#scrim");

  function abrirCarrito(on) {
    cartEl.classList.toggle("is-open", on);
    cartEl.setAttribute("aria-hidden", String(!on));
    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.toggle("is-on", on); });
    document.body.classList.toggle("is-locked", on);
    if (!on) setTimeout(function () { if (!scrim.classList.contains("is-on")) scrim.hidden = true; }, 420);
  }

  function lineaCarrito(p, qty, esPremio) {
    var sub = esPremio ? premio.sub : p.nicotina + " · " + fmtH(p.precio);
    var precio = esPremio ? (premio.precio === 0 ? "GRATIS" : fmtH(premio.precio)) : fmtH(p.precio * qty);
    var ctrl = esPremio
      ? '<button class="citem__del" data-quitapremio>quitar</button>'
      : '<div class="stepper">' +
          '<button data-minus="' + p.id + '" aria-label="Quitar uno"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>' +
          '<span>' + qty + '</span>' +
          '<button data-plus="' + p.id + '" aria-label="Agregar uno"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' +
        '</div>' +
        '<button class="citem__del" data-del="' + p.id + '">quitar</button>';

    return '<div class="citem' + (esPremio ? " citem--prize" : "") + '">' +
      '<div class="citem__art" style="--c1:' + p.color + ';--c1d:' + shade(p.color, -.45) + '">' +
        '<img src="' + window.PouchCan.foto(p) + '" data-fb="' + p.id + '" alt=""></div>' +
      '<div class="citem__info">' +
        '<div class="citem__name">' + (esPremio ? "🎁 " : "") + p.marca + " " + p.sabor + '</div>' +
        '<div class="citem__sub">' + col(esPremio ? premio.sub : sub) + '</div>' +
        '<div class="citem__price">' + (esPremio ? qty + " × " : "") + precio + '</div>' +
      '</div>' +
      '<div class="citem__ctrl">' + ctrl + '</div>' +
    '</div>';
  }

  function pintarCarrito() {
    var ids = Object.keys(cart);
    var html = "";

    if (!ids.length && !premioEnCarrito()) {
      html = '<div class="cart__empty">' +
        '<svg viewBox="0 0 24 24"><path d="M6 7h12l-1.2 11.1a2 2 0 0 1-2 1.9H9.2a2 2 0 0 1-2-1.9L6 7Z"/><path d="M9 7V5.8A3 3 0 0 1 12 3a3 3 0 0 1 3 2.8V7"/></svg>' +
        '<h3>Todavía no hay nada</h3><p>Agregá latas desde el catálogo y aparecen acá.</p></div>';
    } else {
      html = ids.map(function (id, i) {
        var p = byId(id);
        return p ? lineaCarrito(p, cart[id], false) : "";
      }).join("");
      if (premioEnCarrito() && WINTER) html += lineaCarrito(WINTER, premio.cantidad, true);
    }
    $("#cartbody").innerHTML = html;
    $$("#cartbody img[data-fb]").forEach(function (img) {
      window.PouchCan.respaldo(img, byId(img.dataset.fb));
    });

    /* banda del código */
    var banda = $("#cartprize");
    if (premio && premio.id !== "nada") {
      banda.hidden = false;
      banda.innerHTML = '<span>' + (premioUsado ? "Código ya enviado" : "Código del club") +
                        '</span><code>' + premio.code + '</code>';
    } else { banda.hidden = true; }

    $("#carttotal").innerHTML = fmtH(cartTotal());

    var vacio = !ids.length && !premioEnCarrito();
    $("#cartclear").hidden = vacio;
    var btn = $("#checkout");
    btn.disabled = vacio;
    $("#checkouttxt").textContent = vacio
      ? "Tu carrito está vacío"
      : (puedeGirar() ? "Girar y enviar pedido" : "Enviar por WhatsApp");
  }

  /* La ruleta no existe para quien todavía no armó un pedido: se revela
     cuando hay algo en el carrito, y se vuelve a guardar si lo vacían. */
  var ruletaVisible = false;
  var arrancado = false;

  function ruletaAbierta() { return hayPedido(); }

  function pintarRuleta() {
    var on = ruletaAbierta();
    if (on === ruletaVisible) return;
    ruletaVisible = on;
    $$("[data-ruleta]").forEach(function (el) { el.hidden = !on; });
    if (on) {
      var sec = $("#ruleta");
      sec.classList.remove("just-unlocked");
      void sec.offsetWidth;
      sec.classList.add("just-unlocked");
      if (arrancado) toast("Desbloqueaste la ruleta del club 🎉");
    }
  }

  /* barra fija de abajo: solo en móvil y solo con algo en el carrito */
  function pintarMinicart() {
    var n = cartCount();
    var bar = $("#minicart");
    bar.hidden = n === 0;
    document.body.classList.toggle("has-minicart", n > 0);
    if (n === 0) return;
    $("#minicart-n").textContent = n;
    $("#minicart-p").innerHTML = fmtH(cartTotal());
  }

  /* El botón grande de la sección 02: apagado mientras no haya giro
     disponible, con el tiempo que falta justo debajo. */
  function pintarSpin() {
    var btn = $("#spinbtn"), nota = $("#spinnote");
    if (!btn) return;
    if (!hayPedido()) {
      btn.disabled = true;
      btn.textContent = "Agregá algo primero";
      nota.textContent = "La ruleta se activa cuando tenés algo en tu pedido.";
    } else if (!tiempoCumplido()) {
      btn.disabled = true;
      btn.textContent = "Ya giraste esta semana";
      nota.textContent = "Tu próximo giro: en " + esperaRestante() + ".";
    } else {
      btn.disabled = false;
      btn.textContent = "Girar ahora";
      nota.textContent = "Un giro gratis cada " + CFG.diasEntreGiros + " días por dispositivo.";
    }
  }

  function paint() {
    pintarSpin();
    pintarFiltros();
    pintarGrid();
    pintarCarrito();
    pintarRuleta();
    pintarMinicart();
    $("#cartcount").textContent = cartCount();
  }

  /* =========================================================================
     WHATSAPP
     ========================================================================= */
  /* El mensaje se arma con lo que hay en el carrito en ese momento:
     cada producto con su cantidad y subtotal, el premio con su código si lo
     hay, y el total a pagar. */
  function mensaje() {
    var L = [CFG.saludo, "", "MI PEDIDO"];
    var unidades = 0;
    for (var id in cart) {
      var p = byId(id);
      if (!p) continue;
      unidades += cart[id];
      L.push("• " + cart[id] + " × " + p.marca + " " + p.sabor + " (" + p.nicotina + ")" +
             "  —  " + fmt(p.precio) + " c/u  =  " + fmt(p.precio * cart[id]));
    }
    L.push("Subtotal (" + unidades + (unidades === 1 ? " lata" : " latas") + "): " + fmt(subtotal()));

    if (premioEnCarrito() && WINTER) {
      L.push("");
      L.push("🎁 PREMIO DEL CLUB SPIN");
      L.push(premio.titulo);
      L.push("Código: " + premio.code);
      L.push("• " + premio.cantidad + " × " + WINTER.marca + " " + WINTER.sabor +
             " (" + WINTER.nicotina + ")  —  " +
             (premio.precio === 0 ? "GRATIS" : fmt(premio.precio)));
    }
    L.push("");
    L.push("TOTAL A PAGAR: " + fmt(cartTotal()));
    return L.join("\n");
  }

  function waURL() {
    return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(mensaje());
  }

  function enviar() {
    if (!CFG.whatsapp || /^5060{6,}$/.test(CFG.whatsapp)) {
      toast("Falta configurar el número de WhatsApp en data/products.js");
      return;
    }
    var url = waURL();
    var llevabaPremio = premioEnCarrito();
    var w = window.open(url, "_blank", "noopener");
    if (!w) window.location.href = url;   // si el navegador bloquea la pestaña

    /* el código ya viajó: no vuelve a engancharse a un segundo pedido */
    if (llevabaPremio) {
      premioUsado = true;
      LS.set("premioUsado", true);
      paint();
      toast("Pedido abierto en WhatsApp. El código ya quedó incluido.");
    }
  }

  $$("[data-wa-link]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); enviar(); });
  });

  /* =========================================================================
     MODAL DE LA RULETA
     ========================================================================= */
  var modal = $("#wheelmodal"), rueda = null, teaser = null, girando = false;
  var pendienteEnviar = false;

  function abrirRuleta(auto) {
    pendienteEnviar = !!auto;
    modal.hidden = false;
    document.body.classList.add("is-locked");
    requestAnimationFrame(function () { modal.classList.add("is-open"); });

    if (!rueda) {
      rueda = new window.PouchWheel($("#wheel"), PREMIOS, { pointer: true });
      setTimeout(function () { rueda.resize(); }, 60);
    } else { rueda.resize(); }

    estadoRuleta();
  }

  function cerrarRuleta() {
    modal.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    setTimeout(function () { modal.hidden = true; }, 460);
  }

  /* mantener = true cuando acabamos de girar y el resultado fresco ya está en pantalla */
  function estadoRuleta(mantener) {
    var btn = $("#wheelgo"), res = $("#wheelresult"), nota = $("#wheelnote");
    if (girando) return;

    if (!hayPedido()) {
      btn.disabled = true;
      btn.innerHTML = "<span>SIN<br>PEDIDO</span>";
      if (!mantener) res.hidden = true;
      nota.textContent = "Agregá algo a tu pedido y la ruleta se activa.";
      return;
    }
    if (puedeGirar()) {
      btn.disabled = false;
      btn.innerHTML = "<span>GIRAR</span>";
      if (!mantener) res.hidden = true;
      nota.textContent = "Un giro cada " + CFG.diasEntreGiros + " días. Sin registro, sin datos.";
    } else {
      btn.disabled = true;
      btn.innerHTML = "<span>" + esperaRestante().replace(" y ", "<br>") + "</span>";
      nota.textContent = "Ya giraste. Tu próximo giro: en " + esperaRestante() + ".";
      if (mantener) return;
      if (premio) mostrarResultado(premio, true);
      else res.hidden = true;
    }
  }

  function mostrarResultado(pr, viejo) {
    var res = $("#wheelresult");
    res.hidden = false;
    res.className = "wheelresult" + (pr.id === "nada" ? " wheelresult--none" : "");

    if (pr.id === "nada") {
      res.innerHTML =
        '<h3>Esta vez no</h3>' +
        '<p>No te tocó premio. Podés volver a girar en ' + esperaRestante() + '.</p>' +
        '<div class="wheelresult__btns"><button class="btn btn--ghost" data-seguir>Seguir al catálogo</button></div>';
    } else {
      /* Acá no se muestra el código: en esta pantalla la única decisión es
         sumarlo al pedido o no. El código vive en el carrito y en el mensaje. */
      var yaEsta = premioEnCarrito();
      res.innerHTML =
        '<h3>' + col(pr.titulo) + '</h3>' +
        '<p>' + (premioUsado ? "Este premio ya viajó en un pedido."
                : yaEsta ? "Ya está sumado a tu pedido."
                : "¿Lo agregamos a tu pedido?") + '</p>' +
        '<div class="wheelresult__btns">' +
          (premioUsado
            ? '<button class="btn btn--ghost" data-seguir>Ya lo usaste en un pedido</button>'
            : yaEsta
              ? '<button class="btn btn--gold" data-seguir>Listo, seguir comprando</button>'
              : '<button class="btn btn--gold" data-aplicar>Sí, agregalo a mi pedido</button>' +
                '<button class="btn btn--ghost" data-seguir>No, gracias</button>') +
        '</div>';
    }
  }

  function girar() {
    if (girando || !puedeGirar()) return;
    girando = true;
    $("#wheelgo").disabled = true;
    $("#wheelresult").hidden = true;

    var pr = sortearPremio();
    rueda.spinTo(pr.id, function () {
      girando = false;
      var ganado = {
        id: pr.id, tipo: pr.tipo, titulo: pr.titulo, sub: pr.sub,
        cantidad: pr.cantidad || 0, precio: pr.precio || 0,
        code: nuevoCodigo(), ts: Date.now()
      };
      premio = ganado;
      premioFuera = true;          // entra al pedido solo si la persona acepta
      premioUsado = false;
      LS.set("premio", premio);
      LS.set("premioFuera", true);
      LS.set("premioUsado", false);
      LS.set("ultimoGiro", Date.now());

      rueda.celebrate(pr.id !== "nada");
      if (pr.id !== "nada") window.PouchConfetti($("#confetti"), { count: pr.id === "gratis" ? 220 : 140 });

      mostrarResultado(ganado, false);
      estadoRuleta(true);
      paint();
    });
  }

  /* =========================================================================
     EVENTOS
     ========================================================================= */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-plus],[data-minus],[data-del],[data-f],[data-open-wheel]," +
                             "[data-seguir],[data-aplicar],[data-copiar],[data-quitapremio]");
    if (!t) return;

    if (t.dataset.plus !== undefined && t.dataset.plus) { add(t.dataset.plus, 1); return; }
    if (t.dataset.minus) { add(t.dataset.minus, -1); return; }
    if (t.dataset.del) {
      if (dejariaElPremioSolo(t.dataset.del)) { avisoPremioSolo(); return; }
      delete cart[t.dataset.del]; LS.set("carrito", cart); paint(); return;
    }

    if (t.dataset.f) {
      filtroActivo = t.dataset.f;
      pintarFiltros(); pintarGrid();
      return;
    }

    if (t.hasAttribute("data-open-wheel")) { abrirRuleta(false); return; }
    if (t.hasAttribute("data-seguir")) { cerrarRuleta(); return; }

    if (t.hasAttribute("data-aplicar")) {
      premioFuera = false; LS.set("premioFuera", false);
      paint(); cerrarRuleta(); abrirCarrito(true);
      toast("Premio agregado a tu pedido 🎁");
      return;
    }

    if (t.hasAttribute("data-quitapremio")) {
      preguntar(
        "¿Quitar el premio?",
        "Vas a sacar " + (premio ? premio.titulo : "el premio") + " de tu pedido. " +
        "Tu código " + (premio ? premio.code : "") + " sigue válido y lo podés volver " +
        "a agregar desde la ruleta.",
        "Sí, quitarlo",
        function () {
          premioFuera = true; LS.set("premioFuera", true);
          paint();
          toast("Premio quitado del pedido");
        });
      return;
    }

    if (t.dataset.copiar) {
      var txt = t.dataset.copiar;
      if (navigator.clipboard) navigator.clipboard.writeText(txt);
      toast("Código copiado: " + txt);
      return;
    }
  });

  $("#cartbtn").addEventListener("click", function () { abrirCarrito(true); });
  $("#minicart").addEventListener("click", function () { abrirCarrito(true); });
  $("#cartclose").addEventListener("click", function () { abrirCarrito(false); });
  $("#cartclear").addEventListener("click", function () {
    preguntar("¿Vaciar el carrito?",
      "Se van a quitar todas las latas de tu pedido. Esto no se puede deshacer.",
      "Sí, vaciar",
      function () {
        cart = {}; LS.set("carrito", cart);
        premioFuera = true; LS.set("premioFuera", true);
        paint();
        toast("Carrito vacío");
      });
  });
  scrim.addEventListener("click", function () { abrirCarrito(false); });
  $("#wheelclose").addEventListener("click", cerrarRuleta);
  $("#wheelgo").addEventListener("click", girar);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!modal.hidden) cerrarRuleta();
    else if (cartEl.classList.contains("is-open")) abrirCarrito(false);
  });

  $("#checkout").addEventListener("click", function () {
    if (puedeGirar()) {
      abrirCarrito(false);
      setTimeout(function () { abrirRuleta(true); }, 260);
    } else {
      enviar();
    }
  });

  /* cuando la ruleta se cierra después de un giro hecho desde el carrito */
  var obs = new MutationObserver(function () {
    if (modal.hidden && pendienteEnviar) {
      pendienteEnviar = false;
      setTimeout(function () { abrirCarrito(true); }, 200);
    }
  });
  obs.observe(modal, { attributes: true, attributeFilter: ["hidden"] });

  window.addEventListener("resize", function () {
    if (rueda) rueda.resize();
    if (teaser) teaser.resize();
  });

  /* =========================================================================
     INTRO
     -------------------------------------------------------------------------
     Al entrar: el hero se arma pieza por pieza, se sostiene un momento y la
     página baja sola hasta el catálogo. Cualquier gesto (scroll, toque, tecla
     o el botón "saltar") la corta al instante.

     Para apagarla del todo: poné  INTRO = false.
     Para que se vea una sola vez por visita en vez de en cada carga, cambiá
     la línea marcada más abajo.
     ========================================================================= */
  var INTRO = true;
  var T_ENTRADA = 2550, T_PAUSA = 0, T_BAJADA = 400;

  (function intro() {
    var cuerpo = document.body;

    function terminar() {
      cuerpo.classList.remove("intro-go", "intro-lock");
      var b = $(".intro-skip");
      if (b) b.remove();
    }

    var quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* ---- para una sola vez por visita, descomentá la línea siguiente ----
    if (sessionStorage.getItem("pouch.introVista")) quieto = true;
    try { sessionStorage.setItem("pouch.introVista", "1"); } catch (e) {} */

    if (!INTRO || quieto) {
      arrancarIntro = function () {};
      terminar();
      return;
    }

    function correr() {
      cuerpo.classList.add("intro-go", "intro-lock");
      window.scrollTo(0, 0);

      var saltar = document.createElement("button");
      saltar.className = "intro-skip";
      saltar.textContent = "Saltar intro";
      cuerpo.appendChild(saltar);

      var muerta = false;
      var reloj = setTimeout(bajar, T_ENTRADA + T_PAUSA);

      function cortar() {
        if (muerta) return;
        muerta = true;
        clearTimeout(reloj);
        terminar();
      }

      saltar.addEventListener("click", cortar);
      ["wheel", "touchstart", "keydown", "click"].forEach(function (ev) {
        window.addEventListener(ev, cortar, { once: true, passive: true });
      });

      function bajar() {
        if (muerta) return;
        cuerpo.classList.remove("intro-lock");   // hace falta para poder scrollear
        /* seguro: si el navegador no entrega cuadros de animación, la intro
           igual se cierra sola y nadie queda con la página trabada */
        setTimeout(cortar, T_BAJADA + 700);
        var destino = Math.max(0, $("#catalogo").offsetTop - 64);
        var y0 = window.scrollY, dy = destino - y0, t0 = performance.now();

        (function paso(ahora) {
          if (muerta) return;
          var t = Math.min(1, (ahora - t0) / T_BAJADA);
          var e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          window.scrollTo(0, y0 + dy * e);
          if (t < 1) requestAnimationFrame(paso);
          else cortar();
        })(t0);
      }
    }

    /* no se lanza sola: la dispara el cargador, o la puerta +18 al aceptarse */
    arrancarIntro = correr;
  })();

  /* =========================================================================
     ARRANQUE
     ========================================================================= */
  paint();
  arrancado = true;
  watchReveals();

  /* ruleta decorativa de la sección 02 */
  (function () {
    var host = $("#wheelteaser");
    var cv = document.createElement("canvas");
    cv.width = 460; cv.height = 460;
    host.appendChild(cv);
    var start = function () {
      teaser = new window.PouchWheel(cv, PREMIOS, { pointer: false });
    };
    if ("IntersectionObserver" in window) {
      var o = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { start(); o.disconnect(); }
      }, { rootMargin: "200px" });
      o.observe(host);
    } else { start(); }
  })();


})();
