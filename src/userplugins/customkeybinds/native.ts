/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChildProcessByStdio, spawn } from "child_process";
import { IpcMainInvokeEvent, WebContents } from "electron";
import { createInterface, Interface } from "readline";
import { Readable } from "stream";

type GlobalToggleAction = "mute" | "deafen";

const ToggleEventName = "vc-custom-keybinds-global-toggle";
const ErrorEventName = "vc-custom-keybinds-global-error";

interface ActiveBridge {
    cleanup: () => void;
    stderr: Interface;
    stdout: Interface;
    process: ChildProcessByStdio<null, Readable, Readable>;
    sender: WebContents;
}

let activeBridge: ActiveBridge | null = null;

function dispatchRendererEvent(sender: WebContents, eventName: string, detail: unknown) {
    if (sender.isDestroyed()) return;

    void sender.executeJavaScript(
        `window.dispatchEvent(new CustomEvent(${JSON.stringify(eventName)}, { detail: ${JSON.stringify(detail)} }));`
    );
}

function dispatchError(sender: WebContents, message: string) {
    dispatchRendererEvent(sender, ErrorEventName, message);
}

function dispatchToggle(sender: WebContents, action: GlobalToggleAction) {
    dispatchRendererEvent(sender, ToggleEventName, action);
}

function getPowerShellScript() {
    return `
$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class VencordKeyboardHook {
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_KEYUP = 0x0101;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_SYSKEYUP = 0x0105;
    private const int VK_HOME = 0x24;
    private const int VK_INSERT = 0x2D;

    private static readonly HookProc HookCallbackDelegate = HookCallback;
    private static IntPtr hookId = IntPtr.Zero;
    private static bool homeDown;
    private static bool insertDown;

    public static void Run() {
        hookId = SetWindowsHookEx(WH_KEYBOARD_LL, HookCallbackDelegate, GetModuleHandle(null), 0);
        if (hookId == IntPtr.Zero)
            throw new Win32Exception(Marshal.GetLastWin32Error());

        try {
            MSG message;
            while (GetMessage(out message, IntPtr.Zero, 0, 0) > 0) {
                TranslateMessage(ref message);
                DispatchMessage(ref message);
            }
        } finally {
            if (hookId != IntPtr.Zero)
                UnhookWindowsHookEx(hookId);
        }
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0) {
            int message = wParam.ToInt32();
            KBDLLHOOKSTRUCT keyboard = Marshal.PtrToStructure<KBDLLHOOKSTRUCT>(lParam);

            switch (message) {
                case WM_KEYDOWN:
                case WM_SYSKEYDOWN:
                    if (keyboard.vkCode == VK_INSERT) {
                        if (!insertDown) {
                            insertDown = true;
                            Console.WriteLine("mute");
                            Console.Out.Flush();
                        }
                    } else if (keyboard.vkCode == VK_HOME) {
                        if (!homeDown) {
                            homeDown = true;
                            Console.WriteLine("deafen");
                            Console.Out.Flush();
                        }
                    }
                    break;
                case WM_KEYUP:
                case WM_SYSKEYUP:
                    if (keyboard.vkCode == VK_INSERT)
                        insertDown = false;
                    else if (keyboard.vkCode == VK_HOME)
                        homeDown = false;
                    break;
            }
        }

        return CallNextHookEx(hookId, nCode, wParam, lParam);
    }

    private delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    private struct KBDLLHOOKSTRUCT {
        public int vkCode;
        public int scanCode;
        public int flags;
        public int time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSG {
        public IntPtr hwnd;
        public uint message;
        public UIntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public POINT pt;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT {
        public int x;
        public int y;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    [DllImport("user32.dll")]
    private static extern sbyte GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

    [DllImport("user32.dll")]
    private static extern bool TranslateMessage([In] ref MSG lpMsg);

    [DllImport("user32.dll")]
    private static extern IntPtr DispatchMessage([In] ref MSG lpMsg);
}
"@
[VencordKeyboardHook]::Run()
`;
}

function createBridge(sender: WebContents) {
    if (process.platform !== "win32") {
        throw new Error(
            "CustomKeybinds currently only implements non-consuming global toggles on Windows. " +
            "Electron globalShortcut was intentionally not used because it can steal the keys from other apps."
        );
    }

    const script = getPowerShellScript();
    const encodedCommand = Buffer.from(script, "utf16le").toString("base64");
    const child = spawn(
        "powershell.exe",
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", encodedCommand],
        {
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true
        }
    );

    const stdout = createInterface({ input: child.stdout });
    const stderr = createInterface({ input: child.stderr });

    const cleanup = () => {
        stdout.close();
        stderr.close();

        if (!child.killed) {
            child.kill();
        }

        if (activeBridge?.process === child) {
            activeBridge = null;
        }
    };

    stdout.on("line", line => {
        if (line === "mute" || line === "deafen") {
            dispatchToggle(sender, line);
            return;
        }

        dispatchError(sender, `CustomKeybinds native bridge emitted an unknown event: ${line}`);
    });

    stderr.on("line", line => {
        if (!line.length) return;

        dispatchError(sender, `CustomKeybinds native bridge error: ${line}`);
    });

    child.once("error", error => {
        dispatchError(sender, `Failed to start CustomKeybinds native bridge: ${error.message}`);
        cleanup();
    });

    child.once("exit", (code, signal) => {
        if (code === 0 || signal === "SIGTERM" || sender.isDestroyed()) {
            cleanup();
            return;
        }

        dispatchError(
            sender,
            `CustomKeybinds native bridge exited unexpectedly (code: ${code ?? "null"}, signal: ${signal ?? "null"}).`
        );
        cleanup();
    });

    sender.once("destroyed", cleanup);

    activeBridge = {
        cleanup,
        stderr,
        stdout,
        process: child,
        sender
    };
}

export async function start(event: IpcMainInvokeEvent) {
    if (activeBridge?.sender === event.sender) {
        return;
    }

    activeBridge?.cleanup();
    createBridge(event.sender);
}

export async function stop(event: IpcMainInvokeEvent) {
    if (!activeBridge || activeBridge.sender !== event.sender) {
        return;
    }

    activeBridge.cleanup();
}
