# POUCH CLUB® — catálogo

Catálogo web para vender VELO y ZYN por WhatsApp. No tiene servidor ni base de
datos: son archivos sueltos que se suben a GitHub Pages y listo.

---

## 1. Lo primero: poné tu número de WhatsApp

Abrí `data/products.js` y cambiá esta línea:

```js
whatsapp: "50600000000",
```

Por tu número con código de país y **solo dígitos**. Costa Rica es `506` + los 8
dígitos. Ejemplo: `"50688887777"`.

Mientras no lo cambies, el botón de enviar avisa que falta configurarlo en vez
de abrir un chat equivocado.

---

## 2. Subirlo a GitHub Pages

1. Creá un repositorio nuevo en GitHub.
2. Subí **todo** el contenido de esta carpeta (arrastrar y soltar en la web de
   GitHub funciona).
3. En el repo: **Settings → Pages → Source: Deploy from a branch →
   rama `main`, carpeta `/ (root)`** → Save.
4. En un par de minutos queda en `https://TUUSUARIO.github.io/NOMBREDELREPO/`.

Cada vez que cambiás un archivo en GitHub, el sitio se actualiza solo en ~1 min.

---

## 3. El día a día: cambiar el stock

Dos formas. Las dos terminan en lo mismo: actualizar `data/products.js`.

**Opción A — el panel (más cómodo)**

Entrá a `https://tusitio.../admin.html`. Ahí ajustás el stock con `+` y `–`,
cambiás las probabilidades de la ruleta y la configuración. Cuando terminás,
tocás **Descargar products.js** y subís ese archivo a GitHub reemplazando
`data/products.js`.

El panel no está enlazado desde ningún lado del sitio: solo llega quien conoce
la dirección. No es una contraseña real, pero tampoco hay nada que romper desde
ahí: lo único que hace es generarte un archivo.

**Opción B — a mano**

En GitHub, abrí `data/products.js`, tocá el lápiz y cambiá el número de `stock`.
Confirmá el cambio. Listo.

- `stock: 0` → el producto aparece **AGOTADO** y no se puede agregar al carrito.
- Con 3 o menos aparece la etiqueta dorada **"Quedan 3"** (el umbral se ajusta
  con `stockBajo`).

---

## 4. Los puntos de intensidad

Los puntitos de cada tarjeta son la escala que viene **impresa en la lata**, no
un invento nuestro.

**VELO usa una escala de 6 puntos:**

| Puntos | Nicotina por pouch |
|---|---|
| 1 | 4 mg |
| 2 | 6 mg |
| 3 | 8–10 mg |
| 4 | 10,9–11 mg |
| 5 | 14 mg |
| 6 | 17 mg |

Por eso Freezing Peppermint (10,9 mg) lleva 4 puntos, y Watermelon Ice,
Blueberry Ice y Purple Grape llevan 3.

**ZYN usa su propia escala de 4.** El Spearmint Mini marca 2 de 4, con 6 mg.

En `data/products.js` son dos campos: `fuerza` (puntos llenos) y `fuerzaMax`
(cuántos puntos tiene la escala de esa marca). En el sitio salen como puntitos,
sin texto explicativo; al pasar el mouse por encima aparece "3 de 6" como ayuda.

---

## 5. La ruleta

Hay un producto escondido del catálogo: **ZYN Wintergreen 6 mg**. Está marcado
con `hidden: true` y solo se consigue girando.

| Premio | Probabilidad |
|---|---|
| 1 Wintergreen GRATIS | 5 % |
| 2 Wintergreen por ₡5.000 | 10 % |
| 1 Wintergreen a ₡3.000 | 30 % |
| Nada | 55 % |

La rueda reparte sus 16 gajos sola, en proporción a estos pesos. Si los cambiás
en `data/products.js` o en el panel, el dibujo se reacomoda solo: no hay que
tocar código.

Cómo se comporta:

- **La ruleta es un extra del pedido, no un pedido en sí.** No se ve ni se puede
  girar hasta que haya algo en el carrito; si lo vacían, se vuelve a esconder.
  Y con el premio adentro, no pueden borrar lo último que compraban para
  mandarte solo el premio: el sistema no los deja.
- **El código no se muestra en la pantalla de la ruleta.** Ahí la única decisión
  es sumarlo al pedido o no. El código aparece en el carrito y viaja en el
  mensaje de WhatsApp.
- **Un giro por dispositivo cada 7 días.** Se guarda en el navegador de quien
  visita. Si alguien borra los datos del navegador o entra en modo incógnito,
  puede volver a girar: es un juego de marketing, no un sistema de seguridad.
- **El premio no se agrega solo.** Al ganar, pregunta *"¿Lo agregamos a tu
  pedido?"*. Y si después lo quieren sacar, pide confirmación antes de quitarlo.
- Al ganar se genera un **código tipo `ZC-K7PM-42`**. No se valida contra nada:
  es un identificador para que vos reconozcas el premio en el chat.
- El código y el premio viajan dentro del mensaje de WhatsApp.
- Una vez enviado un pedido, ese código no se vuelve a enganchar a un segundo
  pedido de la misma persona.
- Si el stock de Wintergreen llega a 0, los premios que lo necesitan dejan de
  salir automáticamente.

Para cambiar las probabilidades, editá el campo `peso` de cada premio en
`data/products.js` (o usá el panel). Son pesos relativos: la suma se convierte
en 100 %.

**Si algún día querés vender el Wintergreen normal:** borrá la línea
`hidden: true` de ese producto y aparece en el catálogo como uno más.

---

## 6. Fotos de los productos

Las seis latas usan **fotos oficiales** de cada producto, recortadas con fondo
transparente y en la intensidad exacta que vos vendés — los puntitos impresos en
la lata coinciden con los mg de la tarjeta. Están en `img/`, una por producto:

```
img/velo-watermelon-ice.png        img/velo-purple-grape.png
img/velo-freezing-peppermint.png   img/zyn-mini-spearmint.png
img/velo-blueberry-ice.png         img/zyn-wintergreen.png
```

**Para poner fotos tuyas:** reemplazá el archivo con el mismo nombre. Nada más.
PNG con fondo transparente y cuadrada (900×900 va perfecto).

Si algún archivo falta o falla al cargar, el catálogo dibuja solo una lata
vectorial con el color del sabor, así que nunca queda un hueco.

### El escudo redondo

`style/Logo_paraICO.svg` salió en tres versiones dentro de `img/`:

| Archivo | Para qué |
|---|---|
| `logo-redondo.svg` | ícono de la pestaña en navegadores modernos |
| `logo-redondo-crema.svg` | la silueta del centro de la ruleta (el “PC” va calado) |
| `apple-touch-icon.png` | cuando alguien guarda el sitio en su iPhone |
| `icono-512.png` | la miniatura al compartir el link |

El `favicon.ico` de la raíz lo regeneré desde el mismo vector con seis tamaños
(16 a 256 px): pesa 57 KB en vez de 432 KB y se ve igual.

En el centro de la ruleta el escudo se repinta con el mismo metal dorado del
aro. El acabado se elige en `assets/js/wheel.js`, arriba del todo:

```js
var ESCUDO_ACABADO = "oro-limpio";
```

- `oro-limpio` — escudo dorado grande, sin aro: el escudo mismo hace de borde.
- `crema` — escudo crema dentro del aro dorado.
- `oro` — escudo dorado dentro del aro dorado (se funden, no lo recomiendo).

---

> Las fotos actuales son material de BAT (VELO) y Philip Morris (ZYN). Mostrarlas
> es lo que hace cualquier revendedor, pero si el sitio crece conviene cambiarlas
> por fotos propias de tus latas.

---

## 7. Cómo arranca el sitio

El orden es siempre el mismo:

```
1. Pantalla de carga   ->  2. Puerta +18   ->  3. Intro del hero   ->  catálogo
```

**La pantalla de carga** descarga de antemano las seis fotos y los logos, y la
barra dorada sigue el avance real. Se queda en pantalla un mínimo de 1,2 s para
que no pegue un parpadeo, y se va igual a los 4,5 s aunque algún archivo no
conteste. Si el JavaScript no llegara a correr, una animación de CSS la retira
sola a los 9 s: no puede dejar el sitio trabado.

**La puerta +18** aparece recién cuando el telón de carga terminó de subir. Y la
intro del hero no arranca hasta que la puerta terminó de desaparecer, para que
no se superpongan.

**La intro animada.** El hero se arma pieza por pieza, se sostiene un instante y
la página baja sola hasta el catálogo (unos 4,7 s). Corre igual en celular que
en computadora, y se corta sola con cualquier scroll, toque, tecla o con el
botón *Saltar intro*.

En `assets/js/app.js` buscá `var INTRO = true;`

- `var INTRO = false;` la apaga del todo.
- Justo debajo hay tres líneas comentadas para que se vea **una sola vez por
  visita** en vez de en cada carga.
- `T_ENTRADA`, `T_PAUSA` y `T_BAJADA` son los tres tiempos, en milisegundos
  (2550 de entrada / 0 quieto / 850 bajando). Si cambiás `T_ENTRADA`, acordate
  de que los retardos de cada pieza del hero (`--d` en `index.html` y `ein` en
  `app.js`) tienen que caber dentro de ese tiempo.

**Para apagar la pantalla de carga:** borrá el bloque `<div class="loader">` de
`index.html`. El sitio sigue funcionando igual; el arranque pasa a ser puerta
+18 → intro.

**La sección "Tres pasos y listo".** Está escrita pero oculta. Para mostrarla de
nuevo, en `index.html` borrá el `hidden` de:

```html
<section class="sec" id="como" hidden>
```

y volvé a poner el enlace `Cómo pedir` en el menú de arriba.

---

## 8. Qué hay en cada archivo

```
index.html              el catálogo
admin.html              el panel de stock (no está enlazado)
data/products.js        LOS DATOS — es lo único que vas a editar seguido
assets/css/styles.css   todos los estilos
assets/js/app.js        carrito, filtros, intro, mensaje de WhatsApp
assets/js/wheel.js      la ruleta (canvas), el reparto de gajos y el confeti
assets/js/can.js        dibuja las latas de respaldo
img/                    las fotos de los productos y los logos
favicon.ico             el escudo redondo, para la pestaña del navegador
style/                  los originales que me pasaste (logos y paleta PDF)
```

Los colores salen de `POUCH_CLUB_Paleta_de_Colores.pdf`: Forest Green `#06402B`,
Warm Cream `#F7F2E8`, Sage `#8CA680`, Mustard Gold `#D4A21C`, Soft Stone
`#D9D2C3` y Deep Charcoal `#1F2A24`.

---

## 8b. Probar la ruleta varias veces

El giro se guarda por dispositivo, así que después del primero habría que
esperar una semana. Para probar, abrí el sitio con `?resetgiro` al final:

```
http://localhost:8000/?resetgiro
```

Eso borra el giro guardado y el premio, y podés volver a girar. **Funciona
únicamente en localhost o en tu red local**: en el sitio publicado en GitHub
Pages esa dirección no hace absolutamente nada, así que nadie puede usarla para
girar de más.

---

## 9. Probarlo en tu computadora

Abrir `index.html` con doble clic funciona. Para que el panel pueda conservar los
comentarios del archivo de datos al generarlo, mejor levantá un servidor local:

```bash
cd "Catalogo Pouch"
python3 -m http.server 8000
```

Y entrá a `http://localhost:8000`.

---

## 10. Datos de quien compra

No se pide ni se guarda ningún dato personal. Lo único que queda en el navegador
de la persona es su carrito, si ya confirmó ser mayor de edad, y cuándo giró la
ruleta por última vez. Nada de eso sale de su dispositivo ni te llega a vos: el
pedido llega cuando la persona aprieta enviar en WhatsApp.
