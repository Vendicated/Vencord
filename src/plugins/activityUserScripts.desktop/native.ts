/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openMonacoEditor } from "@main/ipcMain";
import { RendererSettings } from "@main/settings";
import { IpcEvents } from "@shared/IpcEvents";
import type { IpcRes } from "@utils/types";
import { app, type BrowserWindow, type IpcMainInvokeEvent, type WebFrameMain, webFrameMain } from "electron";

import { ActivityUserScript, getScriptEnabled, refreshUserScriptMetadata, RunAt } from "./shared";

const requireCache = new Map<string, Promise<string>>();
const executedFrames = new WeakMap<WebFrameMain, Set<string>>();
let syncedScripts: Record<string, ActivityUserScript> | null = null;

function getPluginSettings() {
    return RendererSettings.store.plugins?.ActivityUserScripts;
}

function getActivityId(url: string) {
    try {
        const { hostname } = new URL(url);
        const match = hostname.match(/^([a-zA-Z0-9_-]+)\.discordsays\.com$/);
        return match?.[1] ?? null;
    } catch {
        return null;
    }
}

function getEnabledScripts(activityId: string, runAt: RunAt) {
    const pluginSettings = getPluginSettings();
    if (!pluginSettings?.enabled) return [];

    const scripts = Object.values(syncedScripts ?? pluginSettings.scripts ?? {}) as ActivityUserScript[];
    return scripts.filter(script =>
        getScriptEnabled(script) &&
        (script.runAt === runAt || (runAt === RunAt.DocumentEnd && script.runAt === RunAt.DocumentStart)) &&
        script.activityIds.includes(activityId) &&
        script.code.trim()
    );
}

async function fetchText(url: string) {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http(s) URLs are supported");
    }

    const res = await fetch(parsed);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.text();
}

async function fetchRequire(url: string) {
    let pending = requireCache.get(url);

    if (!pending) {
        pending = fetchText(url);
        requireCache.set(url, pending);
    }

    return pending;
}

function markExecuted(frame: WebFrameMain, scriptId: string) {
    let scriptIds = executedFrames.get(frame);
    if (!scriptIds) executedFrames.set(frame, scriptIds = new Set());

    if (scriptIds.has(scriptId)) return false;
    scriptIds.add(scriptId);
    return true;
}

function notifyExecution(win: BrowserWindow, script: ActivityUserScript, activityId: string) {
    if (script.notifyOnRun === false) return;

    const name = script.names[0] || script.metadata.name || "Untitled UserScript";
    win.webContents.executeJavaScript(
        `Vencord.Plugins.plugins.ActivityUserScripts.notifyScriptExecuted(${JSON.stringify(name)},${JSON.stringify(activityId)})`
    ).catch(() => null);
}

async function executeScript(win: BrowserWindow, frame: WebFrameMain, script: ActivityUserScript, activityId: string) {
    if (!markExecuted(frame, script.id)) return;

    const requires = script.metadata.requires.length
        ? `${(await Promise.all(script.metadata.requires.map(fetchRequire))).join("\n;\n")}\n;\n`
        : "";

    await frame.executeJavaScript(`${requires}${script.code}`).catch(() => {});
    notifyExecution(win, script, activityId);
}

function executeMatchingScripts(win: BrowserWindow, frame: WebFrameMain, runAt: RunAt) {
    let frameUrl: string | null = null;
    try {
        // Frame may not be ready yet
        frameUrl = frame.url;
    } catch { }
    if (!frameUrl) return;

    const activityId = getActivityId(frame.url);
    if (!activityId) return;

    for (const script of getEnabledScripts(activityId, runAt)) {
        executeScript(win, frame, script, activityId).catch(() => null);
    }
}

app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        try {
            if (!frame) return;

            executeMatchingScripts(win, frame, RunAt.DocumentStart);

            frame.once("dom-ready", () => {
                executeMatchingScripts(win, frame, RunAt.DocumentStart);
                executeMatchingScripts(win, frame, RunAt.DocumentEnd);

                setTimeout(() => {
                    executeMatchingScripts(win, frame, RunAt.DocumentIdle);
                }, 1_000);
            });
        } catch {
            // Activity frames can be disposed while Electron is still dispatching frame events.
        }
    });

    win.webContents.on("did-frame-finish-load", (_, __, frameProcessId, frameRoutingId) => {
        const frame = webFrameMain.fromId(frameProcessId, frameRoutingId);
        if (!frame) return;

        executeMatchingScripts(win, frame, RunAt.DocumentEnd);

        setTimeout(() => {
            executeMatchingScripts(win, frame, RunAt.DocumentIdle);
        }, 1_000);
    });
});

export async function fetchUserScript(_: IpcMainInvokeEvent, url: string): Promise<IpcRes<string>> {
    try {
        return { ok: true, value: await fetchText(url) };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export function syncScripts(_: IpcMainInvokeEvent, scripts: Record<string, ActivityUserScript>) {
    syncedScripts = scripts;
}

export function openEditor(event: IpcMainInvokeEvent, scriptId: string, code: string, title: string) {
    return openMonacoEditor({
        title,
        language: "javascript",
        getContent: () => syncedScripts?.[scriptId]?.code ?? code,
        setContent: nextCode => {
            if (syncedScripts?.[scriptId]) {
                syncedScripts = {
                    ...syncedScripts,
                    [scriptId]: refreshUserScriptMetadata(syncedScripts[scriptId], nextCode),
                };
            }
        },
        onContentChanged: nextCode => {
            event.sender.send(IpcEvents.MONACO_EDITOR_CONTENT_CHANGED, scriptId, nextCode);
        },
    });
}
