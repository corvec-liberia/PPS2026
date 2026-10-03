'use strict';
const CACHE='pps-liberia-shell-v5';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg'];
const ASSET_URLS=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('pps-liberia-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    if(url.pathname!==new URL('./',self.registration.scope).pathname&&url.pathname!==new URL('./index.html',self.registration.scope).pathname)return;
    event.respondWith(fetch(request).catch(()=>caches.match(new URL('./index.html',self.registration.scope).href)));
    return;
  }
  if(!ASSET_URLS.has(url.href))return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&response.type==='basic'){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));
    }
    return response;
  }).catch(()=>caches.match(request)));
});
