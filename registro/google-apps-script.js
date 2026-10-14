/**
 * POUCH CLUB — registro de premios y pedidos
 * ---------------------------------------------------------------------------
 * Este archivo NO es parte del sitio. Es el código que se pega una sola vez
 * dentro de una hoja de cálculo de Google. Los pasos están en el README,
 * sección "Registro de premios y pedidos".
 *
 * Crea dos pestañas y les va agregando una fila por cada cosa que pasa:
 *   · Premios  — cada vez que la ruleta entrega un código, aunque esa persona
 *                después no termine comprando.
 *   · Pedidos  — cada vez que alguien toca enviar por WhatsApp.
 *
 * La hora la pone Google, con la zona de Costa Rica, no el celular de quien
 * compra: así no depende de que ese dispositivo tenga bien el reloj.
 * ---------------------------------------------------------------------------
 */

const ZONA = 'America/Costa_Rica';

function doPost(e) {
  try {
    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const cuerpo = JSON.parse(e.postData.contents);
    const datos = cuerpo.datos || {};
    const cuando = Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm:ss');

    if (cuerpo.tipo === 'premio') {
      const h = hoja(libro, 'Premios',
                     ['Fecha y hora (CR)', 'Código', 'Premio', 'Latas', 'Precio']);
      h.appendRow([cuando, datos.codigo || '', datos.premio || '',
                   datos.cantidad || '', precio(datos.precio)]);
      colones(h, 5);

    } else if (cuerpo.tipo === 'pedido') {
      const detalle = (datos.lineas || [])
        .map(l => l.cantidad + ' x ' + l.producto + ' (' + l.nicotina + ')')
        .join('  ·  ');
      const h = hoja(libro, 'Pedidos',
                     ['Fecha y hora (CR)', 'Latas', 'Total', 'Detalle',
                      'Código del premio', 'Premio']);
      h.appendRow([cuando, datos.unidades || '', datos.total || '', detalle,
                   datos.codigo || '', datos.premio || '']);
      colones(h, 3);
    }

    return ContentService.createTextOutput('ok');
  } catch (err) {
    // Que falle acá nunca afecta al sitio: nadie espera esta respuesta.
    return ContentService.createTextOutput('error: ' + err);
  }
}

/** Para comprobar desde el navegador que quedó publicado. */
function doGet() {
  return ContentService.createTextOutput(
    'Registro de Pouch Club activo · ' +
    Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm:ss') + ' (hora CR)');
}

/** Devuelve la pestaña, creándola con su encabezado si todavía no existe. */
function hoja(libro, nombre, cabecera) {
  let h = libro.getSheetByName(nombre);
  if (!h) {
    h = libro.insertSheet(nombre);
    h.appendRow(cabecera);
    h.getRange(1, 1, 1, cabecera.length).setFontWeight('bold');
    h.setFrozenRows(1);
  }
  return h;
}

function precio(v) {
  if (v === 0) return 'GRATIS';
  return v || '';
}

/**
 * Deja una columna con formato de colones.
 * El valor se guarda como NÚMERO y solo se cambia cómo se ve: así se puede
 * seguir sumando, promediando y filtrando. Si fuera texto ya formateado,
 * la hoja no podría hacer cuentas con él.
 */
function colones(h, columna) {
  const filas = Math.max(h.getMaxRows() - 1, 1);
  h.getRange(2, columna, filas, 1).setNumberFormat('"₡"#,##0');
}
