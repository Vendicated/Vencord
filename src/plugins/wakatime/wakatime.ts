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

export interface WakatimeHeartbeat {
    entity: string;
    type: "app" | "file" | "domain";
    category?: "coding" | "debugging" | "building" | "indexing" | "browsing" | "communicating" | "designing" | "understanding" | "documenting" | "testing" | "learning";
    language?: string;
    time: number;
    is_write?: boolean;
    editor?: string;
    plugin?: string;
}

export interface WakatimeResponse {
    data?: any;
    errors?: string[];
}

export class WakatimeAPI {
    private apiKey: string;
    private baseUrl = "https://api.wakatime.com/api/v1";
    private userAgent = "Vencord-Wakatime/1.0.0";
    private debugMode: boolean;
    private isTracking = false;
    private lastHeartbeatAt = 0;

    constructor(apiKey: string, debugMode = false) {
        this.apiKey = apiKey;
        this.debugMode = debugMode;
        this.isTracking = true;
        if (debugMode) {
            console.log("[Wakatime API] Initialized with tracking enabled");
        }
    }

    updateApiKey(apiKey: string) {
        this.apiKey = apiKey;
        if (this.debugMode) {
            console.log("[Wakatime API] API key updated");
        }
    }

    startTracking() {
        this.isTracking = true;
        if (this.debugMode) {
            console.log("[Wakatime API] Tracking started");
        }
    }

    stopTracking() {
        this.isTracking = false;
        if (this.debugMode) {
            console.log("[Wakatime API] Tracking stopped");
        }
    }

    // Check if enough time has passed since last heartbeat (2 minutes)
    enoughTimePassed(): boolean {
        return this.lastHeartbeatAt + 120000 < Date.now();
    }

    async sendHeartbeat(heartbeat: WakatimeHeartbeat): Promise<WakatimeResponse> {
        // Check if tracking is disabled
        if (!this.isTracking) {
            if (this.debugMode) {
                console.log("[Wakatime API] Tracking disabled, skipping heartbeat");
            }
            return {};
        }

        // Check if API key is missing
        if (!this.apiKey) {
            console.error("[Wakatime API] No API key provided");
            return { errors: ["No API key provided"] };
        }

        // Check if enough time has passed since last heartbeat
        if (!this.enoughTimePassed()) {
            if (this.debugMode) {
                console.log("[Wakatime API] Not enough time passed since last heartbeat, skipping");
            }
            return {};
        }

        // Update last heartbeat time
        this.lastHeartbeatAt = Date.now();

        const url = `${this.baseUrl}/users/current/heartbeats`;

        // For Basic Auth, the API key must be base64 encoded
        const encodedKey = btoa(this.apiKey);

        // Create headers
        const headers: Record<string, string> = {
            "Authorization": `Basic ${encodedKey}`,
            "Content-Type": "application/json",
            "User-Agent": this.userAgent
        };

        const body = JSON.stringify(heartbeat);

        try {
            if (this.debugMode) {
                console.log("[Wakatime API] Sending heartbeat:", heartbeat);
            }

            const response = await fetch(url, {
                method: "POST",
                headers,
                body
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Wakatime API] HTTP ${response.status}: ${errorText}`);
                return { errors: [`HTTP ${response.status}: ${errorText}`] };
            }

            const data = await response.json();

            if (this.debugMode) {
                console.log("[Wakatime API] Response:", data);
            }

            return { data };

        } catch (error) {
            console.error("[Wakatime API] Network error:", error);
            return { errors: [error instanceof Error ? error.message : "Unknown network error"] };
        }
    }

    async validateApiKey(): Promise<boolean> {
        if (!this.apiKey) {
            return false;
        }

        const url = `${this.baseUrl}/users/current`;
        const encodedKey = btoa(this.apiKey);
        const headers = {
            "Authorization": `Basic ${encodedKey}`,
            "User-Agent": this.userAgent
        };

        try {
            const response = await fetch(url, {
                method: "GET",
                headers
            });

            const isValid = response.ok;

            if (this.debugMode) {
                console.log(`[Wakatime API] API key validation: ${isValid ? "valid" : "invalid"}`);
            }

            return isValid;

        } catch (error) {
            console.error("[Wakatime API] Error validating API key:", error);
            return false;
        }
    }

    // Utility method to create a heartbeat object
    static createHeartbeat(entity: string, options: Partial<WakatimeHeartbeat> = {}): WakatimeHeartbeat {
        return {
            entity,
            type: "app",
            editor: "Discord",
            category: "communicating",
            time: Date.now() / 1000,
            is_write: false,
            ...options
        };
    }
}
