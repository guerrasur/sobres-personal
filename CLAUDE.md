# Sobres

App personal de registro de gastos diarios. Se publica en GitHub Pages
(`guerrasur/sobres-personal`) y se usa anclada a la pantalla de inicio en Safari (iOS)
y desde el navegador en la computadora.

## Idea central

Un sobre por día. El usuario define un monto diario y anota lo que gasta hasta agotarlo.
No es una app de contabilidad: no lleva saldos, ni cuentas, ni ingresos. Solo responde
"cuánto me queda hoy" y "cómo viene la semana".

Las tres categorías no son decorativas, cada una sale de un bolsillo distinto:

- `diario` — sale del sobre del día (café, kiosco, almuerzo).
- `transporte` — presupuesto mensual aparte, no toca el sobre diario.
- `unico` — compras puntuales que no deben romper el día (un cargador, un repuesto).
  Se contabilizan en el total del mes pero quedan fuera del cálculo diario.

## Restricciones que no se negocian

**Un solo archivo.** `index.html` contiene HTML, CSS y JS. Sin build, sin bundler, sin
dependencias instalables. Se edita, se sube al repo y ya está en producción. Cualquier
propuesta que requiera `npm install` rompe el punto del proyecto.

**Sin backend.** Los datos viven en `localStorage` y, opcionalmente, en un Gist secreto
del usuario. No agregar servidores, bases de datos ni servicios de terceros.

**El token nunca va en el repo.** El token de GitHub lo escribe el usuario en cada
dispositivo y queda en `localStorage` bajo la clave `sobres.sync`. El repo es público:
nada de credenciales en el código, ni de ejemplo.

## Cómo funciona la sincronización

Un Gist secreto con un único archivo, `sobres.json`, creado por la app la primera vez.
Permiso necesario en el token: **Gists: read and write**, nada más.

El estado que se persiste:

```json
{ "daily": 10000, "weekStart": 1, "deleted": [], "updatedAt": 0, "items": [] }
```

La fusión entre dispositivos (`merge()`) sigue tres reglas, y están así a propósito:

1. Los `items` se unen por `id`, así que gastos cargados en dos dispositivos sin conexión
   entre medio conviven en vez de pisarse.
2. Los borrados se registran como lápidas en `deleted`. Sin eso, un gasto borrado en el
   celular revive en la próxima sincronización desde la computadora.
3. La configuración (`daily`, `weekStart`) sí es último-en-escribir-gana, según `updatedAt`.

`save()` acepta `save(false)` para persistir sin marcar tiempo ni disparar un push. Se usa
después de traer datos remotos, para no rebotar el cambio de vuelta al Gist.

## Trampas de iOS ya resueltas — no reintroducir

Estas líneas parecen redundantes y no lo son. Costaron una sesión entera de descarte.

**El teclado no aparecía en modo standalone.** La app anclada a inicio registraba los
toques y ejecutaba JS, pero al tocar un campo no subía el teclado. Lo que lo arregló:

- `-webkit-user-select: text` y `-webkit-touch-callout: default` en `body` y en los inputs.
  WebKit en standalone trata los campos como no editables si esto no está explícito.
- `touch-action: manipulation` en los inputs.
- Quitar el `.focus()` programático al tocar un sobre de la tira semanal. iOS acepta el
  foco pero no levanta el teclado, y deja el campo "activo" de mentira.

**`visibilitychange`, nunca `window.addEventListener('focus')`.** En standalone el evento
`focus` de ventana se dispara de más, incluso cuando un input toma el foco. Eso arrancaba
una sincronización, redibujaba media pantalla y mataba el foco recién adquirido.

**Los inputs van a 16px o más.** Abajo de eso Safari hace zoom automático al enfocar.

## Número de versión — obligatorio

La app muestra su versión en un header chico debajo del título ("Sobres" → `v1.0.0`).
Esto no es decorativo: iOS cachea con insistencia la app anclada a inicio, así que sin el
número visible no hay forma de saber si lo que se está probando es el archivo recién
subido o el viejo en caché.

**Cada vez que se modifica `index.html`, se sube el número en el mismo commit.** Cambios
de comportamiento suben la minor (`v1.1.0`), arreglos suben la patch (`v1.0.1`). Entregar
un cambio sin tocar la versión hace perder tiempo depurando un archivo que ni siquiera
llegó al dispositivo.

Aplica a cualquier app de este usuario, no solo a esta.

## Detalles menores

- Moneda: pesos argentinos, `Intl.NumberFormat('es-AR')`, sin decimales.
- Interfaz en español rioplatense. Voseo en los botones ("Anotá", "Sincronizá") y en los
  textos de estado.
- La semana arranca el lunes por defecto (`weekStart: 1`), configurable a domingo.
- Los íconos son `#242424` con glifo blanco, para que combinen con la pantalla de inicio
  del usuario. Si se rediseñan, mantener ese fondo y regenerar los cuatro tamaños.
- `manifest.json` y los íconos van en la raíz del repo, junto a `index.html`.

## Al tocar el archivo

Verificar la sintaxis antes de dar por terminado un cambio (`node --check` sobre el bloque
`<script>` extraído alcanza). No hay tests ni CI: lo que se sube al repo es lo que corre.
