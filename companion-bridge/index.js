/* eslint-disable no-console */

const { GlobalKeyboardListener } = require("node-global-key-listener");
const { WebSocketServer } = require("ws");

const PORT = 6969;
const pressedKeys = new Set();

const wss = new WebSocketServer({ host: "127.0.0.1", port: PORT });
const keyboard = new GlobalKeyboardListener();

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

    if (name === "INSERT") {
        broadcast("TOGGLE_MUTE");
    } else if (name === "HOME") {
        broadcast("TOGGLE_DEAFEN");
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
    socket.on("error", error => {
        console.error("Companion bridge socket error:", error);
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
