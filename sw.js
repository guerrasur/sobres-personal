/* Service worker de Sobres.
   El punto es abrir y anotar un gasto en el subte, sin señal.

   VERSION se sube junto con la versión de la app en index.html. Cambiar este
   archivo es lo que hace que el navegador detecte que hay algo nuevo: si el
   contenido no cambia ni un byte, no hay actualización que ofrecer. */
const VERSION = 'v6.5.0';
const CACHE = 'sobres-' + VERSION;

/* Todo lo que la app necesita para arrancar sin red. Son rutas relativas para
   que ande igual en usuario.github.io/sobres-personal/ que en la raíz. */
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './favicon-64.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  /* Sin skipWaiting: el que decide cuándo se actualiza es el usuario, con el
     aviso de la app. Recargar de golpe abajo de alguien que está anotando un
     gasto es peor que esperar. */
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    /* cache:'reload' — sin esto el worker nuevo se llena desde el caché HTTP
       del navegador y puede guardar el index.html viejo: la actualización se
       instalaría sin traer nada nuevo. */
    await Promise.all(ASSETS.map(async u => {
      try{
        const r = await fetch(u, { cache:'reload' });
        if(r && r.ok) await c.put(u, r);
      }catch(err){}
    }));
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('sobres-') && n !== CACHE)
                           .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* La app avisa cuando el usuario tocó "Actualizar". */
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* Cache-first para los estáticos propios. Nada de api.github.com ni de otros
   orígenes: la sincronización tiene que fallar de verdad cuando no hay red,
   para que la cola y los reintentos hagan su trabajo. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch:true });
    if(hit) return hit;
    try{
      const res = await fetch(req);
      if(res && res.ok && res.type === 'basic'){
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    }catch(err){
      /* Sin red y sin copia: si es una navegación, al menos entregar la app. */
      if(req.mode === 'navigate'){
        const shell = await caches.match('./index.html') || await caches.match('./');
        if(shell) return shell;
      }
      throw err;
    }
  })());
});
