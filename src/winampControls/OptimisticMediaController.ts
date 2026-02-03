/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { debugError, debugLog } from "./debugLog";
import { type RepeatMode, type WinampClient } from "./WinampClient";

// Winamp-specific store state
export type StoreState = {
    track: any;
    isPlaying: boolean;
    repeat: RepeatMode;
    shuffle: boolean;
    volume: number;
    position: number;
};

// Winamp-specific media actions
export type WinampMediaAction = {
    clientMethod: (client: WinampClient, args: any) => Promise<any>;
    optimisticUpdate: (args: any) => Partial<StoreState>;
    errorHandler?: (error: unknown, args: any) => Partial<StoreState>;
};

// Optimistic media controller for Winamp
export class OptimisticMediaController {
    // Timestamp-based state conflict resolution
    // Prevents polling from overwriting recent optimistic updates
    private optimisticUpdateTimestamps = new Map<keyof StoreState, number>();
    private optimisticExpectedValues = new Map<keyof StoreState, any>();

    constructor(
        private client: WinampClient,
        private actionRegistry: Record<string, WinampMediaAction>,
        private stateUpdater: (update: Partial<StoreState>, isOptimistic?: boolean) => void,
        private getCurrentState: () => StoreState
    ) { }

    // Execute media action with optimistic update
    public async executeMediaAction(endpoint: string, args: any): Promise<any> {
        const action = this.actionRegistry[endpoint];
        if (!action) {
            throw new Error(`Unknown endpoint: ${endpoint}`);
        }

        // Apply optimistic update with timestamp tracking
        const optimisticState = action.optimisticUpdate(args);
        this.applyOptimisticUpdate(optimisticState);

        try {
            const result = await action.clientMethod(this.client, args);
            debugLog("OptimisticMediaController", `${endpoint} completed successfully`);
            return result;
        } catch (error) {
            debugError("OptimisticMediaController", `Failed to execute ${endpoint}:`, error);

            if (action.errorHandler) {
                const errorState = action.errorHandler(error, args);
                this.stateUpdater(errorState);
            }

            throw error;
        }
    }

    // Apply optimistic update with timestamp tracking
    private applyOptimisticUpdate(stateUpdate: Partial<StoreState>) {
        const timestamp = Date.now();
        Object.entries(stateUpdate).forEach(([key, value]) => {
            const stateKey = key as keyof StoreState;
            this.optimisticUpdateTimestamps.set(stateKey, timestamp);
            this.optimisticExpectedValues.set(stateKey, value);
        });

        this.stateUpdater(stateUpdate, true);
    }

    // Get filtered polling update without applying it
    public getFilteredPollingUpdate(pollingState: Partial<StoreState>, pollInitiatedAt: number): Partial<StoreState> {
        const filteredUpdate: Partial<StoreState> = {};

        Object.entries(pollingState).forEach(([key, value]) => {
            const stateKey = key as keyof StoreState;
            const optimisticTimestamp = this.optimisticUpdateTimestamps.get(stateKey);
            const expectedValue = this.optimisticExpectedValues.get(stateKey);

            if (!optimisticTimestamp || optimisticTimestamp < pollInitiatedAt) {
                // No optimistic update or optimistic update is older than poll - safe to update
                (filteredUpdate as any)[key] = value;
            } else {
                // Check if polling confirms our optimistic update
                if (expectedValue !== undefined && this.valuesMatch(value, expectedValue)) {
                    // Server confirmed our optimistic update - allow update
                    (filteredUpdate as any)[key] = value;
                }
            }
        });

        return filteredUpdate;
    }

    // Apply polling updates with timestamp-based conflict resolution
    public applyPollingUpdate(pollingState: Partial<StoreState>, pollInitiatedAt: number): Partial<StoreState> {
        const filteredUpdate: Partial<StoreState> = {};

        Object.entries(pollingState).forEach(([key, value]) => {
            const stateKey = key as keyof StoreState;
            const optimisticTimestamp = this.optimisticUpdateTimestamps.get(stateKey);
            const expectedValue = this.optimisticExpectedValues.get(stateKey);

            if (!optimisticTimestamp || optimisticTimestamp < pollInitiatedAt) {
                // No optimistic update or optimistic update is older than poll - safe to update
                if (optimisticTimestamp) {
                    this.optimisticUpdateTimestamps.delete(stateKey);
                    this.optimisticExpectedValues.delete(stateKey);
                }
                (filteredUpdate as any)[key] = value;
            } else {
                // Check if polling confirms our optimistic update
                if (expectedValue !== undefined && this.valuesMatch(value, expectedValue)) {
                    // Server confirmed our optimistic update - clear timestamps and allow update
                    this.optimisticUpdateTimestamps.delete(stateKey);
                    this.optimisticExpectedValues.delete(stateKey);
                    (filteredUpdate as any)[key] = value;
                    debugLog("OptimisticMediaController", `Server confirmed optimistic update for '${key}': ${JSON.stringify(value)}`);
                } else {
                    // Optimistic update is newer than poll and not confirmed - skip this key
                    debugLog("OptimisticMediaController", `Skipping polling update for '${key}' due to recent optimistic update`);
                }
            }
        });

        return filteredUpdate;
    }

    // Compare values for optimistic update confirmation
    private valuesMatch(a: any, b: any): boolean {
        if (a === null && b === null) return true;
        if (a === undefined && b === undefined) return true;
        if (a === null || b === null || a === undefined || b === undefined) return false;

        if (typeof a !== "object" || typeof b !== "object") {
            return a === b;
        }

        return JSON.stringify(a) === JSON.stringify(b);
    }

    // Clear expired optimistic timestamps
    public clearExpiredOptimisticTimestamps(maxAge = 5000): void {
        const now = Date.now();
        const expiredKeys: (keyof StoreState)[] = [];

        this.optimisticUpdateTimestamps.forEach((timestamp, key) => {
            if (now - timestamp > maxAge) {
                expiredKeys.push(key);
            }
        });

        expiredKeys.forEach(key => {
            this.optimisticUpdateTimestamps.delete(key);
            this.optimisticExpectedValues.delete(key);
        });

        if (expiredKeys.length > 0) {
            debugLog("OptimisticMediaController", `Cleared ${expiredKeys.length} expired optimistic timestamps`);
        }
    }

    // Get current optimistic update state (for debugging)
    public getOptimisticUpdateState(): Record<string, { timestamp: number; age: number; expectedValue: any; }> {
        const now = Date.now();
        const result: Record<string, { timestamp: number; age: number; expectedValue: any; }> = {};

        this.optimisticUpdateTimestamps.forEach((timestamp, key) => {
            result[String(key)] = {
                timestamp,
                age: now - timestamp,
                expectedValue: this.optimisticExpectedValues.get(key)
            };
        });

        return result;
    }
}
