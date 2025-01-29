if (typeof browser === "undefined") {
    var browser = chrome;
}

const style = document.createElement("link");
style.type = "text/css";
style.rel = "stylesheet";
style.href = browser.runtime.getURL("dist/Vencord.css");

document.addEventListener(
    "DOMContentLoaded",
    () => {
        document.documentElement.append(style);
        window.postMessage({
            type: "vencord:meta",
            meta: {
                EXTENSION_VERSION: browser.runtime.getManifest().version,
                EXTENSION_BASE_URL: browser.runtime.getURL(""),
            }
        });
        chrome.runtime.onMessage.addListener(request => {
            window.postMessage({ type: "vencord:keybinds", meta: request.command });  
        })
    },
    { once: true }
);
