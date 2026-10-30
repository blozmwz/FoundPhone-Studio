// Old published pages have no update listener. On an actual worker upgrade,
// reload their windows once after activation so they cannot remain on old data.
self.addEventListener('install',event=>{
 if(!self.registration.active)return;
 event.waitUntil(caches.open('thursday-update-control').then(cache=>cache.put('upgrade-stage2',new Response('yes'))));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open('thursday-update-control');
  if(!await cache.match('upgrade-stage2'))return;
  await cache.delete('upgrade-stage2');
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  // Do not wait for navigation here: a navigation may wait for activation.
  for(const client of windows){
   if(client.url.startsWith(self.registration.scope))void client.navigate(client.url).catch(()=>{});
  }
 })());
});
