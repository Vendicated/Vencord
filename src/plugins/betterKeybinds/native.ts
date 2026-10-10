/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type ChildProcessWithoutNullStreams,spawn } from "child_process";
import type { IpcMainInvokeEvent, WebContents, WebContentsDidStartNavigationEventParams } from "electron";
import inputSource from "file://input.py";

const START_TIMEOUT = 10_000;
const STOP_TIMEOUT = 1_000;
const MAX_LINE_BYTES = 65_536;
const MAX_STDERR_BYTES = 4_096;
const MAX_CALLBACKS = 128;
const MAX_WATCHED_KEYS = 2_048;
const MAX_EVENTS = 4_096;

interface Session {
    sender: WebContents;
    generation: number;
    child: ChildProcessWithoutNullStreams;
    closed: Promise<void>;
    exited: boolean;
    ready: boolean;
    settled: boolean;
    departed: boolean;
    stopping: boolean;
    failureQueued: boolean;
    stderr: Buffer;
    line: Buffer;
    serial: Promise<void>;
    pending: number;
    resolveReady: () => void;
    rejectReady: (error: Error) => void;
    onDeparture: () => void;
    onNavigation: (details: WebContentsDidStartNavigationEventParams) => void;
}

let active: Session | null = null;
let lifecycle: Promise<void> = Promise.resolve();

function schedule<T>(action: () => Promise<T>): Promise<T> {
    const result = lifecycle.then(action);
    lifecycle = result.then(() => undefined, () => undefined);
    return result;
}

function checkSender(event: IpcMainInvokeEvent) {
    if (event.sender.isDestroyed() || event.senderFrame !== event.sender.mainFrame)
        throw new Error("BetterKeybinds requires a live main-frame renderer");
}

function validKey(type: unknown, code: unknown): boolean {
    return typeof code === "number" && Number.isSafeInteger(code)
        && ((type === 0 && code >= 9 && code <= 263)
            || (type === 1 && code >= 1 && code <= 9));
}

function text(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 && value.length <= 1_024 ? value : null;
}

function settleReady(session: Session, error?: Error) {
    if (session.settled) return;
    session.settled = true;
    if (error) session.rejectReady(error);
    else session.resolveReady();
}

function callRenderer(session: Session, method: "receive" | "reset" | "failed", argument: string) {
    return session.sender.executeJavaScript(
        `Vencord.Plugins.plugins.BetterKeybinds.${method}(${session.generation},${argument})`
    ).then(() => undefined);
}

function queueCallback(session: Session, method: "receive" | "reset", argument: string) {
    if (session.failureQueued || session.stopping || session.departed || active !== session) return;
    if (session.pending >= MAX_CALLBACKS) {
        fail(session, "Input callback queue exceeded its limit");
        return;
    }
    session.pending++;
    session.serial = session.serial.then(async () => {
        try {
            if (active === session && !session.stopping && !session.departed)
                await callRenderer(session, method, argument);
        } catch {
            fail(session, "Could not deliver input to the renderer");
        } finally {
            session.pending--;
        }
    });
}

function fail(session: Session, message: string) {
    if (session.failureQueued || session.stopping || session.departed || active !== session) return;
    session.failureQueued = true;
    // The failure callback follows every already queued input/reset callback. The renderer
    // latches mute state before it releases any held shortcuts on failure.
    session.serial = session.serial.then(async () => {
        if (active === session && !session.stopping && !session.departed) {
            try {
                await callRenderer(session, "failed", JSON.stringify(message));
            } catch {
                // The renderer may have disappeared without a navigation notification.
            }
        }
    });
    void schedule(async () => {
        await session.serial;
        await shutdown(session);
    });
}

function protocolError(session: Session, message: string) {
    if (!session.ready) {
        settleReady(session, new Error(message));
    } else {
        fail(session, message);
    }
    if (!session.exited) session.child.kill("SIGTERM");
}

function handleLine(session: Session, line: Buffer) {
    if (session.stopping || session.failureQueued || session.departed) return;
    let packet: unknown;
    try {
        packet = JSON.parse(line.toString("utf8"));
    } catch {
        protocolError(session, "Input helper sent malformed JSON");
        return;
    }
    if (!packet || typeof packet !== "object" || Array.isArray(packet) || !("type" in packet)) {
        protocolError(session, "Input helper sent an invalid message");
        return;
    }
    if (packet.type === "ready" && !session.ready) {
        if (!("devices" in packet) || typeof packet.devices !== "number"
            || !Number.isSafeInteger(packet.devices) || packet.devices < 1) {
            protocolError(session, "Input helper opened no usable devices");
            return;
        }
        session.ready = true;
        settleReady(session);
    } else if (packet.type === "input" && session.ready) {
        if (!("events" in packet) || !Array.isArray(packet.events) || packet.events.length < 1 || packet.events.length > MAX_EVENTS
            || !packet.events.every((event: unknown) => Array.isArray(event) && event.length === 3
                && validKey(event[0], event[1]) && typeof event[2] === "boolean")) {
            protocolError(session, "Input helper sent invalid input events");
            return;
        }
        queueCallback(session, "receive", JSON.stringify(packet.events));
    } else if (packet.type === "reset" && session.ready) {
        const reason = "reason" in packet ? text(packet.reason) : null;
        if (reason === null) protocolError(session, "Input helper sent an invalid reset");
        else queueCallback(session, "reset", JSON.stringify(reason));
    } else if (packet.type === "error") {
        const message = "message" in packet ? text(packet.message) : null;
        protocolError(session, message ?? "Input helper failed without a valid error message");
    } else {
        protocolError(session, "Input helper sent an unexpected message");
    }
}

function consumeStdout(session: Session, chunk: Buffer) {
    if (session.stopping || session.failureQueued || session.departed) return;
    let offset = 0;
    while (offset < chunk.length) {
        const end = chunk.indexOf(10, offset);
        const last = end < 0 ? chunk.length : end;
        const length = last - offset;
        if (session.line.length + length > MAX_LINE_BYTES) {
            protocolError(session, "Input helper message exceeded its size limit");
            return;
        }
        if (length) session.line = Buffer.concat([session.line, chunk.subarray(offset, last)]);
        if (end < 0) return;
        const { line } = session;
        session.line = Buffer.alloc(0);
        handleLine(session, line);
        if (session.failureQueued || session.stopping || session.departed || session.settled && !session.ready) return;
        offset = end + 1;
    }
}

function spawnHelper(sender: WebContents, generation: number) {
    const child = spawn("python3", ["-u", "-c", inputSource], { stdio: ["pipe", "pipe", "pipe"] });
    let closeProcess!: () => void;
    const closed = new Promise<void>(resolve => { closeProcess = resolve; });
    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;
    const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
    });
    const session: Session = {
        sender, generation, child, closed, exited: false, ready: false, settled: false,
        departed: false, stopping: false, failureQueued: false,
        stderr: Buffer.alloc(0), line: Buffer.alloc(0), serial: Promise.resolve(), pending: 0,
        resolveReady, rejectReady,
        onDeparture: () => {
            if (session.departed) return;
            session.departed = true;
            if (!session.ready) {
                settleReady(session, new Error("BetterKeybinds renderer left while starting"));
                if (!session.exited) session.child.kill("SIGTERM");
            } else {
                void schedule(() => shutdown(session));
            }
        },
        onNavigation: details => {
            if (details.isMainFrame && !details.isSameDocument)
                session.onDeparture();
        }
    };
    active = session;
    sender.on("destroyed", session.onDeparture);
    sender.on("did-start-navigation", session.onNavigation);
    sender.on("render-process-gone", session.onDeparture);

    child.stdout.on("data", (chunk: Buffer) => consumeStdout(session, chunk));
    child.stderr.on("data", (chunk: Buffer) => {
        session.stderr = Buffer.concat([session.stderr, chunk]).subarray(-MAX_STDERR_BYTES);
    });
    child.stdin.on("error", error => {
        if (!session.stopping && !session.exited) {
            if (!session.ready) settleReady(session, new Error(`Input helper stdin failed: ${error.message}`));
            else fail(session, `Input helper stdin failed: ${error.message}`);
        }
    });
    child.on("error", error => {
        if (!session.ready) settleReady(session, new Error(`Could not start input helper: ${error.message}`));
        else fail(session, `Input helper failed: ${error.message}`);
    });
    child.on("close", (code, signal) => {
        session.exited = true;
        closeProcess();
        if (session.stopping || session.departed) return;
        const detail = session.stderr.toString("utf8").trim();
        const message = `Input helper exited (${signal ?? code ?? "unknown"})${detail ? `: ${detail}` : ""}`;
        if (!session.ready) settleReady(session, new Error(message));
        else fail(session, message);
    });
    try {
        child.stdin.write('{"watch":[],"capture":false}\n');
    } catch (error) {
        settleReady(session, new Error(`Could not configure input helper: ${String(error)}`));
    }
    const timer = setTimeout(() => protocolError(session, "Input helper did not become ready in time"), START_TIMEOUT);
    return { session, ready: ready.finally(() => clearTimeout(timer)) };
}

async function shutdown(session: Session) {
    if (active !== session || session.stopping) return;
    session.stopping = true;
    active = null;
    session.sender.off("destroyed", session.onDeparture);
    session.sender.off("did-start-navigation", session.onNavigation);
    session.sender.off("render-process-gone", session.onDeparture);
    if (!session.settled) settleReady(session, new Error("BetterKeybinds helper stopped while starting"));
    session.child.stdin.end();
    if (!session.exited) {
        session.child.kill("SIGTERM");
        const timer = setTimeout(() => {
            if (!session.exited) session.child.kill("SIGKILL");
        }, STOP_TIMEOUT);
        try {
            await session.closed;
        } finally {
            clearTimeout(timer);
        }
    }
}

export async function start(event: IpcMainInvokeEvent, generation: number): Promise<void> {
    return schedule(async () => {
        checkSender(event);
        if (process.platform !== "linux") throw new Error("BetterKeybinds requires Linux");
        if (!Number.isSafeInteger(generation) || generation < 0)
            throw new Error("Invalid BetterKeybinds generation");
        if (active && active.sender !== event.sender)
            throw new Error("BetterKeybinds belongs to another renderer");
        if (active?.generation === generation) {
            if (active.failureQueued || active.stopping || active.departed)
                throw new Error("BetterKeybinds helper is stopping");
            return;
        }
        if (active) await shutdown(active);
        if (event.sender.isDestroyed()) throw new Error("BetterKeybinds renderer has been destroyed");
        const { session, ready } = spawnHelper(event.sender, generation);
        try {
            await ready;
            if (session.departed || session.exited || session.failureQueued || event.sender.isDestroyed())
                throw new Error("BetterKeybinds helper stopped while starting");
        } catch (error) {
            if (session.failureQueued && !session.departed)
                await session.serial;
            await shutdown(session);
            throw error;
        }
    });
}

export async function configure(event: IpcMainInvokeEvent, generation: number, watch: Array<[number, number]>, capture: boolean): Promise<void> {
    checkSender(event);
    if (!Number.isSafeInteger(generation) || generation < 0 || typeof capture !== "boolean"
        || !Array.isArray(watch) || watch.length > MAX_WATCHED_KEYS
        || !watch.every(pair => Array.isArray(pair) && pair.length === 2 && validKey(pair[0], pair[1])))
        throw new Error("Invalid BetterKeybinds configuration");
    await schedule(async () => {
        const session = active;
        if (!session || session.sender !== event.sender || session.generation !== generation
            || !session.ready || session.departed || session.stopping || session.failureQueued)
            throw new Error("BetterKeybinds helper is not active for this renderer and generation");
        try {
            await new Promise<void>((resolve, reject) => {
                session.child.stdin.write(`${JSON.stringify({ watch, capture })}\n`, error => {
                    if (error) reject(error);
                    else resolve();
                });
            });
        } catch (error) {
            fail(session, `Could not configure input helper: ${String(error)}`);
            throw error;
        }
    });
}

export async function stop(event: IpcMainInvokeEvent): Promise<void> {
    if (event.senderFrame !== event.sender.mainFrame) return;
    await schedule(async () => {
        if (active?.sender === event.sender)
            await shutdown(active);
    });
}
