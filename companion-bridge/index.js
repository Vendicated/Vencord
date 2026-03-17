/* eslint-disable no-console */

const { GlobalKeyboardListener } = require("node-global-key-listener");
const { WebSocketServer } = require("ws");

const PORT = 6969;
const pressedKeys = new Set();
const ToggleBindings = new Map([
    ["INSERT", "TOGGLE_MUTE"],
    ["NUMPAD0", "TOGGLE_MUTE"],
    ["HOME", "TOGGLE_DEAFEN"],
    ["NUMPAD7", "TOGGLE_DEAFEN"]
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

    for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
            client.send(payload);
        }
    }
}

function handleKeyDown(name) {
    if (pressedKeys.has(name)) return;

    pressedKeys.add(name);

    const action = ToggleBindings.get(name);
    if (action) {
        broadcast(action);
    }
}

function handleKeyUp(name) {
    pressedKeys.delete(name);
}

keyboard.addListener(event => {
    if (event.state === "DOWN") {
        handleKeyDown(event.name);
        return;
    }

    if (event.state === "UP") {
        handleKeyUp(event.name);
    }
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
