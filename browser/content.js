// This is just the bootstrap script

if (typeof browser === "undefined") {
    var browser = chrome;
}

var script = document.createElement("script");
script.src = browser.runtime.getURL("dist/Bencord.js");
// documentElement because we load before body/head are ready
document.documentElement.appendChild(script);
