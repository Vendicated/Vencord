/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const HOST_NAME = "dev.vencord.rpc";
const DATABASE_URL = "https://discord.com/api/v9/applications/detectable";
const HEARTBEAT_INTERVAL = 20_000;
const RECONNECT_DELAY = 3_000;

const ports = new Set();

let activePort = null;
let nativePort = null;
let databaseSent = false;
let heartbeat = null;
let reconnectTimer = null;

// A port can disconnect at any time, so ignore errors from postMessage.
function post(port, message) {
    try {
        port?.postMessage(message);
    } catch { }
}

function sendStatus(port, status) {
    post(port, { type: "vencord:rpc-status", status });
}

function postNative(message) {
    post(nativePort, message);
}

function hasReadyPort() {
    return ports.values().some(port => port.ready);
}

async function fetchDatabase(cache = "no-cache") {
    try {
        const response = await fetch(DATABASE_URL, { cache });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.text();
        if (json.length < 1024) throw new Error("Empty detectable database");

        return json;
    } catch (error) {
        if (cache === "reload") throw error;

        // Repair a broken or empty cache entry with a fresh download.
        return fetchDatabase("reload");
    }
}

async function pushDatabase() {
    if (databaseSent || !nativePort) return;

    // Set the flag before the download, so a second call does not start another download.
    databaseSent = true;
    const port = nativePort;

    try {
        const json = await fetchDatabase();
        if (port === nativePort) postNative({ type: "detectable-db", json });
    } catch (error) {
        if (port !== nativePort) return;

        databaseSent = false;
        postNative({ type: "detectable-db", json: null, error: error.message });
    }
}

function disconnectNative() {
    nativePort?.disconnect();
    nativePort = null;
    databaseSent = false;
    clearInterval(heartbeat);
    clearTimeout(reconnectTimer);
}

function connectNative() {
    disconnectNative();

    let port;
    try {
        port = nativePort = chrome.runtime.connectNative(HOST_NAME);
    } catch (error) {
        for (const page of ports) sendStatus(page, { state: "missing", error: String(error) });
        return;
    }

    port.onMessage.addListener(message => {
        if (port !== nativePort) return;

        if (message.type !== "hello") {
            post(activePort, { type: "vencord:rpc", payload: message });
            return;
        }

        clearTimeout(reconnectTimer);
        clearInterval(heartbeat);
        heartbeat = setInterval(() => {
            postNative({ type: "ping" });
            // Call an extension API to keep the service worker alive.
            chrome.runtime.getPlatformInfo(() => void chrome.runtime.lastError);
        }, HEARTBEAT_INTERVAL);

        if (!activePort) return;

        sendStatus(activePort, { state: "connected", version: message.version, gameDetection: message.gameDetection });
        postNative({ type: "ready", gameDetection: activePort.gameDetection });
        if (activePort.gameDetection) void pushDatabase();
    });

    port.onDisconnect.addListener(() => {
        if (port !== nativePort) return;

        const error = chrome.runtime.lastError?.message;
        const missing = /not found|forbidden|not installed|access to the specified/i.test(error ?? "");

        nativePort = null;
        clearInterval(heartbeat);
        for (const page of ports) sendStatus(page, { state: missing ? "missing" : "error", error });

        if (!missing && hasReadyPort()) {
            reconnectTimer = setTimeout(() => hasReadyPort() && connectNative(), RECONNECT_DELAY);
        }
    });
}

function setActive(port) {
    if (activePort !== port) {
        if (activePort) sendStatus(activePort, { state: "inactive" });
        activePort = port;
        if (port) sendStatus(port, { state: "connecting" });
    }

    if (port) connectNative();
    else disconnectNative();
}

function pickNextActive() {
    setActive([...ports].findLast(port => port.ready) ?? null);
}

chrome.runtime.onConnect.addListener(port => {
    const hostname = URL.parse(port.sender?.origin ?? "")?.hostname ?? "";
    const fromDiscord = hostname === "discord.com" || hostname.endsWith(".discord.com");

    if (port.name !== "vencord:rpc" || port.sender?.id !== chrome.runtime.id || !fromDiscord) {
        port.disconnect();
        return;
    }

    ports.add(port);
    sendStatus(port, { state: "disconnected" });

    port.onMessage.addListener(message => {
        const payload = message?.type === "vencord:rpc" ? message.payload : null;

        switch (payload?.type) {
            case "ready":
                port.ready = true;
                port.gameDetection = payload.gameDetection;
                setActive(port);
                break;

            case "stop":
                port.ready = false;
                if (activePort === port) pickNextActive();
                break;

            case "rpc-send":
            case "rpc-close":
                if (port === activePort) postNative(payload);
                break;

            case "configure":
                port.gameDetection = payload.gameDetection;
                if (port !== activePort) break;

                postNative(payload);
                if (port.gameDetection) void pushDatabase();
                break;

            case "focus": {
                const { tab } = port.sender;
                if (!tab) break;

                chrome.tabs.update(tab.id, { active: true });
                chrome.windows.update(tab.windowId, { focused: true });
                break;
            }
        }
    });

    port.onDisconnect.addListener(() => {
        ports.delete(port);

        if (activePort === port) {
            activePort = null;
            pickNextActive();
        } else if (!hasReadyPort()) {
            disconnectNative();
        }
    });
});

chrome.commands.onCommand.addListener(async command => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { command });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openShortcuts") {
        chrome.tabs.create({ url: "about://extensions/shortcuts" });
    }
});
