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

## El sobrante no se acumula

Al cerrar un día se guarda la diferencia entre el sobre y lo gastado, que puede ser
positiva o negativa. **Queda anotado y nada más.** No se suma al día siguiente: ahorrar
hoy no habilita gastar más mañana, y por eso `periodCalc()` no mira `closed[]` ni tiene
por qué hacerlo. Si alguna vez se propone "arrastrar el sobrante", es un cambio de idea
del proyecto, no una mejora.

`closeDays()` corre al abrir la app y al volver a ella (`visibilitychange`), y cierra
todos los días del período que hayan quedado abiertos, incluidos los huecos del medio.
**No hay proceso a medianoche** ni timer: la app no está corriendo cuando pasa la
medianoche. El día de hoy nunca se cierra.

De cada día se guarda sólo `{date, envelope}`. El sobre es lo único irrecuperable después
— el diario calculado se mueve con cada gasto único —, mientras que lo gastado se lee de
`items` en cada render. Así, anotar hoy un café de ayer corrige el cierre de ayer en vez
de dejarlo mintiendo. No guardar el `diff` es a propósito: sería una segunda fuente de
verdad que se desincroniza.

Un cierre retroactivo usa el sobre de hoy, porque no hay registro de cuál regía ese día.
Los días que se cierran uno por uno, con la app abriéndose a diario, son exactos.

`periodTally()` devuelve el acumulado **neteado**: los días que se pasaron descuentan. Un
contador que sólo sube sería mentira.

Sobre el signo y el color: el sobrante va en `--teal` con `+`, el exceso en `--ink-soft`
con `−` y un fondo apenas tibio. **El exceso nunca va en `--clay` ni en rojo de alarma.**
Es un registro para encontrar el día que se fue de línea, no un reto. El acumulado en
negativo sí usa `--ochre`, que es lo más fuerte que corresponde acá.

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

La única excepción es `sw.js`, y es forzada: un service worker no se puede registrar
desde un script embebido. Está en la misma categoría que `manifest.json` y los íconos —
archivos sueltos en la raíz que el navegador exige separados —, no es una puerta abierta
a partir el JS de la app en módulos.

**Sin backend.** Los datos viven en `localStorage` y, opcionalmente, en un Gist secreto
del usuario. No agregar servidores, bases de datos ni servicios de terceros.

**Nada que se baje de la red al abrir.** La app tiene que arrancar entera sin señal: el
momento en que el usuario más quiere anotar un gasto es en el subte. Por eso las
tipografías son del sistema (`--sans`, `--display`, `--mono` en `:root`) y no de Google
Fonts, que era lo que había antes y hacía que sin red cargara fea. Si alguna vez se
quiere una tipografía propia, va empaquetada en el archivo, nunca por CDN.

**El token nunca va en el repo.** El token de GitHub lo escribe el usuario en cada
dispositivo y queda en `localStorage` bajo la clave `sobres.sync`. El repo es público:
nada de credenciales en el código, ni de ejemplo.

## Cómo funciona la sincronización

Un Gist secreto con un único archivo, `sobres.json`, creado por la app la primera vez.
Permiso necesario en el token: **Gists: read and write**, nada más.

El estado que se persiste (schema 3):

```json
{ "schema": 3, "daily": 10000, "dailyMode": "auto", "weekStart": 1,
  "periods": [ { "id": 1, "start": "2026-08-05", "end": "2026-09-05", "transport": 60000,
                 "incomes": [ { "id": 1, "date": "2026-08-05", "amount": 900000, "note": "sueldo" } ] } ],
  "closed": [ { "date": "2026-08-05", "envelope": 25870 } ],
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

Los `closed` se unen por `date`, como los items: dos dispositivos sin conexión entre
medio cerraron días distintos y los dos valen.

`save()` acepta `save(false)` para persistir sin marcar tiempo ni disparar un push. Se usa
después de traer datos remotos, para no rebotar el cambio de vuelta al Gist.

## Sin conexión

`sw.js` cachea la app y los íconos con **cache-first**: se sirve de la copia local y sólo
va a la red si no la tiene. `VERSION` adentro del worker se sube junto con la versión de
la app. Si `sw.js` no cambia ni un byte, el navegador no detecta que hay algo nuevo y el
usuario se queda con la versión vieja para siempre.

Dos detalles que parecen de más y no lo son:

- El worker se registra con `updateViaCache:'none'`. Sin eso el propio `sw.js` se puede
  servir desde el caché HTTP y una versión vieja se perpetúa a sí misma.
- En `install` los assets se traen con `fetch(u, {cache:'reload'})` en vez de `addAll` a
  secas. Con `addAll`, el worker nuevo se llena desde el caché HTTP del navegador y puede
  guardar el `index.html` viejo: la actualización se instala sin traer nada nuevo.

**Nada de `skipWaiting()` automático.** La app anclada a inicio se queda abierta días;
recargarla de golpe abajo de alguien que está anotando un gasto es peor que esperar. El
worker nuevo queda esperando, la app muestra el aviso de versión nueva y recién cuando el
usuario toca Actualizar se manda `SKIP_WAITING`. El `controllerchange` sólo recarga si el
usuario lo pidió: en la primera visita ese evento también se dispara, por el
`clients.claim()`, y recargar ahí es un parpadeo sin motivo.

Sin ese aviso habría que borrar el ícono de la pantalla de inicio y volver a anclarlo
para ver una versión nueva.

La sincronización **no** se cachea. `api.github.com` no pasa por el worker: tiene que
fallar de verdad cuando no hay red, para que la cola y los reintentos hagan su trabajo.

### La cola

Lo que se anota sin conexión queda en `sync.pending` (ids de movimientos) y `sync.dirty`
(cambios que no son movimientos). Vive en el blob de sincronización, no en el estado: es
de este dispositivo, no del usuario, y no tiene por qué viajar al Gist. Se persiste, así
que cerrar y abrir la app sin red no pierde la cuenta.

La cola se vacía **dentro de `push()`**, recién cuando la subida salió bien. Vaciarla en
`run()` haría que un `pull()` exitoso borrara la cuenta de cosas que todavía no subieron.

El evento `online` dispara el envío sin esperar el backoff. Los reintentos usan `BACKOFF`
(5 s a 5 min) y sólo para errores de red: un token inválido o un Gist que no existe son
`kind:'stop'` y van al estado de error, porque reintentar no los arregla.

El indicador tiene cinco estados y hay que poder distinguirlos: sin configurar,
sincronizando, al día, **N sin sincronizar** y error. El cartel de arriba (`#netBar`)
aparece sólo en los dos últimos: estando al día no molesta. Existe porque el usuario tiene
que ver que le quedaron cosas sin subir **sin abrir Ajustes**.

Cuidado con el CSS: `.netbar` y `.update` tienen `display` explícito, que le gana al
atributo `hidden` del navegador. Por eso está `.netbar[hidden],.update[hidden]{display:none}`.
Sin esa línea el cartel no se puede esconder nunca.

## Versión del formato y migración

`schema` es la versión del formato de datos, distinta de la versión de la app.
`migrate(raw)` es la única puerta de entrada: pasan por ahí `localStorage`, lo que baja
del Gist y los respaldos importados. Devuelve `{ok:true, state, migrated}` o
`{ok:false, reason}`.

**Un schema más nuevo que `SCHEMA` no se toca.** Es un dispositivo desactualizado leyendo
datos de uno actualizado; pisarlos es la forma más rápida de perderlos. La app levanta
`blocked`, muestra el aviso del header, deshabilita todo lo que escribe y corta el push.

Las migraciones son escalones encadenados: `if(from < 2) d = up1to2(d); if(from < 3) d =
up2to3(d);`. Un schema 1 pasa por los dos de una y llega al formato actual. Al agregar un
escalón nuevo, no tocar los anteriores.

`up1to2` no inventa ingresos, porque en los datos viejos no hay: arma el período con lo
que sí hay — el rango que cubren los gastos y lo gastado en transporte — y deja el diario
en `manual` con el valor que ya tenía, así el número no cambia solo debajo de los pies
del usuario. `up2to3` arranca `closed` vacío y deja que `closeDays()` complete los días
ya pasados en el primer arranque. El criterio se mantiene: nunca completar con datos que
el usuario no cargó.

**Un campo nuevo obliga a subir el schema**, aunque parezca compatible. `normalize()`
reconstruye el objeto campo por campo, así que una versión vieja de la app que lea datos
nuevos no ignora lo que no conoce: lo borra, y después lo sube así al Gist. Subir el
número hace que esa versión se bloquee en vez de destruir el campo.

La migración baja a disco con `save(false)`. Con `save()` a secas, un dispositivo que
abre con datos viejos marcaría `updatedAt` a ahora y le ganaría la configuración al que
ya está al día. Los cierres de `closeDays()` se persisten igual, por lo mismo.

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
- `manifest.json`, `sw.js` y los íconos van en la raíz del repo, junto a `index.html`.

## Al tocar el archivo

Verificar la sintaxis antes de dar por terminado un cambio (`node --check` sobre el bloque
`<script>` extraído alcanza). No hay tests ni CI: lo que se sube al repo es lo que corre.

Si se toca el service worker o la sincronización, probarlo **con el servidor caído de
verdad**, no con el toggle de las devtools: se sirve la carpeta con `python3 -m
http.server`, se carga la app, se mata el servidor, se corta la red del contexto y se
recarga. Si abre, es porque la está sirviendo el worker. Ojo con dejar servidores
huérfanos de una corrida anterior ocupando el puerto: el `spawn` nuevo no bindea y el
viejo sigue respondiendo, así que la prueba miente.

Si se toca `migrate()`, el cálculo del diario o el cierre de días, probarlo de verdad
antes de subir. El
bloque `<script>` se puede extraer con una regex y correr en `node:vm` con un `document`
y un `localStorage` de mentira; alcanza para migrar un export viejo real y revisar el
estado resultante, sin agregarle una sola dependencia al repo.
