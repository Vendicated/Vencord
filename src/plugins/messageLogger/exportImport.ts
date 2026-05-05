/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Alerts } from "@webpack/common";

import { getAllEntries, putEntries } from "./persistence";
import { PersistedMessage, SCHEMA_VERSION } from "./types";

const logger = new Logger("MessageLogger");

interface ExportFile {
    vencord_messagelogger_export: true;
    exportedAt: number;
    schemaVersion: number;
    entryCount: number;
    entries: PersistedMessage[];
}

/**
 * Export the entire `messages` store as a JSON file. Triggers a browser download
 * via Blob + invisible <a download>. Works the same on browser, Discord desktop,
 * and Vesktop — no native.ts needed.
 */
export async function exportLog(): Promise<void> {
    try {
        const entries = await getAllEntries();
        const payload: ExportFile = {
            vencord_messagelogger_export: true,
            exportedAt: Date.now(),
            schemaVersion: SCHEMA_VERSION,
            entryCount: entries.length,
            entries,
        };
        const json = JSON.stringify(payload);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vencord-messagelogger-${new Date().toISOString().slice(0, 10)}.json`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        logger.error("exportLog failed", e);
        Alerts.show({ title: "Export failed", body: "See console for details.", confirmText: "OK" });
    }
}

/**
 * Trigger an OS file picker for a `.json` file, then validate and import it.
 * Has its own confirmation dialog inside `importLogFromFile` before any DB writes.
 */
export function importLogFromFilePicker(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    input.onchange = async () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) return;
        await importLogFromFile(file);
    };
    document.body.appendChild(input);
    input.click();
}

async function importLogFromFile(file: File): Promise<void> {
    let payload: any;
    try {
        const text = await file.text();
        payload = JSON.parse(text);
    } catch (e) {
        logger.error("importLogFromFile: parse failed", e);
        Alerts.show({ title: "Import failed", body: "File is not valid JSON.", confirmText: "OK" });
        return;
    }

    if (payload?.vencord_messagelogger_export !== true) {
        Alerts.show({
            title: "Import failed",
            body: "File is not a Vencord MessageLogger export.",
            confirmText: "OK",
        });
        return;
    }

    if (typeof payload.schemaVersion !== "number" || payload.schemaVersion > SCHEMA_VERSION) {
        Alerts.show({
            title: "Import failed",
            body: `Schema version ${payload.schemaVersion} is newer than this build supports (${SCHEMA_VERSION}). Update Vencord and try again.`,
            confirmText: "OK",
        });
        return;
    }

    const entries: PersistedMessage[] = Array.isArray(payload.entries) ? payload.entries : [];
    Alerts.show({
        title: "Import message log?",
        body: `Import ${entries.length} entries? Existing entries with matching message IDs will be overwritten.`,
        confirmText: "Import",
        cancelText: "Cancel",
        async onConfirm() {
            try {
                const written = await putEntries(entries);
                Alerts.show({
                    title: "Import complete",
                    body: `Wrote ${written} of ${entries.length} entries.`,
                    confirmText: "OK",
                });
            } catch (e) {
                logger.error("import write failed", e);
                Alerts.show({ title: "Import failed", body: "See console for details.", confirmText: "OK" });
            }
        },
    });
}
