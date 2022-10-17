if (typeof browser === "undefined") {
    var browser = chrome;
}

browser.webRequest.onHeadersReceived.addListener(({ responseHeaders, url }) => {
    const cspIdx = responseHeaders.findIndex(h => h.name === "content-security-policy");
    if (cspIdx !== -1)
        responseHeaders.splice(cspIdx, 1);

    if (url.endsWith(".css")) {
        const contentType = responseHeaders.find(h => h.name === "content-type");
        if (contentType)
            contentType.value = "text/css";
        else
            responseHeaders.push({
                name: "content-type",
                value: "text/json"
            });
    }

    return {
        responseHeaders
    };
}, { urls: ["*://*.discord.com/*"] }, ["blocking", "responseHeaders"]);
