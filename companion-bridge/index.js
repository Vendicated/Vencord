/* eslint-disable no-console */

const { uIOhook, UiohookKey } = require("uiohook-napi");
const { WebSocketServer } = require("ws");

const PORT = 6969;
const pressedKeys = new Set();
const ToggleBindings = new Map([
    [UiohookKey.Insert, "TOGGLE_MUTE"],
    [UiohookKey.Numpad0, "TOGGLE_MUTE"],
    [UiohookKey.Home, "TOGGLE_DEAFEN"],
    [UiohookKey.Numpad7, "TOGGLE_DEAFEN"]
]);

const wss = new WebSocketServer({ host: "127.0.0.1", port: PORT });

function broadcast(action) {
    const payload = JSON.stringify({ action });
    console.log(`Companion bridge broadcasting ${action} to ${wss.clients.size} client(s).`);

    for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
            client.send(payload);
        }
    }
}

function resolveAction(event) {
    return ToggleBindings.get(event.keycode) ?? null;
}

function handleKeyDown(event) {
    console.log(`Companion bridge keydown: keycode=${event.keycode}`);

    if (pressedKeys.has(event.keycode)) return;

    pressedKeys.add(event.keycode);

    const action = resolveAction(event);
    if (action) {
        broadcast(action);
    }
}

function handleKeyUp(event) {
    console.log(`Companion bridge keyup: keycode=${event.keycode}`);
    pressedKeys.delete(event.keycode);
}

uIOhook.on("keydown", handleKeyDown);
uIOhook.on("keyup", handleKeyUp);

try {
    uIOhook.start();
    console.log("Companion bridge keyboard listener started.");
} catch (error) {
    console.error("Companion bridge failed to start keyboard listener:", error);
}

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
    try {
        uIOhook.stop();
    } catch (error) {
        console.error("Companion bridge failed to stop keyboard listener:", error);
    }

    wss.close(() => {
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
