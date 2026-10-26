/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const AUDITED_BUILD = 649389;
export const AUDITED_HASH = "a4e81a1fff2ccc1e9c47281017039f16f16b2664";
export const NOTIFICATION_MODULE_ID = 592329;
export type BindingStatus = "pending" | "ready" | "incompatible";

export function matchesTarget(value: unknown): boolean {
    if (value === null || typeof value !== "object") return false;
    try {
        if (Array.isArray(value)) return false;
        const environment = value as Record<string, unknown>;
        return environment.RELEASE_CHANNEL === "stable"
            && environment.BUILD_NUMBER === String(AUDITED_BUILD)
            && environment.VERSION_HASH === AUDITED_HASH;
    } catch {
        return false;
    }
}

function isExpectedModule(moduleId: unknown, expectedModuleId: number): boolean {
    return moduleId === expectedModuleId || moduleId === String(expectedModuleId);
}

interface ModuleSnapshot {
    value: object;
    exports: object;
    loaded: boolean;
}

function readModule(value: unknown, expectedModuleId: number): ModuleSnapshot | undefined {
    try {
        if (value === null || typeof value !== "object" || Array.isArray(value)) return;
        const { id, exports, loaded } = value as Record<string, unknown>;
        if (!isExpectedModule(id, expectedModuleId) || typeof loaded !== "boolean"
            || exports === null || typeof exports !== "object" || Array.isArray(exports)) return;
        return { value, exports, loaded };
    } catch {
        return;
    }
}

export class BindingState {
    private module: object | undefined;
    private exports: object | undefined;

    constructor(private readonly expectedModuleId = NOTIFICATION_MODULE_ID) { }

    markReady(moduleId: unknown, module: unknown): boolean {
        if (!isExpectedModule(moduleId, this.expectedModuleId)) return false;
        const snapshot = readModule(module, this.expectedModuleId);
        if (!snapshot || (this.module === snapshot.value && this.exports === snapshot.exports)) return false;
        this.module = snapshot.value;
        this.exports = snapshot.exports;
        return true;
    }

    invalidate(moduleId: PropertyKey, cachedModule: unknown): boolean {
        if (!isExpectedModule(moduleId, this.expectedModuleId) || !this.module) return false;
        // A new factory registration does not replace an already loaded Webpack cache entry.
        if (this.state(true, cachedModule) === "ready") return false;
        this.module = undefined;
        this.exports = undefined;
        return true;
    }

    state(targetMatches: boolean, cachedModule: unknown): BindingStatus {
        if (!targetMatches) return "incompatible";
        if (cachedModule == null) return "pending";
        const snapshot = readModule(cachedModule, this.expectedModuleId);
        if (!snapshot) return "incompatible";
        if (!snapshot.loaded) return "pending";
        return this.module === snapshot.value && this.exports === snapshot.exports ? "ready" : "incompatible";
    }
}
