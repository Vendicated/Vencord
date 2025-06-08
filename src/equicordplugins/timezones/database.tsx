/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/index";
import { OAuth2AuthorizeModal, showToast, Toasts } from "@webpack/common";

const databaseTimezones: Record<string, { value: string | null; }> = {};
const DOMAIN = "https://timezone.creations.works";
const REDIRECT_URI = `${DOMAIN}/auth/discord/callback`;
const CLIENT_ID = "1377021506810417173";

export async function setUserDatabaseTimezone(userId: string, timezone: string | null) {
    databaseTimezones[userId] = { value: timezone };
}

export function getTimezone(userId: string): string | null {
    return databaseTimezones[userId]?.value ?? null;
}

export async function loadDatabaseTimezones(): Promise<boolean> {
    try {
        const res = await fetch(`${DOMAIN}/list`, {
            headers: { Accept: "application/json" }
        });
        if (res.ok) {
            const json = await res.json();
            for (const id in json) {
                databaseTimezones[id] = {
                    value: json[id]?.timezone ?? null
                };
            }
            return true;
        }
        return false;
    } catch (e) {
        console.error("Failed to fetch timezones list:", e);
        return false;
    }
}

async function checkAuthentication(): Promise<boolean> {
    try {
        const res = await fetch(`${DOMAIN}/me`, {
            credentials: "include",
            headers: { Accept: "application/json" }
        });
        return res.ok;
    } catch (e) {
        console.error("Failed to check authentication:", e);
        return false;
    }
}

export async function setTimezone(timezone: string): Promise<boolean> {
    const isAuthenticated = await checkAuthentication();

    if (!isAuthenticated) {
        return new Promise(resolve => {
            authModal(() => {
                setTimezoneInternal(timezone).then(resolve);
            });
        });
    }

    return setTimezoneInternal(timezone);
}

async function setTimezoneInternal(timezone: string): Promise<boolean> {
    const formData = new URLSearchParams();
    formData.append("timezone", timezone);

    try {
        const res = await fetch(`${DOMAIN}/set`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json"
            },
            credentials: "include",
            body: formData
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: "Unknown error" }));
            showToast(error.message || "Failed to set timezone", Toasts.Type.FAILURE);
            return false;
        }

        showToast("Timezone updated successfully!", Toasts.Type.SUCCESS);
        return true;
    } catch (e) {
        console.error("Error setting timezone:", e);
        showToast("Failed to set timezone", Toasts.Type.FAILURE);
        return false;
    }
}

export async function deleteTimezone(): Promise<boolean> {
    const isAuthenticated = await checkAuthentication();

    if (!isAuthenticated) {
        showToast("You must be logged in to delete your timezone", Toasts.Type.FAILURE);
        return false;
    }

    try {
        const res = await fetch(`${DOMAIN}/delete`, {
            method: "DELETE",
            headers: {
                Accept: "application/json"
            },
            credentials: "include"
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: "Unknown error" }));
            showToast(error.message || "Failed to delete timezone", Toasts.Type.FAILURE);
            return false;
        }

        showToast("Timezone deleted successfully!", Toasts.Type.SUCCESS);
        return true;
    } catch (e) {
        console.error("Error deleting timezone:", e);
        showToast("Failed to delete timezone", Toasts.Type.FAILURE);
        return false;
    }
}

export function authModal(callback?: () => void) {
    openModal(modalProps => (
        <OAuth2AuthorizeModal
            {...modalProps}
            clientId={CLIENT_ID}
            redirectUri={REDIRECT_URI}
            responseType="code"
            scopes={["identify"]}
            permissions={0n}
            cancelCompletesFlow={false}
            callback={async (res: any) => {
                if (!res || !res.location) return;
                try {
                    const url = new URL(res.location);
                    const r = await fetch(url, {
                        credentials: "include",
                        headers: { Accept: "application/json" }
                    });
                    const json = await r.json();
                    if (!r.ok) {
                        showToast(json.message ?? "Authorization failed", Toasts.Type.FAILURE);
                        return;
                    }
                    showToast("Authorization successful!", Toasts.Type.SUCCESS);
                    callback?.();
                } catch (e) {
                    console.error("Error during authorization:", e);
                    showToast("Unexpected error during authorization", Toasts.Type.FAILURE);
                }
            }}
        />
    ));
}
