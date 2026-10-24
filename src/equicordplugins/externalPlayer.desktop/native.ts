/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { fetchJson } from "@main/utils/http";
import { type ChildProcess, spawn } from "child_process";
import { randomUUID } from "crypto";
import { IpcMainInvokeEvent } from "electron";
import { existsSync, rmSync } from "fs";
import { AddressInfo, createConnection, createServer } from "net";
import { tmpdir } from "os";
import { basename, isAbsolute, join } from "path";

import type { LaunchResult, Session, Statuses, VlcControl } from "./types";
import { canOpen, mediaKey } from "./utils";

const isFlatpak = existsSync("/.flatpak-info");

const players: Record<string, string> = { mpv: "mpv", vlc: "vlc" };

const sessions = new Map<string, Session>();

function splitArgs(args: string) {
    return (args.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [])
        .map(a => a.replace(/"([^"]*)"|'([^']*)'/g, "$1$2"))
        .filter(a => a !== "--");
}

function freePort() {
    return new Promise<number>(resolve => {
        const server = createServer().listen(0, "127.0.0.1", () => {
            const { port } = server.address() as AddressInfo;
            server.close(() => resolve(port));
        });
    });
}

function mpvCommand(session: Session, command: unknown[], request_id?: number) {
    session.socket?.write(JSON.stringify({ command, request_id }) + "\n");
}

function vlcRequest(session: Session, vlc: VlcControl, query = "") {
    if (vlc.pending) return;
    vlc.pending = true;
    fetchJson<{ state?: string; time?: unknown; length?: unknown; }>(`http://127.0.0.1:${vlc.port}/requests/status.json${query}`, {
        headers: { Authorization: `Basic ${Buffer.from(`:${vlc.password}`).toString("base64")}` },
        signal: AbortSignal.timeout(1000)
    }).then(data => {
        vlc.ready = true;
        session.status.paused = data.state !== "playing";
        session.status.time = typeof data.time === "number" ? data.time : null;
        session.status.duration = typeof data.length === "number" && data.length > 0 ? data.length : null;
    }, () => vlc.ready = false).finally(() => vlc.pending = false);
}

function connect(session: Session, path: string, tries = 50) {
    if (session.closed) return;
    const socket = createConnection(path);
    let buffer = "";

    socket.on("error", () => {
        if (!session.socket && tries > 0) setTimeout(() => connect(session, path, tries - 1), 300);
    });

    socket.once("close", () => {
        if (session.socket === socket) session.socket = undefined;
    });

    socket.once("connect", () => {
        if (session.closed) return socket.destroy();
        session.socket = socket;
        mpvCommand(session, ["observe_property", 0, "duration"]);
        mpvCommand(session, ["observe_property", 1, "pause"]);
    });

    socket.on("data", data => {
        const lines = (buffer + data).split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
            let msg: { event?: string; name?: string; data?: unknown; request_id?: number; };
            try {
                msg = JSON.parse(line);
            } catch {
                continue;
            }
            const num = typeof msg.data === "number" ? msg.data : null;
            if (msg.request_id === 1) session.status.time = num;
            else if (msg.event !== "property-change") continue;
            else if (msg.name === "pause") session.status.paused = msg.data === true;
            else if (msg.name === "duration") session.status.duration = num;
        }
    });
}

export async function launch(_: IpcMainInvokeEvent, url: unknown) {
    if (typeof url !== "string" || !canOpen(url))
        return { success: false, error: "Only https links can be opened." };

    const s = RendererSettings.store.plugins?.ExternalPlayer;
    const path = s?.path;
    const args = s?.args;
    const setting: string = Object.hasOwn(players, s?.player) ? s?.player : "mpv";

    if (path && (typeof path !== "string" || !isAbsolute(path)))
        return { success: false, error: "The custom player path must be an absolute path." };

    const key = mediaKey(url);
    if (sessions.has(key))
        return { success: false, error: "That's already open in the player." };

    const bin: string = path || players[setting];
    const name = basename(bin).toLowerCase();
    const isMpv = name.startsWith("mpv");
    const isVlc = name.startsWith("vlc");

    const session: Session = { status: { player: isMpv ? "mpv" : isVlc ? "vlc" : setting, paused: false, time: null, duration: null } };
    sessions.set(key, session);

    const id = `vc-mpv-${randomUUID().slice(0, 8)}`;
    const { XDG_RUNTIME_DIR, FLATPAK_ID } = process.env;
    const ipcDir = isFlatpak ? XDG_RUNTIME_DIR && FLATPAK_ID && join(XDG_RUNTIME_DIR, "app", FLATPAK_ID) : tmpdir();
    const ipcPath = isMpv && ipcDir
        ? process.platform === "win32" ? `\\\\.\\pipe\\${id}` : join(ipcDir, `${id}.sock`)
        : null;

    if (isVlc) session.vlc = { port: await freePort(), password: randomUUID() };

    const argv = [
        ...(isMpv ? ["--force-window=immediate"] : []),
        ...(typeof args === "string" ? splitArgs(args) : []),
        ...(ipcPath ? [`--input-ipc-server=${ipcPath}`] : []),
        ...(session.vlc ? ["--extraintf=http", "--http-host=127.0.0.1", `--http-port=${session.vlc.port}`, `--http-password=${session.vlc.password}`] : []),
        "--",
        url
    ];

    const end = () => {
        session.closed = true;
        session.socket?.destroy();
        if (sessions.get(key) === session) sessions.delete(key);
        if (ipcPath && process.platform !== "win32") rmSync(ipcPath, { force: true });
    };

    return new Promise<LaunchResult>(resolve => {
        let proc: ChildProcess;
        try {
            proc = spawn(isFlatpak ? "flatpak-spawn" : bin, isFlatpak ? ["--host", bin, ...argv] : argv, { detached: true, stdio: "ignore" });
        } catch {
            end();
            return resolve({ success: false, error: `Failed to start ${bin}.` });
        }
        session.proc = proc;

        proc.once("spawn", () => {
            proc.unref();
            setTimeout(() => resolve({ success: true }), 1000);
            proc.once("exit", code => {
                end();
                resolve(code ? { success: false, error: `${bin} closed right away (exit code ${code}).` } : { success: true });
            });
            if (ipcPath) connect(session, ipcPath);
        });
        proc.once("error", (e: NodeJS.ErrnoException) => {
            end();
            resolve({
                success: false,
                error: e.code === "ENOENT" ? `Could not find ${bin}. Set a custom path in the plugin settings.` : `Failed to start ${bin}.`
            });
        });
    });
}

export function getStatuses(): Statuses {
    for (const session of sessions.values()) {
        if (session.vlc) vlcRequest(session, session.vlc);
        else if (!session.status.paused) mpvCommand(session, ["get_property", "time-pos"], 1);
    }
    return Object.fromEntries([...sessions].map(([key, { status, socket, vlc }]) => [key, { ...status, controllable: !!(socket || vlc?.ready) }]));
}

function getSession(url: unknown) {
    return typeof url === "string" ? sessions.get(mediaKey(url)) : undefined;
}

export function togglePause(_: IpcMainInvokeEvent, url: unknown) {
    const session = getSession(url);
    if (!session) return;
    if (session.vlc) vlcRequest(session, session.vlc, "?command=pl_pause");
    else mpvCommand(session, ["cycle", "pause"]);
}

export function seek(_: IpcMainInvokeEvent, url: unknown, fraction: unknown) {
    const session = getSession(url);
    if (!session || typeof fraction !== "number" || !(fraction >= 0 && fraction <= 1)) return;
    const percent = Math.round(fraction * 1000) / 10;
    if (session.vlc) vlcRequest(session, session.vlc, `?command=seek&val=${percent}%25`);
    else mpvCommand(session, ["seek", percent, "absolute-percent"]);
}

export function close(_: IpcMainInvokeEvent, url: unknown) {
    const session = getSession(url);
    if (!session) return;
    if (session.vlc || !session.socket) session.proc?.kill();
    else mpvCommand(session, ["quit"]);
}
