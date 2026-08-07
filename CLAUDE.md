# Sobres

App personal de registro de gastos diarios. Se publica en GitHub Pages
(`guerrasur/sobres-personal`) y se usa anclada a la pantalla de inicio en Safari (iOS)
y desde el navegador en la computadora.

## Idea central

Un sobre por día. El usuario anota lo que gasta hasta agotarlo. **No es una app de
contabilidad: no lleva saldos ni cuentas, y no intenta reflejar la plata real del
usuario.** Solo responde "cuánto puedo gastar hoy" y "cómo viene la semana". Cualquier
propuesta de agregar conciliación, transferencias o un "te quedan X en total" está
fuera del punto del proyecto.

El monto diario sale de un **período**: un tramo con fecha de inicio, fecha de fin y uno
o más ingresos ("cobré el 5, tengo que llegar al 5 del mes que viene"). Los ingresos son
irregulares a propósito — algunos meses hay uno solo, otros hay tres de montos distintos.

```
sobre diario = (ingresos del período − transporte presupuestado − únicos ya hechos)
               ÷ días que faltan hasta el fin del período
```

Se recalcula en cada render, así que un gasto único cargado a mitad de camino baja el
diario del resto de los días al instante. Ese es el comportamiento central: si el usuario
compra algo de 38.000, quiere ver ya cuánto le queda por día hasta el final.

La fecha de fin es el día del próximo cobro: arranca el período siguiente y **no** cuenta
como día de este. Hoy sí cuenta. El diario nunca se muestra negativo; si los únicos se
comieron el período, es cero y el panel lo explica.

El botón grande del diario abre el desglose (`renderDaily`) con cada término de la
cuenta. El número tiene que poder auditarse desde la app, no de memoria.

`dailyMode` puede ser `'auto'` o `'manual'`. En manual el usuario fija el número a mano y
el badge del chip pasa a ocre con la marca "a mano": nunca hay que dejar ambiguo de dónde
sale el monto. Cuando no hay con qué calcular (sin período, período vencido, sin
ingresos) el diario **no** se inventa: se muestra "—" y se dice qué falta.

Las tres categorías no son decorativas, cada una sale de un bolsillo distinto:

- `diario` — sale del sobre del día (café, kiosco, almuerzo). Consume el sobre de hoy y
  no toca el cálculo del período.
- `transporte` — presupuesto aparte, definido por período (`period.transport`). Lo que se
  descuenta del cálculo es el **presupuesto**, no lo gastado: anotar un viaje no mueve el
  diario.
- `unico` — compras puntuales que no deben romper el día (un cargador, un repuesto). No
  salen del sobre de hoy, pero sí bajan el diario de todos los días que quedan.

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

El estado que se persiste (schema 2):

```json
{ "schema": 2, "daily": 10000, "dailyMode": "auto", "weekStart": 1,
  "periods": [ { "id": 1, "start": "2026-08-05", "end": "2026-09-05", "transport": 60000,
                 "incomes": [ { "id": 1, "date": "2026-08-05", "amount": 900000, "note": "sueldo" } ] } ],
  "deleted": [], "updatedAt": 0, "items": [] }
```

La fusión entre dispositivos (`merge()`) sigue tres reglas, y están así a propósito:

1. Los `items` se unen por `id`, así que gastos cargados en dos dispositivos sin conexión
   entre medio conviven en vez de pisarse.
2. Los borrados se registran como lápidas en `deleted`. Sin eso, un gasto borrado en el
   celular revive en la próxima sincronización desde la computadora.
3. La configuración (`daily`, `dailyMode`, `weekStart`, `periods`) sí es
   último-en-escribir-gana, según `updatedAt`. `periods` va entero, no fusionado por id:
   un período medio mezclado entre dos dispositivos daría un diario que no es el de
   ninguno de los dos.

`save()` acepta `save(false)` para persistir sin marcar tiempo ni disparar un push. Se usa
después de traer datos remotos, para no rebotar el cambio de vuelta al Gist.

## Versión del formato y migración

`schema` es la versión del formato de datos, distinta de la versión de la app.
`migrate(raw)` es la única puerta de entrada: pasan por ahí `localStorage`, lo que baja
del Gist y los respaldos importados. Devuelve `{ok:true, state, migrated}` o
`{ok:false, reason}`.

**Un schema más nuevo que `SCHEMA` no se toca.** Es un dispositivo desactualizado leyendo
datos de uno actualizado; pisarlos es la forma más rápida de perderlos. La app levanta
`blocked`, muestra el aviso del header, deshabilita todo lo que escribe y corta el push.

La migración de schema 1 (`up1to2`) no inventa ingresos, porque en los datos viejos no
hay: arma el período con lo que sí hay — el rango que cubren los gastos y lo gastado en
transporte — y deja el diario en `manual` con el valor que ya tenía, así el número no
cambia solo debajo de los pies del usuario. Cuando se agregue un schema 3, seguir el
mismo criterio: migrar hacia adelante en pasos (`if(from < 3) d = up2to3(d)`) y nunca
completar con datos que el usuario no cargó.

La migración baja a disco con `save(false)`. Con `save()` a secas, un dispositivo que
abre con datos viejos marcaría `updatedAt` a ahora y le ganaría la configuración al que
ya está al día.

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

Si se toca `migrate()` o el cálculo del diario, probarlo de verdad antes de subir. El
bloque `<script>` se puede extraer con una regex y correr en `node:vm` con un `document`
y un `localStorage` de mentira; alcanza para migrar un export viejo real y revisar el
estado resultante, sin agregarle una sola dependencia al repo.
