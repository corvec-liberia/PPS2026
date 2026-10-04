'use strict';
const CACHE='pps-liberia-pwa-v10';
const SHELL=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg','./icon-maskable.svg'];
const PATHS=new Set(SHELL.map(p=>new URL(p,self.registration.scope).pathname));
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pps-liberia-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('./index.html',copy)));}return res;}).catch(()=>caches.match('./index.html')));
  return;
 }
 if(!PATHS.has(url.pathname))return;
 event.respondWith(fetch(req).then(res=>{if(res.ok&&res.type==='basic'){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));}return res;}).catch(()=>caches.match(req,{ignoreSearch:true})));
});
