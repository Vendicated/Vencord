/* eslint-disable no-console */

const { GlobalKeyboardListener } = require("node-global-key-listener");
const { WebSocketServer } = require("ws");

const PORT = 6969;
const pressedKeys = new Set();
const ToggleBindings = new Map([
    ["INSERT", "TOGGLE_MUTE"],
    ["NUMPAD0", "TOGGLE_MUTE"],
    ["VK_INSERT", "TOGGLE_MUTE"],
    ["VK_NUMPAD0", "TOGGLE_MUTE"],
    ["HOME", "TOGGLE_DEAFEN"],
    ["NUMPAD7", "TOGGLE_DEAFEN"],
    ["VK_HOME", "TOGGLE_DEAFEN"],
    ["VK_NUMPAD7", "TOGGLE_DEAFEN"]
]);

const wss = new WebSocketServer({ host: "127.0.0.1", port: PORT });
const keyboard = new GlobalKeyboardListener({
    windows: {
        onError: errorCode => console.error("Companion bridge keyboard error:", errorCode),
        onInfo: info => console.info("Companion bridge keyboard info:", info)
    }
});

function broadcast(action) {
    const payload = JSON.stringify({ action });
    console.log(`Companion bridge broadcasting ${action} to ${wss.clients.size} client(s).`);

    for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
            client.send(payload);
        }
    }
}

function getBindingKeys(event) {
    return [
        event.name,
        event.rawKey?._nameRaw
    ].filter(Boolean);
}

function resolveAction(event) {
    for (const key of getBindingKeys(event)) {
        const action = ToggleBindings.get(key);
        if (action) return action;
    }

    return null;
}

function handleKeyDown(event) {
    const bindingKeys = getBindingKeys(event);
    const pressedKey = bindingKeys[0] ?? String(event.vKey);

    if (pressedKeys.has(pressedKey)) return;

    pressedKeys.add(pressedKey);

    const action = resolveAction(event);
    if (action) {
        broadcast(action);
    }
}

function handleKeyUp(event) {
    const bindingKeys = getBindingKeys(event);
    const pressedKey = bindingKeys[0] ?? String(event.vKey);
    pressedKeys.delete(pressedKey);
}

keyboard.addListener(event => {
    const keyName = event.name ?? "unknown";
    const rawName = event.rawKey?._nameRaw ?? "unknown";

    if (ToggleBindings.has(keyName) || ToggleBindings.has(rawName)) {
        console.log(`Companion bridge key ${event.state}: name=${keyName} raw=${rawName} vKey=${event.vKey}`);
    }

    if (event.state === "DOWN") {
        handleKeyDown(event);
        return;
    }

    if (event.state === "UP") {
        handleKeyUp(event);
    }
}).then(() => {
    console.log("Companion bridge keyboard listener started.");
}).catch(error => {
    console.error("Companion bridge failed to start keyboard listener:", error);
});

wss.on("listening", () => {
    console.log(`Companion bridge listening on ws://localhost:${PORT}`);
});

wss.on("connection", socket => {
    console.log("Companion bridge client connected.");

    socket.on("error", error => {
        console.error("Companion bridge socket error:", error);
    });

    socket.on("close", () => {
        console.log("Companion bridge client disconnected.");
    });
});

wss.on("error", error => {
    console.error("Companion bridge server error:", error);
});

function shutdown() {
    keyboard.kill();
    wss.close(() => {
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
