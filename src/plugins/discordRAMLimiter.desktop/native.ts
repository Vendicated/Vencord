/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawn, type ChildProcess } from "child_process";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import type { IpcMainInvokeEvent } from "electron";

const TRIM_INTERVAL_MS = 1500;
const RESTART_DELAY_MS = 5000;
const MAX_FAST_EXIT_RESTARTS = 5;
const FAST_EXIT_THRESHOLD_MS = 10000;
const MIN_WORKING_SET_BYTES = 16 * 1024 * 1024;

const PROCESS_NAMES = ["Discord", "DiscordCanary", "DiscordPTB", "DiscordDevelopment", "Vesktop"];
const LINUX_COMM_NAMES = new Set(
    PROCESS_NAMES.flatMap(n => [n.slice(0, 15).toLowerCase()])
);

const IS_WINDOWS = process.platform === "win32";
const IS_LINUX = process.platform === "linux";

const TRIM_SCRIPT = `
$src = @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

public static class WorkingSetTrimmer
{
    private const int TrimAccess = 0x0500;
    private static readonly UIntPtr TrimSize = new UIntPtr(ulong.MaxValue);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetProcessWorkingSetSize(IntPtr hProcess, UIntPtr dwMinimumWorkingSetSize, UIntPtr dwMaximumWorkingSetSize);

    public static int Run(int parentPid, int intervalMs, string processNames, long minWorkingSetBytes)
    {
        var names = processNames.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
        while (IsParentAlive(parentPid))
        {
            TrimAll(names, minWorkingSetBytes);
            Thread.Sleep(intervalMs);
        }
        return 0;
    }

    private static bool IsParentAlive(int pid)
    {
        try
        {
            using (var p = Process.GetProcessById(pid))
            {
                return !p.HasExited;
            }
        }
        catch
        {
            return false;
        }
    }

    private static void TrimAll(string[] names, long minBytes)
    {
        foreach (var name in names)
        {
            Process[] processes;
            try
            {
                processes = Process.GetProcessesByName(name);
            }
            catch
            {
                continue;
            }

            foreach (var process in processes)
            {
                try
                {
                    if (process.WorkingSet64 < minBytes)
                    {
                        continue;
                    }

                    var handle = OpenProcess(TrimAccess, false, process.Id);
                    if (handle != IntPtr.Zero)
                    {
                        SetProcessWorkingSetSize(handle, TrimSize, TrimSize);
                        CloseHandle(handle);
                    }
                }
                catch
                {
                }
                finally
                {
                    process.Dispose();
                }
            }
        }
    }
}
'@
Add-Type -TypeDefinition $src -ErrorAction Stop
[WorkingSetTrimmer]::Run(${process.pid}, ${TRIM_INTERVAL_MS}, '${PROCESS_NAMES.join(";")}', ${MIN_WORKING_SET_BYTES})
`;

let child: ChildProcess | null = null;
let childExited = true;
let linuxTimer: ReturnType<typeof setInterval> | null = null;
let desiredRunning = false;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let spawnedAt = 0;
let fastExitCount = 0;
let lastError: string | null = null;
let lastStderr = "";
let linuxDenied = 0;

function currentStatus() {
    return {
        running: desiredRunning && (IS_LINUX ? !!linuxTimer : !!child && !childExited),
        desiredRunning,
        pid: child?.pid ?? null,
        platform: process.platform,
        mode: IS_WINDOWS ? "windows" : IS_LINUX ? "linux" : "unsupported",
        intervalMs: TRIM_INTERVAL_MS,
        processNames: PROCESS_NAMES,
        linuxDenied,
        lastError,
    };
}

function linuxTrimOnce() {
    let denied = 0;
    for (const entry of readdirSync("/proc")) {
        if (!/^\d+$/.test(entry)) continue;
        const pid = Number(entry);
        try {
            const comm = readFileSync(`/proc/${pid}/comm`, "utf8").trim().toLowerCase();
            if (!LINUX_COMM_NAMES.has(comm)) continue;

            const status = readFileSync(`/proc/${pid}/status`, "utf8");
            const rss = /VmRSS:\s+(\d+) kB/.exec(status);
            if (!rss || Number(rss[1]) * 1024 < MIN_WORKING_SET_BYTES) continue;

            try {
                writeFileSync(`/proc/${pid}/clear_refs`, "1");
            } catch (err) {
                const code = (err as NodeJS.ErrnoException).code;
                if (code === "EPERM" || code === "EACCES") denied++;
            }
        } catch {}
    }
    linuxDenied = denied;
}

function spawnLimiter() {
    if (!IS_WINDOWS) {
        lastError = "unsupported-platform";
        desiredRunning = false;
        return;
    }

    const proc = spawn("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy", "Bypass",
        "-Command", TRIM_SCRIPT
    ], {
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true
    });

    child = proc;
    childExited = false;
    spawnedAt = Date.now();
    lastError = null;
    lastStderr = "";

    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", chunk => {
        lastStderr = (lastStderr + chunk).slice(-4000);
    });

    proc.on("error", err => {
        lastError = String(err);
        desiredRunning = false;
        childExited = true;
        if (child === proc) child = null;
        if (restartTimer) {
            clearTimeout(restartTimer);
            restartTimer = null;
        }
    });

    proc.on("exit", (code, signal) => {
        if (child !== proc) return;
        childExited = true;
        child = null;
        if (!desiredRunning) return;

        if (code !== 0 && signal !== "SIGTERM") {
            lastError = `limiter exited (code=${code}, signal=${signal})${lastStderr ? `: ${lastStderr.trim().split("\n").pop()}` : ""}`;
        }

        const ranFor = Date.now() - spawnedAt;
        if (ranFor < FAST_EXIT_THRESHOLD_MS) {
            fastExitCount++;
            if (fastExitCount >= MAX_FAST_EXIT_RESTARTS) {
                desiredRunning = false;
                lastError ??= "limiter process keeps exiting, giving up";
                return;
            }
        } else {
            fastExitCount = 0;
        }

        restartTimer = setTimeout(() => {
            restartTimer = null;
            if (desiredRunning && (!child || childExited)) spawnLimiter();
        }, RESTART_DELAY_MS);
    });
}

export async function startLimiter(_: IpcMainInvokeEvent) {
    desiredRunning = true;
    fastExitCount = 0;
    lastError = null;

    if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
    }

    if (IS_WINDOWS) {
        if (!child || childExited) spawnLimiter();
    } else if (IS_LINUX) {
        if (!linuxTimer) {
            linuxTrimOnce();
            linuxTimer = setInterval(linuxTrimOnce, TRIM_INTERVAL_MS);
        }
    } else {
        desiredRunning = false;
        lastError = "unsupported-platform";
    }

    return currentStatus();
}

export async function stopLimiter(_: IpcMainInvokeEvent) {
    desiredRunning = false;

    if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
    }

    const proc = child;
    child = null;
    childExited = true;

    if (proc && !proc.killed) {
        try {
            proc.kill();
        } catch {
        }
    }

    if (linuxTimer) {
        clearInterval(linuxTimer);
        linuxTimer = null;
    }

    return currentStatus();
}

export async function getStatus(_: IpcMainInvokeEvent) {
    return currentStatus();
}
