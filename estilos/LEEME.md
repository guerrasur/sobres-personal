# Estilos guardados

Acá viven versiones enteras de la app congeladas por su **aspecto**, para poder
volver a mirarlas o retomarlas más adelante. No son parte de la app: `index.html`
en la raíz sigue siendo el único archivo que corre. Nada de acá se carga, se
importa ni se linkea desde la app.

## `oscuro-v4.0.0.html`

El rediseño oscuro completo, tal como se publicó en la v4.0.0 y como se revirtió
en la v4.1.0. Es el `index.html` entero de esa versión: HTML, CSS y JS, sin
dependencias, igual que el de la raíz.

Cómo se veía, en cinco reglas:

- Fondo negro (`--bg:#000`), texto blanco, dos grises para lo secundario
  (`--fg-2`, `--fg-3`) y hairlines de 1px (`--line`, `--line-2`) como único
  separador. `--surface:#141414` sólo para campos y avisos: no hay tarjetas.
- **Un solo acento de color, reservado al saldo**: `--ok:#3DD68C` si queda plata,
  `--bad:#FF453A` si está en cero o en negativo. Nada más lleva color — ni las
  categorías, ni el sobrante del período, ni el estado de la sincronización, que
  se resuelve con relleno y hueco.
- Toda la app en monoespaciada del sistema (`--mono`), así las columnas se
  alinean solas.
- `Hoy` es el número grande a media altura, la línea de proporción y, con mucho
  aire abajo, el formulario sin cajas: el monto es una línea, las categorías son
  tres palabras con subrayado y Anotar es el único botón lleno.
- `Resumen` se lee como una tabla: rótulo gris a la izquierda, número a la
  derecha. La semana son siete filas (día · gastado · cuánto se llenó el sobre)
  en vez de la tira de siete sobres.

Además del CSS, esa versión cambió el markup del formulario, de la semana y de
los totales, y seis funciones `render*`. Por eso se guarda el archivo entero:
con la hoja de estilos sola no alcanza para volver a armarlo.

### Si se quiere retomar

Lo más simple es partir de este archivo y traerle lo que haya cambiado en la app
desde la v4.0.0, no al revés. Antes de mirarlo, un repaso rápido de lo que ese
diseño se llevó puesto y habría que decidir de nuevo:

- El sobrante del período perdió el teal y el ocre.
- Las tres categorías perdieron su color propio.
- El saldo perdió el escalón ámbar del 25%: verde o rojo, nada en el medio.
- La barra de estado de iOS pasó a `black-translucent` con `viewport-fit=cover`,
  y con fondo claro eso deja el reloj ilegible: va junto con el fondo negro, no
  suelto.

### Ojo al abrirlo

Está congelado: no recibe los arreglos que sí van a `index.html`. Y si se sirve
desde el mismo dominio que la app, **lee y escribe el mismo `localStorage`**, que
es por origen y no por carpeta. Para mirarlo sin tocar nada, abrirlo desde otro
origen (un `file://` o un servidor local aparte).
