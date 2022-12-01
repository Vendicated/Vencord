
function setContentTypeOnStylesheets(details) {
    if (details.type === 'stylesheet') {
        details.responseHeaders.push({name: 'Content-Type', value: 'text/css'})
    }
    return {responseHeaders: details.responseHeaders }
}

var cspHeaders = [
    'content-security-policy',
    'content-security-policy-report-only',
]

function removeCSPHeaders(details) {
    return {responseHeaders: details.responseHeaders.filter(header =>
        !cspHeaders.includes(header.name.toLowerCase()))}
}




browser.webRequest.onHeadersReceived.addListener(
    setContentTypeOnStylesheets, {urls: ["https://raw.githubusercontent.com/*"]}, ['blocking'] 
)

browser.webRequest.onHeadersReceived.addListener(
    removeCSPHeaders, {urls: ["https://raw.githubusercontent.com/*", "*://*.discord.com/*"]}, ['blocking', 'responseHeaders']
)
