/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { exec } from "child_process";
import { IpcMainInvokeEvent } from "electron";
import { existsSync } from "fs";
import { join, resolve } from "path";

function runCommand(command: string) {
    return new Promise<void>((resolvePromise, reject) => {
        exec(command, error => {
            if (error) {
                reject(error);
                return;
            }

            resolvePromise();
        });
    });
}

function escapePowerShellString(value: string) {
    return value.replaceAll("'", "''");
}

function getCompanionScriptPath() {
    const candidates = [
        resolve(process.cwd(), "companion-bridge", "index.js"),
        resolve(__dirname, "..", "companion-bridge", "index.js"),
        resolve(__dirname, "..", "..", "companion-bridge", "index.js"),
        resolve(__dirname, "..", "..", "..", "companion-bridge", "index.js"),
        join(process.resourcesPath, "app.asar.unpacked", "companion-bridge", "index.js")
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error("Could not resolve companion-bridge/index.js.");
}

function buildPowerShellCommand(script: string) {
    return `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${script.replaceAll("\"", "\\\"")}"`;
}

export async function startCompanionServer(_: IpcMainInvokeEvent) {
    if (process.platform !== "win32") {
        throw new Error("CustomKeybinds companion server auto-start is only supported on Windows.");
    }

    const scriptPath = escapePowerShellString(getCompanionScriptPath());
    const command = buildPowerShellCommand(
        `& {
            $scriptPath = '${scriptPath}'
            $existing = Get-CimInstance Win32_Process | Where-Object {
                $_.Name -match '^node(\\.exe)?$' -and $_.CommandLine -match [Regex]::Escape($scriptPath)
            } | Select-Object -First 1

            if (-not $existing) {
                Start-Process node -ArgumentList $scriptPath -Verb RunAs -WindowStyle Hidden | Out-Null
            }
        }`
    );

    await runCommand(command);
}

export async function stopCompanionServer(_: IpcMainInvokeEvent) {
    if (process.platform !== "win32") {
        return;
    }

    const scriptPath = escapePowerShellString(getCompanionScriptPath());
    const command = buildPowerShellCommand(
        `& {
            $scriptPath = '${scriptPath}'
            Get-CimInstance Win32_Process | Where-Object {
                $_.Name -match '^node(\\.exe)?$' -and $_.CommandLine -match [Regex]::Escape($scriptPath)
            } | ForEach-Object {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }
        }`
    );

    await runCommand(command);
}
