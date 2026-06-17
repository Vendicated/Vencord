/*
 * Vesktop / Vencord plugin
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

type ElectronLike = {
    ipcRenderer?: {
        invoke?: (channel: string, ...args: any[]) => Promise<any>;
        send?: (channel: string, ...args: any[]) => void;
    };
    webFrame?: {
        setZoomFactor?: (factor: number) => void;
        setVisualZoomLevelLimits?: (minimumLevel: number, maximumLevel: number) => Promise<void> | void;
    };
};

function tryGetElectron(): ElectronLike | null {
    const g = globalThis as any;

    const req: unknown = g?.require ?? g?.window?.require;
    if (typeof req !== "function") return null;

    try {
        const electron = (req as (id: string) => any)("electron");
        if (!electron || typeof electron !== "object") return null;
        return electron as ElectronLike;
    } catch {
        return null;
    }
}

async function bestEffort<T>(fn: () => T | Promise<T>): Promise<T | undefined> {
    try {
        return await fn();
    } catch {
        return undefined;
    }
}

export default definePlugin({
    name: "Vectimized",
    description: "Applies best-effort optimizations for Electron part of Vesktop.",
    authors: [skytr1x.dev],
    tags: ["Performance", "Vesktop", "Electron"],

    start() {
        const electron = tryGetElectron();
        if (!electron) return;

        // Reset zoom
        void bestEffort(async () => {
            electron.webFrame?.setZoomFactor?.(1);
            await electron.webFrame?.setVisualZoomLevelLimits?.(1, 1);
        });

        // Apply balanced profile
        void bestEffort(async () => {
            const invoke = electron.ipcRenderer?.invoke;
            if (typeof invoke !== "function") return;

            await invoke("Vesktop:performance:applyProfile", {
                profile: "balanced",
                source: "plugin:VesktopElectronOptimizer"
            });
        });
    },

    stop() {
        const electron = tryGetElectron();
        if (!electron) return;

        // Best-effort rollback of the zoom constraints
        void bestEffort(async () => {
            electron.webFrame?.setZoomFactor?.(1);
            await electron.webFrame?.setVisualZoomLevelLimits?.(0, 0);
        });
    }
});

