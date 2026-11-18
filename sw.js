// Public shell only. Private itinerary values belong exclusively in IndexedDB.
let shellOffline=false;
self.addEventListener('message',event=>{if(event.data?.type==='shell-status')event.source?.postMessage({type:'shell-status',offline:shellOffline});});
const CACHE='itinerary-shell-2026111907';
const ASSETS=['./','index.html','style.css?v=2026111907','app.js?v=2026111907','model.js?v=2026111907','config.js?v=2026111907','details.js?v=2026111907','weather.js?v=2026111907','offline.js?v=2026111907','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png'];
const NAMES=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('itinerary-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Never intercept/cache Google authorization, Sheet API requests or private fixture JSON.
 if(request.method!=='GET'||url.origin!==self.location.origin||!NAMES.has(url.pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(request);shellOffline=false;if(response.ok)await cache.put(request,response.clone()).catch(()=>{});return response;}catch{const saved=await cache.match(request,{ignoreSearch:true});if(saved){shellOffline=true;for(const client of await self.clients.matchAll())client.postMessage({type:'shell-offline'});return saved;}throw new Error('Offline shell asset unavailable');}})());
});
