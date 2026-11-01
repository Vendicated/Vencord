if (typeof browser === "undefined") {
    var browser = chrome;
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        window.postMessage({
            type: "claudecord:meta",
            meta: {
                EXTENSION_VERSION: browser.runtime.getManifest().version,
                EXTENSION_BASE_URL: browser.runtime.getURL(""),
                RENDERER_CSS_URL: browser.runtime.getURL("dist/Claudecord.css"),
            }
        });

        chrome.runtime.onMessage.addListener(request => {
            window.postMessage({ type: "claudecord:keybinds", meta: request.command });
        })

        window.addEventListener('message', function(event) {
            if (event.source !== window) return;

            if (event.data.type === 'OPEN_SHORTCUTS') {
            chrome.runtime.sendMessage({ action: "openShortcuts" });
            }
        }, false);
    },
    { once: true }
);
