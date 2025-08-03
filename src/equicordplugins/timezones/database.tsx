/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/index";
import { OAuth2AuthorizeModal, showToast, Toasts } from "@webpack/common";

import { settings } from ".";

const databaseTimezones: Record<string, { value: string | null; }> = {};
const CLIENT_ID = "1377021506810417173";

function getDomain(): string {
    return settings.store.databaseUrl || "https://timezone.creations.works";
}

function getRedirectUri(): string {
    return `${getDomain()}/auth/discord/callback`;
}

function handleApiError(error: any, defaultMessage: string): void {
    console.error(defaultMessage, error);
    const message = error?.message || defaultMessage;
    showToast(message, Toasts.Type.FAILURE);
}

async function safeJsonParse(response: Response): Promise<any> {
    try {
        return await response.json();
    } catch (e) {
        console.warn("Failed to parse JSON response:", e);
        return { message: "Invalid response format" };
    }
}

export async function setUserDatabaseTimezone(userId: string, timezone: string | null) {
    databaseTimezones[userId] = { value: timezone };
}

export function getTimezone(userId: string): string | null {
    return databaseTimezones[userId]?.value ?? null;
}

export async function loadDatabaseTimezones(): Promise<boolean> {
    try {
        const res = await fetch(`${getDomain()}/list`, {
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
        const res = await fetch(`${getDomain()}/me`, {
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
        const res = await fetch(`${getDomain()}/set`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json"
            },
            credentials: "include",
            body: formData
        });

        if (!res.ok) {
            const error = await safeJsonParse(res);
            handleApiError(error, "Failed to set timezone");
            return false;
        }

        showToast("Timezone updated successfully!", Toasts.Type.SUCCESS);
        return true;
    } catch (e) {
        handleApiError(e, "Failed to set timezone");
        return false;
    }
}

export async function deleteTimezone(): Promise<boolean> {
    const isAuthenticated = await checkAuthentication();

    if (!isAuthenticated) {
        return new Promise(resolve => {
            authModal(() => {
                deleteTimezoneInternal().then(resolve);
            });
        });
    }

    return deleteTimezoneInternal();
}

async function deleteTimezoneInternal(): Promise<boolean> {
    try {
        const res = await fetch(`${getDomain()}/delete`, {
            method: "DELETE",
            headers: {
                Accept: "application/json"
            },
            credentials: "include"
        });

        if (!res.ok) {
            const error = await safeJsonParse(res);
            handleApiError(error, "Failed to delete timezone");
            return false;
        }

        showToast("Timezone deleted successfully!", Toasts.Type.SUCCESS);
        return true;
    } catch (e) {
        handleApiError(e, "Failed to delete timezone");
        return false;
    }
}

export function authModal(callback?: () => void) {
    openModal(modalProps => (
        <OAuth2AuthorizeModal
            {...modalProps}
            clientId={CLIENT_ID}
            redirectUri={getRedirectUri()}
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
                    const json = await safeJsonParse(r);
                    if (!r.ok) {
                        handleApiError(json, "Authorization failed");
                        return;
                    }
                    showToast("Authorization successful!", Toasts.Type.SUCCESS);
                    callback?.();
                } catch (e) {
                    handleApiError(e, "Unexpected error during authorization");
                }
            }}
        />
    ));
}
