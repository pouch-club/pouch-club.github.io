/* ===========================================================================
   POUCH CLUB — generador de latas
   ---------------------------------------------------------------------------
   Dibuja la lata de cada sabor como SVG, usando los colores definidos en
   data/products.js. Devuelve un data-URI listo para usar en un <img>.

   El catálogo usa las FOTOS de  img/<id-del-producto>.png  cuando existen
   (ej: img/velo-purple-grape.png). Estas ilustraciones quedan como respaldo:
   si borrás una foto o el archivo falla, la lata dibujada aparece sola.
   =========================================================================== */

(function () {
  "use strict";

  /* --- utilidades de color -------------------------------------------- */
  function hex2rgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(r) {
    return "#" + r.map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    }).join("");
  }
  /* amt < 0 oscurece, amt > 0 aclara */
  function shade(hex, amt) {
    var c = hex2rgb(hex);
    return rgb2hex(c.map(function (v) {
      return amt < 0 ? v * (1 + amt) : v + (255 - v) * amt;
    }));
  }

  /* --- parte el nombre del sabor en 1 o 2 líneas ----------------------- */
  function wrap(name) {
    if (name.length <= 13) return [name];
    var w = name.split(" ");
    if (w.length === 1) return [name];
    // busca el corte más equilibrado
    var best = 1, diff = 1e9;
    for (var i = 1; i < w.length; i++) {
      var a = w.slice(0, i).join(" ").length, b = w.slice(i).join(" ").length;
      if (Math.abs(a - b) < diff) { diff = Math.abs(a - b); best = i; }
    }
    return [w.slice(0, best).join(" "), w.slice(best).join(" ")];
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* --- el SVG ---------------------------------------------------------- */
  function canSVG(p) {
    var c1 = p.color || "#06402B";
    var c2 = p.color2 || "#8CA680";
    var uid = "c" + Math.random().toString(36).slice(2, 8);

    var light = shade(c1, 0.34);
    var mid = shade(c1, 0.06);
    var dark = shade(c1, -0.42);
    var darker = shade(c1, -0.62);
    var lidTop = shade(c1, 0.2);

    var lines = wrap(p.sabor);
    var two = lines.length === 2;

    /* geometría de la lata */
    var CX = 150, LID_Y = 124, RX = 118, RY = 38, WALL_B = 198;

    var wallPath = "M" + (CX - RX) + "," + LID_Y + " V" + WALL_B +
                   " a" + RX + "," + RY + " 0 0 0 " + (RX * 2) + ",0 V" + LID_Y + " Z";

    var brandY = two ? 104 : 110;
    var l1Y = two ? 125 : 134;
    var l2Y = 146;
    var rule = two ? 160 : 152;

    return '' +
'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">' +
  '<defs>' +
    '<linearGradient id="w' + uid + '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="' + darker + '"/>' +
      '<stop offset=".11" stop-color="' + dark + '"/>' +
      '<stop offset=".34" stop-color="' + light + '"/>' +
      '<stop offset=".52" stop-color="' + mid + '"/>' +
      '<stop offset=".78" stop-color="' + dark + '"/>' +
      '<stop offset="1" stop-color="' + darker + '"/>' +
    '</linearGradient>' +
    '<radialGradient id="l' + uid + '" cx=".36" cy=".26" r=".92">' +
      '<stop offset="0" stop-color="' + shade(c1, 0.42) + '"/>' +
      '<stop offset=".55" stop-color="' + lidTop + '"/>' +
      '<stop offset="1" stop-color="' + shade(c1, -0.2) + '"/>' +
    '</radialGradient>' +
    '<linearGradient id="g' + uid + '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset=".09" stop-color="#fff" stop-opacity=".04"/>' +
      '<stop offset=".16" stop-color="#fff" stop-opacity=".22"/>' +
      '<stop offset=".24" stop-color="#fff" stop-opacity=".04"/>' +
      '<stop offset=".30" stop-color="#fff" stop-opacity=".13"/>' +
      '<stop offset=".38" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset=".80" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset=".86" stop-color="#fff" stop-opacity=".09"/>' +
      '<stop offset=".93" stop-color="#fff" stop-opacity="0"/>' +
    '</linearGradient>' +
    '<linearGradient id="b' + uid + '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="' + shade(c2, -0.3) + '"/>' +
      '<stop offset=".35" stop-color="' + c2 + '"/>' +
      '<stop offset=".62" stop-color="' + shade(c2, 0.25) + '"/>' +
      '<stop offset="1" stop-color="' + shade(c2, -0.34) + '"/>' +
    '</linearGradient>' +
    '<radialGradient id="s' + uid + '" cx=".5" cy=".5" r=".5">' +
      '<stop offset="0" stop-color="#000" stop-opacity=".42"/>' +
      '<stop offset=".58" stop-color="#000" stop-opacity=".16"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity="0"/>' +
    '</radialGradient>' +
    '<clipPath id="k' + uid + '"><path d="' + wallPath + '"/></clipPath>' +
  '</defs>' +

  /* sombra en el piso */
  '<ellipse cx="150" cy="247" rx="126" ry="23" fill="url(#s' + uid + ')"/>' +

  /* pared del cilindro */
  '<path d="' + wallPath + '" fill="url(#w' + uid + ')"/>' +

  '<g clip-path="url(#k' + uid + ')">' +
    /* banda de nicotina */
    '<rect x="20" y="186" width="260" height="30" fill="url(#b' + uid + ')"/>' +
    '<rect x="20" y="186" width="260" height="1.6" fill="#fff" opacity=".4"/>' +
    '<rect x="20" y="214.4" width="260" height="1.6" fill="#000" opacity=".2"/>' +
    '<text x="150" y="206" text-anchor="middle" font-family="Archivo,Helvetica,Arial,sans-serif" ' +
      'font-size="17" font-weight="800" letter-spacing="1.6" fill="' + shade(c2, -0.72) + '">' +
      esc(String(p.nicotina).toUpperCase()) + '</text>' +
    /* brillo especular suave sobre todo el cilindro */
    '<rect x="20" y="118" width="260" height="140" fill="url(#g' + uid + ')"/>' +
    /* sombra interna del fondo */
    '<ellipse cx="150" cy="242" rx="118" ry="26" fill="#000" opacity=".16"/>' +
  '</g>' +

  /* lomo / canto de la tapa */
  '<ellipse cx="150" cy="130" rx="118" ry="38" fill="' + shade(c1, -0.5) + '"/>' +
  '<ellipse cx="150" cy="' + LID_Y + '" rx="118" ry="38" fill="url(#l' + uid + ')"/>' +
  '<ellipse cx="150" cy="' + LID_Y + '" rx="118" ry="38" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.4"/>' +
  /* anillo interior de la tapa */
  '<ellipse cx="150" cy="' + LID_Y + '" rx="101" ry="30" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2"/>' +
  '<ellipse cx="150" cy="' + (LID_Y - 1) + '" rx="101" ry="30" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1.2"/>' +

  /* textos de la tapa */
  '<text x="150" y="' + brandY + '" text-anchor="middle" font-family="Archivo,Helvetica,Arial,sans-serif" ' +
    'font-size="13" font-weight="800" letter-spacing="4.6" fill="#F7F2E8" opacity=".92">' +
    esc(p.marca) + '</text>' +
  '<text x="150" y="' + l1Y + '" text-anchor="middle" font-family="Archivo,Helvetica,Arial,sans-serif" ' +
    'font-size="' + (two ? 19 : 22) + '" font-weight="800" letter-spacing="-.3" fill="#FFFFFF">' +
    esc(lines[0].toUpperCase()) + '</text>' +
  (two ?
  '<text x="150" y="' + l2Y + '" text-anchor="middle" font-family="Archivo,Helvetica,Arial,sans-serif" ' +
    'font-size="19" font-weight="800" letter-spacing="-.3" fill="#FFFFFF">' +
    esc(lines[1].toUpperCase()) + '</text>' : '') +
  '<rect x="128" y="' + rule + '" width="44" height="2.4" rx="1.2" fill="#F7F2E8" opacity=".55"/>' +

  /* brillo especular de la tapa */
  '<path d="M57,116 a106,31 0 0 1 78,-22 a132,132 0 0 0 -62,26 a92,92 0 0 0 -16,-4 Z" fill="#fff" opacity=".26"/>' +
'</svg>';
  }

  /* --- API ------------------------------------------------------------- */
  var cache = {};

  window.PouchCan = {
    svg: canSVG,
    /** data-URI para usar directo en <img src="..."> */
    src: function (p) {
      if (!cache[p.id]) {
        cache[p.id] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(canSVG(p));
      }
      return cache[p.id];
    },
    /** Ruta de la foto real del producto. Si el archivo no existe, la etiqueta
        <img> cae sola en la ilustración SVG. */
    foto: function (p) { return "img/" + p.id + ".png"; },

    /** Engancha el respaldo en un <img> ya creado. */
    respaldo: function (imgEl, p) {
      imgEl.onerror = function () {
        imgEl.onerror = null;
        imgEl.src = window.PouchCan.src(p);
      };
      return imgEl;
    },

    /** Compatibilidad: devuelve la foto y deja el respaldo puesto. */
    resolve: function (p, imgEl) {
      if (imgEl) window.PouchCan.respaldo(imgEl, p);
      return window.PouchCan.foto(p);
    }
  };
})();
