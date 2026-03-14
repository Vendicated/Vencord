/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function getDoomBootstrapScript() {
    return `
const setStatus = message => {
    parent.postMessage({ type: "command-palette-doom-status", message: String(message ?? "") }, "*");
};

const defaultArgs = ["-iwad", "doom1.wad", "-window", "-nogui", "-nomusic"];
const defaultConfig = [
    "use_mouse 0",
    "joyb_speed 29",
    "mouse_acceleration 2.0",
    "snd_musicdevice 0"
].join("\\n");

async function gunzip(url) {
    if (typeof DecompressionStream !== "function") {
        throw new Error("This browser does not support gzip decompression");
    }

    const response = await fetch(url);
    if (!response.ok || !response.body) {
        throw new Error("Failed to load Freedoom data");
    }

    const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

window.addEventListener("error", event => {
    setStatus(\`error: \${event.message}\`);
});

window.addEventListener("unhandledrejection", event => {
    setStatus(\`promise rejection: \${event.reason}\`);
});

window.addEventListener("message", async event => {
    if (event.data === "focus-doom") {
        document.getElementById("canvas")?.focus();
        return;
    }

    if (event.data?.type !== "command-palette-doom-init" || window.__doomBooted) {
        return;
    }

    window.__doomBooted = true;

    const { doomWasmScriptUrl, doomWasmUrl, wadGzipUrl } = event.data;
    const canvas = document.getElementById("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
        setStatus("error: canvas missing");
        return;
    }

    try {
        setStatus("boot: unpacking Freedoom");
        const wadBytes = await gunzip(wadGzipUrl);

        setStatus("boot: starting Chocolate Doom");
        window.Module = {
            noInitialRun: true,
            canvas,
            locateFile(path) {
                return path.endsWith(".wasm") ? doomWasmUrl : path;
            },
            preRun: [() => {
                Module.FS.writeFile("/doom1.wad", wadBytes);
                Module.FS.writeFile("/default.cfg", defaultConfig);
            }],
            onRuntimeInitialized() {
                setStatus("boot: ready");
                canvas.focus();
                callMain([...defaultArgs, "-config", "default.cfg"]);
            },
            print(text) {
                setStatus(text);
            },
            printErr(text) {
                setStatus("stderr: " + text);
            },
            setStatus() { }
        };

        const scriptTag = document.createElement("script");
        scriptTag.src = doomWasmScriptUrl;
        scriptTag.onload = () => setStatus("boot: engine loaded");
        scriptTag.onerror = () => setStatus("error: failed to load engine");
        document.body.appendChild(scriptTag);
    } catch (error) {
        setStatus(\`error: \${error instanceof Error ? error.message : String(error)}\`);
    }
});
`;
}

export function getDoomRuntimeHtml(bootstrapScriptUrl: string) {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>DOOM</title>
    <style>
        html, body {
            margin: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #0a0a0a;
        }
        body {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #doom-root {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
                radial-gradient(circle at top, rgb(153 27 27 / 18%), transparent 42%),
                linear-gradient(180deg, #171717 0%, #090909 100%);
            overflow: hidden;
        }
        #canvas {
            display: block;
            width: min(960px, 96vw);
            max-width: 100%;
            aspect-ratio: 4 / 3;
            margin: auto;
            background: #000;
            image-rendering: pixelated;
            outline: none;
        }
    </style>
</head>
<body>
    <div id="doom-root">
        <canvas id="canvas" tabindex="-1"></canvas>
    </div>
    <script src="${bootstrapScriptUrl}"></script>
</body>
</html>`;
}
