/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

if (typeof browser === "undefined") {
    var browser = chrome;
}

// can't trigger for sub-frames like popout windows etc
if (window === window.top) {
    let port = null;
    let ready = false;
    let gameDetection = true;
    let reconnectTimer = null;

    function postStatus (status) {
        postMessage({ type: "vencord:rpc", direction: "status", status });
    }

    function scheduleReconnect () {
        if (!ready) return;

        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => ready && connectPort(), 1000);
    }

    function fail (error) {
        port = null;
        postStatus({ state: "error", error: String(error) });
        scheduleReconnect();
    }

    function connectPort () {
        if (port) return port;

        try {
            port = browser.runtime.connect({ name: "vencord:rpc" });

            port.onMessage.addListener(message => {
                if (message?.type === "vencord:rpc") {
                    postMessage({ type: "vencord:rpc", direction: "in", payload: message.payload });
                } else if (message?.type === "vencord:rpc-status") {
                    postStatus(message.status);
                }
            });

            port.onDisconnect.addListener(() => {
                port = null;
                postStatus({ state: "disconnected" });
                scheduleReconnect();
            });

            if (ready) port.postMessage({ type: "vencord:rpc", payload: { type: "ready", gameDetection } });
            return port;
        } catch (error) {
            fail(error);
            return null;
        }
    }

    function send (payload) {
        try {
            connectPort()?.postMessage({ type: "vencord:rpc", payload });
        } catch (error) {
            fail(error);
        }
    }

    window.addEventListener("message", ({ source, data }) => {
        if (source !== window || data?.type !== "vencord:rpc" || data.direction !== "out") return;

        const { payload } = data;
        if (typeof payload?.type !== "string") return;

        switch (payload.type) {
            case "ready":
                ready = true;
                gameDetection = payload.gameDetection !== false;
                connectPort();
                break;
            case "configure":
                gameDetection = payload.gameDetection !== false;
                send(payload);
                break;
            case "stop":
                ready = false;
                clearTimeout(reconnectTimer);
                send(payload);
                port?.disconnect();
                port = null;
                break;
            default:
                if (ready) send(payload);
        }
    });
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        postMessage({
            type: "vencord:meta",
            meta: {
                EXTENSION_VERSION: browser.runtime.getManifest().version,
                EXTENSION_BASE_URL: browser.runtime.getURL(""),
                RENDERER_CSS_URL: browser.runtime.getURL("dist/Vencord.css"),
            }
        });

        chrome.runtime.onMessage.addListener(request => {
            postMessage({ type: "vencord:keybinds", meta: request.command });
        });

        window.addEventListener("message", function (event) {
            if (event.source !== window) return;

            if (event.data.type === "OPEN_SHORTCUTS") {
                chrome.runtime.sendMessage({ action: "openShortcuts" });
            }
        }, false);
    },
    { once: true }
);
