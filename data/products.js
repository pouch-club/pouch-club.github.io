/* ===========================================================================
   POUCH CLUB — ARCHIVO DE DATOS
   ---------------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitás tocar para el día a día.
   Podés editarlo a mano, o usar el panel en  admin.html  (ajustás el stock
   con +/- y te descarga este mismo archivo ya actualizado para reemplazarlo).

   stock: 0  ->  el producto se muestra AGOTADO y no se puede agregar.

   fuerza / fuerzaMax = los puntitos de intensidad, tal como vienen impresos
   en la lata. VELO usa una escala de 6:
        1 punto = 4 mg     2 = 6 mg      3 = 8-10 mg
        4 punto = 10,9 mg  5 = 14 mg     6 = 17 mg
   ZYN usa su propia escala de 4 (la lata del Spearmint marca 2 de 4 | 6 MG).

   El campo "nota" NO se muestra en el catálogo ahora mismo (las tarjetas van
   sin descripción, a propósito). Queda guardado por si lo querés usar después.
   hidden: true -> no aparece en el catálogo (se desbloquea con la ruleta).
   =========================================================================== */

window.POUCH_DATA = {

  config: {
    // Número de WhatsApp en formato internacional, SOLO dígitos.
    // Costa Rica = 506 + los 8 dígitos. Ej: "50688887777"
    whatsapp: "50600000000",

    // Texto con el que arranca el mensaje de WhatsApp
    saludo: "¡Hola Pouch Club! Quiero hacer un pedido 🌿",

    // Umbral para mostrar la etiqueta "últimas unidades"
    stockBajo: 3,

    // Días que deben pasar para poder volver a girar la ruleta
    diasEntreGiros: 7
  },

  productos: [
    {
      id: "velo-watermelon-ice",
      marca: "VELO",
      sabor: "Watermelon Ice",
      nicotina: "10 mg",
      fuerza: 3,                       // puntos llenos (escala oficial VELO, 1 a 6)
      fuerzaMax: 6,
      precio: 6000,
      stock: 6,
      tags: ["frutal", "frio"],
      nota: "Sandía jugosa con un cierre helado. El más fácil de tomar.",
      color: "#BE1F58",                // color principal de la lata
      color2: "#7FD1E8"                // acento (el toque 'ice')
    },
    {
      id: "velo-freezing-peppermint",
      marca: "VELO",
      sabor: "Freezing Peppermint",
      nicotina: "10 mg",
      fuerza: 4,
      fuerzaMax: 6,
      precio: 6000,
      stock: 5,
      tags: ["mentolado", "frio"],
      nota: "Menta directa y muy fría. El más fuerte de la línea.",
      color: "#1C6FA8",
      color2: "#CFF3FF"
    },
    {
      id: "velo-blueberry-ice",
      marca: "VELO",
      sabor: "Blueberry Ice",
      nicotina: "8 mg",
      fuerza: 3,
      fuerzaMax: 6,
      precio: 6000,
      stock: 6,
      tags: ["frutal", "frio"],
      nota: "Arándano dulce con frescura suave. Perfecto para empezar.",
      color: "#2B3A8F",
      color2: "#8FA7FF"
    },
    {
      id: "velo-purple-grape",
      marca: "VELO",
      sabor: "Purple Grape",
      nicotina: "8 mg",
      fuerza: 3,
      fuerzaMax: 6,
      precio: 6000,
      stock: 6,
      tags: ["frutal"],
      nota: "Uva morada, dulce y redonda. Sin filo mentolado.",
      color: "#6B2FA0",
      color2: "#C79BF2"
    },
    {
      id: "zyn-mini-spearmint",
      marca: "ZYN",
      sabor: "Mini Spearmint",
      nicotina: "6 mg",
      fuerza: 2,
      fuerzaMax: 4,
      precio: 7000,
      stock: 10,
      tags: ["mentolado", "mini"],
      nota: "Formato mini, súper discreto. Hierbabuena limpia.",
      color: "#17A9A6",
      color2: "#B6F2EE"
    },

    /* --- PREMIO DE LA RULETA -------------------------------------------
       Está oculto del catálogo a propósito: solo se desbloquea girando.
       Si algún día lo querés vender normal, poné  hidden: false            */
    {
      id: "zyn-wintergreen",
      marca: "ZYN",
      sabor: "Wintergreen",
      nicotina: "6 mg",
      fuerza: 2,
      fuerzaMax: 4,
      precio: 4500,
      stock: 12,
      hidden: true,
      tags: ["mentolado", "premio"],
      nota: "Wintergreen clásico. Solo se consigue girando la ruleta.",
      color: "#0B6B3A",
      color2: "#95E6B4"
    }
  ],

  /* =========================================================================
     RULETA — los premios y su probabilidad.
     'peso' es la probabilidad relativa: la suma de todos da el 100%.
     Con estos números:  nada 55% · 1 a ₡3.000 30% · 2 a ₡5.000 10% · gratis 5%
     La rueda reparte sus 16 gajos sola según estos pesos, así que si los
     cambiás acá, el dibujo se acomoda solo.
     ========================================================================= */
  ruleta: [
    { id: "nada",     peso: 55, tipo: "nada",   titulo: "Seguí participando",       corto: "NADA",      sub: "La próxima es tuya" },
    { id: "uno3000",  peso: 30, tipo: "precio", titulo: "Wintergreen a ₡3.000",     corto: "₡3.000",     sub: "1 lata Wintergreen", cantidad: 1, precio: 3000 },
    { id: "dos5000",  peso: 10, tipo: "precio", titulo: "2 Wintergreen por ₡5.000", corto: "2 × ₡5.000", sub: "Las dos latas",      cantidad: 2, precio: 5000 },
    { id: "gratis",   peso:  5, tipo: "gratis", titulo: "¡Wintergreen GRATIS!",     corto: "GRATIS",     sub: "1 lata de regalo",   cantidad: 1, precio: 0 }
  ]
};
