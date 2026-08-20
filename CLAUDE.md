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

Hay dos formas de definir ese período, y son modos distintos de `dailyMode`. La de arriba
es `'auto'`: tramos cargados a mano en Ajustes. La otra es `'sueldo'`, para el caso
común de un sueldo fijo: el usuario dice cuánto cobra y **qué día del mes**, y los ciclos
salen solos de ahí — ver "El modo sueldo" más abajo.

```
sobre diario = (ingresos del período − todo lo anotado desde el arranque)
               ÷ días que faltan hasta el fin del período
```

**Un solo sobre y nada de presupuestos.** Las tres categorías descuentan de la misma
plata: el bondi, el cargador y el café salen todos de ahí. No hay un presupuesto de
transporte que el usuario declare por adelantado ni una categoría que no cuente — la app
no le cree a lo dicho, mira lo anotado.

Se recalcula en cada render, así que un gasto cargado a mitad de camino baja el diario del
resto de los días al instante. Ese es el comportamiento central: si el usuario compra algo
de 38.000, quiere ver ya cuánto le queda por día hasta el final.

**Lo de hoy no entra en la resta**: lo descuenta el número grande (`diario − lo gastado
hoy`), y restarlo también del pool sería contarlo dos veces. Lo cargado con fecha futura
sí entra: ya se sabe que va a salir.

La fecha de fin es el día del próximo cobro: arranca el período siguiente y **no** cuenta
como día de este. Hoy sí cuenta. El diario nunca se muestra negativo; si lo anotado se
comió el período, es cero — y ahí la app pregunta cuánta plata queda de verdad (ver
"Llegaste a $0").

Tocar el número grande abre la cuenta (`renderWhy`) con cada término, hasta lo que queda
hoy. El número tiene que poder auditarse desde la app, no de memoria. Es el **único**
lugar donde se explica de dónde sale: nunca fijo en pantalla.

## La pantalla principal son tres cosas

La app se abre para anotar un gasto y cerrarla. La vista `Hoy` tiene tres cosas y nada
más, en este orden:

1. **Cuánto queda hoy**, el número grande, sin nada al lado. Debajo va una barra fina con
   la proporción del día: dice lo mismo que "gastaste X de Y" sin repetir una cifra.
2. **El formulario**, visible sin scrollear apenas se abre la app.
3. **Lo anotado hoy**, la lista.

Todo lo demás —la semana, los días cerrados, el mes, el historial completo y los
ajustes— vive en la vista `Resumen`, a un toque de distancia (`setView`). Volver a meter
tarjetas explicativas arriba del formulario es deshacer el rediseño.

Pegado al número, abajo de "la cuenta", va un link chico para cargar la plata que hay
ahora (ver "La plata que hay ahora"). Está ahí porque es lo que cambia ese número, y es un
link y no una tarjeta: sin tocarlo, la pantalla sigue siendo la de siempre.

Abajo de la lista de las tres cosas, y **abajo del formulario**, va el bloque de exportar:
el botón fijo y, una vez al mes, el aviso. Es lo único que se le suma a la pantalla, y va
al final justamente para no competir con anotar (ver "Exportar").

Anotar un gasto típico son **dos toques y nada de scroll**: tocar el monto, escribirlo,
tocar Anotar. Por eso el monto va primero, la categoría son tres botones a la vista
(vuelve sola a "Del día" después de anotar), la nota es opcional y va última, y la fecha
es hoy y **no se muestra** — aparece sólo si se toca "otro día". Cualquier campo nuevo
en ese formulario cuesta un toque: va escondido o no va.

Ningún número lleva un párrafo al lado. Si hace falta aclarar algo, es una línea corta y
sólo dentro de la cuenta que se abre al tocar el número. La app tampoco manda a
configurar nada: el sobre fijado a mano es una opción válida y le alcanza con una
etiqueta chica.

## El sobrante se reparte entre los días que faltan

Hasta la v4.7.0 el sobrante quedaba anotado y nada más: ahorrar hoy no habilitaba gastar
más mañana. **Eso cambió en la v5.0.0**, y no como una mejora suelta sino como
consecuencia de que el diario ahora se calcula sobre lo que queda de verdad. Si el pool es
"lo que entró menos todo lo anotado", entonces gastar de menos un día deja más para
repartir, igual que gastar de más deja menos. Las dos mitades son la misma cuenta: no se
puede tener una sin la otra.

No es "arrastrar el sobrante" al día siguiente —el sobrante de hoy no se suma entero a
mañana—: se reparte entre **todos** los días que quedan, así que un día frugal sube el
diario apenas y un exceso lo baja apenas. La cuenta cierra sola: gastando exactamente el
sobre todos los días, el número no se mueve nunca.

`periodCalc()` sigue sin mirar `closed[]`, y no tiene por qué: lo que queda se calcula
desde `items`, que es el registro de lo que pasó. `closed[]` es para el resumen.

Al cerrar un día se guarda la diferencia entre el sobre y lo gastado, que puede ser
positiva o negativa, y **queda anotado**: es el registro de cómo vino cada día.

`closeDays()` corre al abrir la app y al volver a ella (`visibilitychange`), y cierra
todos los días del período que hayan quedado abiertos, incluidos los huecos del medio.
**No hay proceso a medianoche** ni timer: la app no está corriendo cuando pasa la
medianoche. El día de hoy nunca se cierra.

De cada día se guarda sólo `{date, envelope}`. El sobre es lo único irrecuperable después
— el diario calculado se mueve con cada gasto —, mientras que lo gastado se lee de
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

La lista vive en `Resumen`, siempre desplegada y sin resumen escrito arriba: cada fila
dice el día, si sobró o se pasó, la diferencia y —en una segunda línea, entera, sin
cortarse contra el ancho— cuánto se gastó de cuánto. Con eso alcanza; el párrafo que
explicaba el mecanismo se fue.

`dailyMode` puede ser `'auto'`, `'manual'`, `'sueldo'` o `'none'`. En manual aparece la etiqueta ocre
"a mano" al lado de "Queda hoy", y "saldo" cuando rige la plata cargada a mano: nunca hay
que dejar ambiguo de dónde sale el monto, pero tampoco hay que tratarlo como un estado a
medio configurar. Cuando no hay con qué calcular
(sin período, período vencido, sin ingresos) el diario **no** se inventa: se muestra "—" y
una línea corta de qué falta, de una oración, nunca instrucciones.

## El modo sueldo: de cobro a cobro

`dailyMode: 'sueldo'` es para quien cobra un sueldo fijo el mismo día de cada mes. **El
"mes" de la app no es el del calendario**: va del día en que se cobra al día anterior al
próximo cobro. El usuario dice el día (el 28) y el ciclo va del 28 de un mes al 28 del
siguiente, que no cuenta — la misma regla de fin exclusivo que los tramos.

**Los días los cuenta el calendario, nunca un 30 fijo.** Un ciclo puede tener 28, 29, 30 o
31. Si alguien cobra el 31 y el mes tiene 30, ese mes cobra el 30; en febrero, el 28 o el
29 según el año. `diaDeCobro()` recorta el día siempre desde el número que puso el
usuario, y **nunca encadenando un resultado ya recortado**: partir del 30 que en realidad
era un 31 perdería el 31 para todos los meses siguientes.

**Los ciclos no se guardan: se derivan de la fecha.** No hay filas en el estado, sólo
`salary`. Por eso cambiar el sueldo o el día de cobro recalcula el diario de *todos* los
ciclos y no sólo el actual — no hay ningún número guardado que pueda quedar viejo — y por
eso `state.periods` (los tramos a mano) queda intacto: quien pase a modo sueldo y vuelva
encuentra sus tramos donde los dejó. `currentPeriod()` devuelve un período sintético con
la forma de siempre, así el cierre de días, el acumulado y la tira de la semana funcionan
sin enterarse.

El sobre del ciclo:

```
a repartir = sueldo − ahorro
diarioBase = a repartir ÷ días del ciclo          (el plan, lo que se ve en Ajustes)
diario     = (a repartir − todo lo anotado) ÷ días que faltan   (el número de hoy)
```

El usuario fija **uno** de los dos —cuánto quiere ahorrar o cuánto quiere gastar por día—
y la app calcula el otro; es la misma ecuación despejada para cada lado y vive en un solo
lugar (`planDelCiclo`). Se guarda lo que el usuario escribió (`mode` y `target`), nunca el
número derivado: guardar los dos sería una segunda fuente de verdad.

El ahorro prometido queda **afuera del sobre**, y por eso acá sí se divide por los días
que faltan, igual que en los tramos a mano: gastar de más no puede comerse el ahorro, lo
único que hace es bajar el diario de los días que quedan. La objeción vieja —"un diario
que sube cada día se comería el ahorro"— valía cuando lo anotado no descontaba; ahora que
descuenta, sube sólo si el usuario gastó menos de lo que tenía asignado, que es su plata.

Así la cuenta cierra: gastando el sobre todos los días sale exactamente lo que había para
repartir, y el ahorro queda intacto.

### El ciclo parcial de arranque

Si la app se configura con el ciclo ya empezado (cobra el 28 y hoy es 10), el sueldo
entero no sirve: parte ya se gastó. Sólo para ese primer ciclo se pregunta cuánta plata
tiene ahora y se reparte entre los días que faltan. Desde el ciclo siguiente rige el
sueldo configurado, sin que nadie toque nada.

Queda marcado en los datos como `salary.first`, con el inicio real del ciclo, el fin, el
día en que se configuró (`from`) y el saldo. **El ciclo parcial arranca en `from`, no en
el día del cobro**: los días de antes no los anotó nadie, así que `closeDays()` no tiene
nada que cerrar ahí y el resumen no lo compara de igual a igual contra un ciclo entero.
En pantalla lo dice la etiqueta chica "parcial", la misma que usa "a mano".

Si se toca "usar el sueldo igual" queda `first` con `amount:0`: el diario es el de un ciclo
normal sobre los días que quedan, pero el ciclo **sigue marcado como parcial**, porque lo
es. `first` deja de regir solo cuando pasa el próximo cobro; no se borra, queda de registro.

## La plata que hay ahora

Faltan seis días para cobrar y en el bolsillo quedan 90.000. El diario que sale de repartir
el sueldo desde el arranque del ciclo ya no dice nada: lo que importa es que esos 90.000
lleguen. Para eso, abajo del número grande hay un link chico —**reingresar lo que me
queda**— que abre un panel de un solo campo.

```json
"saldo": { "date": "2026-09-12", "amount": 90000 }
```

Es una **foto**: el día `date` el usuario tenía `amount` para llegar al fin. **No es un
ingreso más que se suma al tramo**: reemplaza de dónde sale el diario desde ese día. La app
no lleva el saldo sola —seguiría sin ser una app de contabilidad—; para actualizarlo se
vuelve a cargar, que es justamente la acción que ofrece el link.

Rige mientras `date` caiga adentro del período que corre. Al pasar el cobro **deja de regir
solo**, sin que nadie lo borre, y el ciclo siguiente vuelve al sueldo: la misma regla que
`first`. Una fecha futura —puede llegar de otro dispositivo en una fusión— todavía no rige.

### Por qué un campo nuevo y no `first`

La cuenta es la misma que la del ciclo parcial de arranque —tanta plata, desde tal día,
repartida entre los días que quedan— y por eso **las dos salen del mismo lugar** en
`cicloCalc()`: `plata` y `repDesde` se calculan una vez y no importa de cuál de los dos
vengan. Lo que no se puede es guardarlo en `first`:

- `first` vive adentro de `salary`, que es `null` en modo `'auto'`. Quedarse sin cobrar
  pasa en los dos modos.
- `first` además **mueve el arranque del ciclo**, y de ahí sale el `periodo.start` que usan
  `closeDays()` y el acumulado. En el arranque eso es correcto: antes no había nada
  anotado. A mitad de camino sería un error — los días ya cerrados del ciclo quedarían
  afuera del período y el resumen empezaría a contar desde hoy.
- `first` significa "este ciclo no vale lo que uno entero". Cargar lo que queda no hace
  parcial al ciclo.

Por eso el saldo **sólo cambia de dónde sale la plata**: `start`, `pasados`, `faltan` y el
cierre de días quedan intactos.

### La cuenta, en cada modo

Cada modo conserva su regla; lo único que se reemplaza es la plata:

- **`'sueldo'` y `'auto'`**: es la misma cuenta de siempre con otra plata de entrada.
  `pool = saldo − todo lo anotado desde la fecha del saldo`, dividido por los días que
  faltan. Lo anotado **antes** de esa fecha no cuenta: esa plata ya había salido del
  bolsillo cuando el usuario sacó la foto. En modo sueldo el ahorro prometido no aplica
  mientras rige el saldo — lo que hay es lo que hay —, y el ingreso del tramo queda
  guardado y sin tocar. Con un saldo cargado hay diario **aunque nunca haya cargado los
  ingresos**: dijo cuánta plata tiene, que es más concreto que lo que esperaba cobrar.
- **`'manual'` y `'none'`**: el link no aparece. A mano el número lo fija el usuario y sin
  límite no hay diario que reemplazar.

### El panel

Un solo campo y el efecto a la vista: mientras se escribe, la línea de abajo dice
`$ 9.000 por día · 9 días hasta el 28/8`. Ese número **sale de la cuenta de verdad** —se
prueba el saldo en el estado y se le pregunta el diario a `dailyInfo()`, sin guardar nada—,
nunca de una fórmula repetida en el panel, que sería una copia que queda vieja.

**Sumar plata que entró después (una changa) es la misma acción y el mismo campo.** Al
abrir el panel con un saldo vigente, el campo llega con lo que la app calcula que quedó
—el saldo menos todo lo anotado desde entonces, hoy incluido— y una
línea que lo dice: "Cargaste $90.000 el 12/9 y desde entonces anotaste $34.000. Si entró
plata extra, sumala." El usuario le suma los 20.000 y guarda. Un segundo modo "sumar" sería
otro camino para el mismo número, y le pediría a la app que lleve un saldo vivo que no
lleva.

Guardar con el campo vacío no hace nada: no borra lo que ya había. Para volver al cálculo
de siempre está el botón que borra la foto — no queda de registro, porque no hay nada que
registrar: es un número que dictó el usuario, no algo que pasó.

Al tocar el número, la cuenta lo explica entero: de dónde salió la plata, con qué fecha se
cargó y que cuando cobre vuelve solo. El número tiene que poder auditarse desde la app.

## Llegaste a $0

Es el **único popup además del de primer uso**, y está por la única razón que lo justifica:
cuando lo anotado se comió todo lo que había para repartir y todavía faltan días, el número
que la app existe para mostrar dejó de existir. No hay pantalla que dibujar detrás.

> Llegaste a $0
> Se acabó lo que tenías anotado para llegar al 7/9. ¿Cuánta plata te queda?

Un solo campo, el efecto a la vista mientras se escribe, y **"ahora no" siempre a mano**:
nunca bloquea la app. Lo que se guarda al confirmar es **el saldo de siempre**
(`state.saldo`), así que no hay ningún mecanismo nuevo: el diario recalcula desde hoy hasta
el próximo cobro con la cuenta de "La plata que hay ahora". Es la misma acción que el link
de abajo del número, ofrecida en el momento en que hace falta.

Ocultarlo lo corre **un día**, no lo apaga: `state.cero` guarda la fecha en que se ocultó y
mañana vuelve, porque el número sigue en cero. En `'manual'` y `'none'` no aparece nunca —
no hay pool que se pueda acabar.

Que este cartel exista no reabre la puerta a los popups. El aviso de exportar sigue siendo
un bloque en la pantalla y no un cartel, porque ahí la app **interrumpe para sugerir**;
acá interrumpe porque no puede seguir.

## El modo sin límite

`dailyMode: 'none'` es un modo real, no una variante cosmética: hay gente que quiere
anotar en qué se le va la plata y nada más. Con él activo el número grande deja de ser lo
que queda y pasa a ser **lo gastado hoy**, y desaparecen el sobre diario, la barra de
proporción, la cuenta que se abre al tocar el número, la tira semanal, el sobrante del
período y los tramos con sus ingresos, que no se piden ni se muestran.

Ahí "gastado hoy" es lo mismo que en todos lados: **todo lo anotado hoy** (`totalOn`). Ya
no existe un `spentOn` que mire sólo `diario` — hay un solo sobre y de ahí sale cada cosa.
Las categorías siguen existiendo y siguen separando los totales del mes, que es donde ganan
algo.

`dailyInfo()` devuelve `ready:false` en este modo, así que `closeDays()` no cierra ni un
día: sin sobre conocido no hay diferencia que anotar. Todo lo demás —las tres categorías,
los totales del mes, el historial, editar, borrar, la sincronización— funciona igual, y
desde Ajustes se pasa a cualquiera de los otros dos modos sin perder un gasto.

## El primer uso

Al abrir la app por primera vez, un popup pregunta cuánto se puede gastar. Es **un solo
campo grande que cambia de rol**, no tres opciones que abren pantallas: arriba el campo,
abajo una línea corta que dice qué se está pidiendo, más abajo las dos alternativas —
"Sin límite" y "Sueldo mensual", chicas y sin caja — y Empezar. Alguien tiene que poder
abrirlo, escribir un número, tocar Empezar y no haber leído nada.

El campo arranca pidiendo el **límite diario**, que es lo que quiere la mayoría, y con eso
solo se puede terminar en dos toques. Con "Sin límite" el campo se desactiva —no se
esconde: así no salta el alto de la tarjeta—. La selección se marca con color y un ✓,
nunca con un borde de tarjeta. Cambiar de rol o de paso **limpia el campo**: lo que estaba
escrito querría decir otra cosa.

"Sueldo del mes" abre los pasos del modo sueldo, siempre en la misma tarjeta y con el
mismo campo grande:

1. **El sueldo**, y abajo una línea con el día de cobro: `cobro el día [28] de cada mes`.
   Un campo chico dentro de una oración, no un formulario.
2. **El camino**: las dos alternativas de abajo pasan a ser "cuánto ahorro" y "cuánto gasto
   por día". El usuario escribe uno y **la línea muestra los dos números mientras escribe**,
   con el derivado en negrita y los días que tiene el ciclo. Nadie elige a ciegas: el
   efecto se ve antes de confirmar. Un número que no entra —un diario que no llega al fin
   del ciclo— dice cuánto falta y no deja confirmar.
3. **La plata que tiene ahora**, sólo si el ciclo ya estaba empezado (ver el ciclo parcial).

Las alternativas siguen siendo interruptores: tocar "Sueldo del mes" marcada vuelve al
límite diario. Desde los pasos 2 y 3 se vuelve con un `volver` chico, la misma clase
`.link` de "otro día". El límite diario fijo termina en `dailyMode:'manual'` y el sueldo en
`dailyMode:'sueldo'`.

El popup es el único lugar de la app donde hay un `.focus()` programático — uno solo,
`enfocarOnb()`, que se llama también al cambiar de paso — y va detrás de
`(hover: hover) and (pointer: fine)`. En una pantalla con mouse es lo que se quiere; en
iOS el foco sin gesto no levanta el teclado y deja el campo activo de mentira, que es la
trampa de siempre. Agregar el foco sin esa guarda es reintroducirla.

Aparece **una sola vez**: `estreno` pide que no haya nada en `localStorage` **ni** un Gist
configurado —un dispositivo con token es el segundo aparato de alguien que ya usa la app,
no un estreno— y al confirmar queda `setup:true`, que no se vuelve a bajar nunca, ni
siquiera con "Borrar todo". En la fusión `setup` no se pisa: si de algún lado ya está en
true, queda en true.

**Una instalación nueva arranca vacía.** Los gastos de ejemplo que había cableados en
`seed()` se fueron: le aparecían como propios a cualquiera que abriera la app.

Las tres categorías **no cambian la cuenta**: las tres descuentan del mismo sobre, y están
para poder mirar después en qué se fue la plata. Adentro del código se llaman como siempre;
en pantalla van con el nombre de la derecha, que se entiende sin saber cómo está hecha la
app:

- `diario` → **"Del día"**. Café, kiosco, almuerzo.
- `transporte` → **"Transporte"**. Los viajes. **No tiene presupuesto propio**: se anota y
  descuenta como todo lo demás.
- `unico` → **"Aparte"**. Compras puntuales, que pueden ser mucho más grandes que un día —
  un cargador, unas zapatillas, una compu pagada con ahorros.

Que ninguna tenga trato especial es una decisión, y costó tres vueltas llegar a ella:

- **Hubo un presupuesto de transporte** (`period.transport`, `salary.transport`) que se
  descontaba por adelantado y hacía que anotar un viaje no moviera el diario. Se fue en el
  schema 9: era un número que el usuario declaraba y que casi nunca coincidía con lo que
  gastaba de verdad.
- **Hubo una cuarta categoría, `ahorro`**, para la compra grande pagada con ahorros. Duró
  una versión. El nombre daba a entender lo contrario de lo que hacía —"Ahorros" al lado de
  gastos se lee como plata que entra— y `up8to9` la devuelve a `unico`.

Lo que resolvía la categoría `ahorro` —que una compu de 1.000.000 contra un sueldo de
850.000 deje el diario en cero y la app deje de servir— hoy lo resuelve el cartel de
**"Llegaste a $0"**: en vez de esconder el gasto para que la cuenta cierre, la app admite
que no cierra y pregunta cuánta plata hay de verdad. Es la misma idea de siempre, la verdad
por encima de lo declarado, aplicada donde corresponde.

El mismo criterio vale para el resto de los rótulos: "sobrante del período", "sobres
diarios", "sale de", "únicos" son términos internos. En Ajustes, el período se llama
**tramo** ("de un cobro al otro") y los ingresos, **lo que cobrás en este tramo**.

## Importar por voz vive en `Resumen`

Un atajo de iOS escribe una línea por gasto dictado en un `.txt` y la app lo lee
(`leerDictado()`, la marca de tiempo hace de `id`, ver los comentarios del código). El
botón y el panel de confirmación viven **en `Resumen`, junto a exportar y respaldo**, no
en la pantalla principal: no se usa todos los días y en el formulario de anotar competía
por atención con el único botón que importa ahí, que es Anotar. Traerlo de vuelta al lado
del monto es deshacer eso; la funcionalidad, en cambio, se queda.

## Exportar

Exportar no está escondido en Ajustes: abajo del formulario hay un botón fijo, **Exportar
gastos**, que ve cualquiera desde el primer día. Es lo único que se le suma a las tres
cosas de la pantalla principal, y va abajo del formulario justamente por eso: anotar un
gasto sigue siendo lo primero que se puede hacer al abrir.

Ese botón y el aviso del mes son **un solo bloque**, no dos cosas pegadas. Sin aviso es la
fila del botón y nada más (la clase `.plain` le saca la caja); cuando el aviso corresponde,
el mismo bloque crece con el título, la línea y el atajo para copiar el texto. Los tres
botones que bajan el CSV —el fijo, el del aviso y el de Ajustes— pasan por `flujoExportar()`,
que avisa si hace falta, baja el archivo y deja la tarjeta del texto para la IA al lado del
botón que se tocó.

El archivo lleva la fecha del día en que se bajó: `sobres-2026-08-19.csv`. Con un nombre
fijo cada exportación pisaba a la anterior en la carpeta de descargas.

### Lo que se avisa antes de bajar el archivo

Es **sugerencia y nunca permiso**: los dos avisos traen "Exportar igual", los dos se
cierran sin exportar y exportar no se bloquea jamás.

- **Menos de 10 días con gastos**: con tan poco el análisis no sirve, mejor esperar a
  tener unos 10. El número es el real y concuerda en singular ("con 1 día").
- **10 o más, pero todavía no cerró un ciclo de cobro**: ya se puede, pero un ciclo entero
  da un análisis mucho más certero.
- **Ciclo cerrado**: sin aviso, baja derecho.

Los días son los que tienen **al menos un gasto anotado** (`diasConGastos()`), nunca los
días desde que se instaló la app: quien la abrió hace tres semanas y anotó cuatro gastos
tiene cuatro días de datos, no veintiuno.

El ciclo que se mira es el que contiene el **primer gasto** (`cicloCerrado()`): si hoy ya
pasó su fin, adentro de los datos hay un ciclo entero de punta a punta. Mirar el ciclo en
curso sería avisarle para siempre a alguien que hace tres meses usa la app, porque siempre
está a mitad de uno. En modo `'manual'` y `'none'` no hay ciclo de cobro que esperar, así
que ese aviso no aparece.

### El aviso del mes

Al mes del primer gasto anotado, y después una vez por mes, el bloque crece con un aviso
—**nunca un popup**— que ofrece bajar el CSV y copiar el texto que se le pega a una IA
junto con el archivo. Es lo único que la app dice sin que se le pregunte.

Ocultarlo lo corre un mes, no lo apaga: `nudged` guarda la fecha en que se ocultó y el mes
siguiente se cuenta desde ahí. Ocultarlo no se lleva el botón de exportar, que es fijo.
Sin gastos anotados no aparece nunca, porque no hay nada que analizar. El texto que se
copia es literal y está en `PROMPT_IA`: si se toca, se toca entero y a propósito. Ahí se le
explican las tres categorías, y en particular que un `unico` grande —una compra pagada con
ahorros— hay que mirarlo aparte: sin esa línea le arruina el promedio por día a la IA.

## Claro y oscuro

Dos temas. El claro es el de siempre; el oscuro arranca del **fondo del ícono**
(`#242424`), para que la app y el ícono anclado a la pantalla de inicio sean del mismo
color. Los acentos se aclaran en oscuro — el violeta `#4B2FA0` sobre `#242424` no se lee —
y por eso existe `--on-accent`: arriba de un botón lleno, el texto es blanco en claro y
casi negro en oscuro.

**Todo color vive en `:root`.** Un `rgba()` suelto en una regla no cambia con el tema y
desaparece contra el fondo oscuro; por eso los fondos tenues de las etiquetas, los avisos
y las categorías son variables (`--violet-soft`, `--teal-line`, `--ochre-ghost`, …) y no
literales. Las tres reglas de la paleta tienen que decir lo mismo: `:root` es el tema
claro, el bloque de `@media (prefers-color-scheme:dark)` es "el dispositivo está en oscuro
y el usuario no pidió claro", y `:root[data-theme="oscuro"]` es la elección a mano. Al
tocar una de las dos que definen el oscuro, se tocan las dos.

El tema se elige en Ajustes, con tres botones: **Automático, Claro y Oscuro**. Automático
es el que viene, y no escribe nada en el `<html>`: así el media query del CSS hace el
trabajo solo — incluso antes de que corra el JS — y el tema sigue al dispositivo cuando
cambia al atardecer, sin recargar.

**El tema es de este dispositivo, no del usuario.** Vive en su propia clave de
`localStorage` (`sobres.tema`), fuera del estado. Por eso no sube el schema y no se
sincroniza: el celular en oscuro no tiene por qué poner en oscuro la computadora, que es
lo que pasaría si viajara al Gist. Es la misma razón por la que la cola de cambios sin
sincronizar tampoco está en el estado.

La barra de estado del iPhone toma el `theme-color`, así que se mueve con el tema: sin
eso queda un rectángulo claro arriba de la app oscura. Los íconos, en cambio, no cambian:
son `#242424` siempre, que es de donde salió el fondo oscuro.

## Restricciones que no se negocian

**Un solo archivo.** `index.html` contiene HTML, CSS y JS. Sin build, sin bundler, sin
dependencias instalables. Se edita, se sube al repo y ya está en producción. Cualquier
propuesta que requiera `npm install` rompe el punto del proyecto.

Adentro del archivo hay **dos** bloques `<script>`, y el chico que está en el `<head>` no
es un descuido: aplica el tema elegido a mano antes del primer pintado. Bajado al final
del body, alguien con el tema oscuro fijado vería un flash claro cada vez que abre la app.
No es una puerta a repartir el JS en bloques: lo que no tenga que correr antes de pintar
va abajo, con todo lo demás.

La única excepción de archivo es `sw.js`, y es forzada: un service worker no se puede
registrar desde un script embebido. Está en la misma categoría que `manifest.json` y los íconos —
archivos sueltos en la raíz que el navegador exige separados —, no es una puerta abierta
a partir el JS de la app en módulos.

`estilos/` tampoco la abre: son copias enteras de la app congeladas por su aspecto, para
poder retomar un diseño más adelante (ver `estilos/LEEME.md`). No se cargan, no se
importan y no se linkean desde la app; para el navegador no existen. Un archivo ahí es un
archivo muerto: los arreglos van a `index.html` y sólo a `index.html`. Si alguna vez uno
de esos estilos vuelve, vuelve reemplazando la raíz, no conviviendo con ella.

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

El estado que se persiste (schema 6):

```json
{ "schema": 9, "daily": 10000, "dailyMode": "auto", "weekStart": 1,
  "setup": true, "nudged": "", "cero": "",
  "saldo": { "date": "2026-09-12", "amount": 90000 },
  "salary": { "amount": 950000, "payday": 28, "mode": "ahorro", "target": 350000,
              "first": { "start": "2026-08-28", "end": "2026-09-28",
                         "from": "2026-09-10", "amount": 240000 } },
  "periods": [ { "id": 1, "start": "2026-08-05", "end": "2026-09-05",
                 "incomes": [ { "id": 1, "date": "2026-08-05", "amount": 900000, "note": "sueldo" } ] } ],
  "closed": [ { "date": "2026-08-05", "envelope": 25870 } ],
  "deleted": [], "updatedAt": 0,
  "items": [ { "id": 1, "date": "2026-08-05", "amount": 3100, "cat": "diario",
               "note": "café", "updatedAt": 1754500000000 } ] }
```

`updatedAt` aparece dos veces y son cosas distintas: el de arriba es del estado y decide
la configuración; el de cada item decide ese gasto.

La fusión entre dispositivos (`merge()`) sigue tres reglas, y están así a propósito:

1. Los `items` se unen por `id`, así que gastos cargados en dos dispositivos sin conexión
   entre medio conviven en vez de pisarse. Cuando el mismo gasto existe de los dos lados,
   gana el de `updatedAt` más alto: el que se editó último. Un empate — los dos en cero,
   o sea nunca editados — se queda con el de este dispositivo.
2. Los borrados se registran como lápidas en `deleted`. Sin eso, un gasto borrado en el
   celular revive en la próxima sincronización desde la computadora.
3. La configuración (`daily`, `dailyMode`, `weekStart`, `periods`, `salary`, `saldo`) sí es
   último-en-escribir-gana, según `updatedAt`. `periods` y `salary` van enteros, no
   fusionados campo a campo: un período o un sueldo medio mezclado entre dos dispositivos
   daría un diario que no es el de ninguno de los dos.

   `salary` y `saldo` son los dos campos de ese grupo que pueden valer `null`, así que van
   **sin `??`**: con el operador, un dispositivo que escribió último y no usa el modo
   sueldo no podría apagarlo y quedaría pegado un sueldo viejo que ya nadie eligió; con el
   saldo pasaría lo mismo al volver al cálculo de siempre.

Los `closed` se unen por `date`, como los items: dos dispositivos sin conexión entre
medio cerraron días distintos y los dos valen.

`setup`, `nudged` y `cero` quedan afuera de la regla 3 a propósito. `setup` es un o lógico: si en
algún dispositivo ya se eligió cómo usar la app, se eligió, y el popup de primer uso no
tiene por qué volver a aparecer en el otro. `nudged` y `cero` se quedan con la fecha más nueva, para
que ni el aviso de exportar ni el cartel de "llegaste a $0" reaparezcan en el aparato donde
ya se ocultaron.

`save()` acepta `save(false)` para persistir sin marcar tiempo ni disparar un push. Se usa
después de traer datos remotos, para no rebotar el cambio de vuelta al Gist.

## Editar y borrar

Tocar un gasto de cualquiera de las dos listas lo abre para editar **en el formulario de
Hoy**, que se reusa en vez de duplicar los campos. Si se tocó desde el historial, la app
cambia sola a `Hoy`, que es donde está el formulario. Se marca en violeta, el botón pasa
a "Guardar cambios" y aparece Cancelar: nunca hay que dudar entre anotar y editar. Si el
gasto es de otro día, la fecha se muestra sola. Se hace `scrollIntoView`, nunca
`.focus()` — ver las trampas de iOS.

Al editar se sube el **`updatedAt` del item**, no el del estado. La fusión resuelve cada
gasto por su propio `updatedAt`: el que se editó último gana. Sin eso, editar un monto en
el celular y sincronizar desde la computadora devolvía el valor viejo.

El borrado tiene **ocho segundos de gracia**. Se aplica al estado y se persiste, pero no
se sube hasta que la ventana se cierra: `borrarItem()` guarda con `save(false)` y recién
`cerrarUndo(true)` llama a `save()`. Eso es lo que hace que deshacer sea posible — si el
borrado ya hubiera viajado al Gist, la lápida volvería en la próxima fusión y mataría al
gasto otra vez. Deshacer además saca el id de `deleted`, por lo mismo.

Borrar un segundo gasto confirma el primero: hay una sola ventana abierta por vez.

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

`up8to9` es el escalón que saca cosas en vez de agregarlas: se va el presupuesto de
transporte (`normalize()` deja de reconstruir `transport`, y con eso desaparece de los
tramos y del sueldo) y la categoría `ahorro` vuelve a `unico`. Reclasificar acá **sí**
corresponde, a diferencia de `up7to8`: el destino es uno solo y no hay nada que adivinar.
Lo anotado en transporte queda donde está — son gastos de verdad y siguen contando.

`up7to8` no toca un solo gasto: la categoría `ahorro` es nueva, pero cuál de los que ya
están anotados salió de ahorros no se puede deducir. El escalón existe igual porque un
valor nuevo en `cat` obliga a subir el schema — el `normalize()` viejo colapsaría `ahorro`
a `diario`, y ahí el gasto pasaría a **comerse el sobre del día** en vez de no tocar nada.
Bloquear la versión vieja es mejor que eso.

`up6to7` deja `saldo` en `null`: cuánta plata tiene el usuario en el bolsillo no se deduce
de los gastos, y hasta que lo diga él el diario sigue saliendo de donde salía. `saldo` es
un campo nuevo, y eso solo ya obliga a subir el schema — el `normalize()` viejo lo borraría
y después lo subiría así al Gist.

`up5to6` deja `salary` en `null`: el sueldo no se puede adivinar de los gastos y el modo
que el usuario venía usando no se toca, así que quien tenía un diario fijo sigue igual
hasta que entre a Ajustes y lo cambie él. `dailyMode:'sueldo'` es, otra vez, un valor
nuevo en un campo que ya existía, y por sí solo ya obligaba a subir el schema: el
`normalize()` viejo lo colapsaba a `'manual'`.

`up1to2` no inventa ingresos, porque en los datos viejos no hay: arma el período con lo
que sí hay — el rango que cubren los gastos y lo gastado en transporte — y deja el diario
en `manual` con el valor que ya tenía, así el número no cambia solo debajo de los pies
del usuario. `up2to3` arranca `closed` vacío y deja que `closeDays()` complete los días
ya pasados en el primer arranque. `up3to4` pone el `updatedAt` de cada gasto en cero:
inventarle una fecha de edición a un gasto viejo sería darle la última palabra en una
fusión. `up4to5` marca `setup:true` y deja `nudged` vacío: que existan estos datos quiere
decir que alguien ya venía usando la app, así que el popup de primer uso no le va, y el
aviso de exportar le cae al mes del primer gasto como a cualquiera. El criterio se
mantiene: nunca completar con datos que el usuario no cargó.

**Un campo nuevo obliga a subir el schema**, aunque parezca compatible. `normalize()`
reconstruye el objeto campo por campo, así que una versión vieja de la app que lea datos
nuevos no ignora lo que no conoce: lo borra, y después lo sube así al Gist. Subir el
número hace que esa versión se bloquee en vez de destruir el campo.

**Sacar un campo también obliga a subirlo.** Una versión vieja que lea datos del schema 9
esperaría `transport` y lo daría por cero, que es justo el número que cambia el diario;
bloquearse es mejor. Y al revés: esta versión lee datos viejos, los migra y descarta el
campo a propósito.

**Un valor nuevo en un campo que ya existe cuenta igual.** `dailyMode:'none'` obligó a
subir a 5 aunque el campo estuviera desde el 2, `dailyMode:'sueldo'` a 6 y `cat:'ahorro'`
a 8: el `normalize()` viejo los colapsaba a `'manual'` y a `'diario'`, y le devolvía al
usuario un sobre diario que nunca pidió.

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
  foco pero no levanta el teclado, y deja el campo "activo" de mentira. La única
  excepción es el campo del popup de primer uso, y sólo porque va detrás de
  `(hover: hover) and (pointer: fine)`: en iOS ese `.focus()` no llega a correr.

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

**El número nunca baja, ni siquiera al volver atrás.** La v4.0.0 fue el rediseño oscuro y
la v4.1.0 lo revirtió al estilo de la v3.2.0: la app volvió, el número siguió subiendo.
Bajarlo dejaría a un dispositivo con la versión "más nueva" ya cacheada sin forma de
darse cuenta de que hay algo distinto.

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
