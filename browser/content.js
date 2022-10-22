if (typeof browser === "undefined") {
    var browser = chrome;
}

var script = document.createElement("script");
script.src = browser.runtime.getURL("dist/Vencord.js");
// documentElement because we load before body/head are ready
document.documentElement.appendChild(script);
