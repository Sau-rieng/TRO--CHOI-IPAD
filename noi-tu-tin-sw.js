/* Service worker của app "Nói Tự Tin". Chỉ xử lý file của app này, bỏ qua mọi game khác trong repo. */
const CACHE='noi-tu-tin-v1';
const OWN=['ANHVAN-NOI-TU-TIN.html','noi-tu-tin.webmanifest','noi-tu-tin-192.png','noi-tu-tin-512.png'];
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const name=new URL(req.url).pathname.split('/').pop();
  if(OWN.indexOf(name)<0) return;
  e.respondWith(
    fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match(req))
  );
});
