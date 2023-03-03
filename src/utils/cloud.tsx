/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { Settings } from "@api/settings";
import { findByProps } from "@webpack";
import { UserStore } from "@webpack/common";

import Logger from "./Logger";
import { openModal } from "./modal";

export const cloudLogger = new Logger("Cloud", "#39b7e0");
export const cloudUrl = () => new URL(Settings.backend.url);

export async function cloudConfigured() {
    return await DataStore.get("Vencord_cloudSecret") !== undefined && Settings.backend.enabled;
}

export async function authorizeCloud() {
    if (await DataStore.get("Vencord_cloudSecret") !== undefined) {
        Settings.backend.enabled = true;
        return;
    }

    try {
        const oauthConfiguration = await fetch(new URL("/api/v1/oauth/settings", cloudUrl()));
        var { clientId, redirectUri } = await oauthConfiguration.json();
    } catch {
        showNotification({
            title: "Cloud Integration",
            body: "Setup failed (couldn't retrieve OAuth configuration)."
        });
        Settings.backend.enabled = false;
        return;
    }

    const { OAuth2AuthorizeModal } = findByProps("OAuth2AuthorizeModal");

    openModal((props: any) => <OAuth2AuthorizeModal
        {...props}
        scopes={["identify"]}
        responseType="code"
        redirectUri={redirectUri}
        permissions={0n}
        clientId={clientId}
        cancelCompletesFlow={false}
        callback={async (callbackUrl: string) => {
            if (!callbackUrl) {
                Settings.backend.enabled = false;
                return;
            }

            try {
                const res = await fetch(callbackUrl, {
                    headers: new Headers({ Accept: "application/json" })
                });
                const { secret } = await res.json();
                if (secret) {
                    cloudLogger.info("Authorized with secret");
                    await DataStore.set("Vencord_cloudSecret", secret);
                    showNotification({
                        title: "Cloud Integration",
                        body: "Cloud integrations enabled!"
                    });
                    Settings.backend.enabled = true;
                } else {
                    showNotification({
                        title: "Cloud Integration",
                        body: "Setup failed (no secret returned?)."
                    });
                    Settings.backend.enabled = false;
                }
            } catch (e: any) {
                cloudLogger.error("Failed to authorize", e);
                showNotification({
                    title: "Cloud Integration",
                    body: `Setup failed (${e.toString()}).`
                });
                Settings.backend.enabled = false;
            }
        }
        }
    />);
}

export async function deauthorizeCloud() {
    await DataStore.del("Vencord_cloudSecret");
}

export async function getCloudAuth() {
    const userId = UserStore.getCurrentUser().id;
    const secret = await DataStore.get("Vencord_cloudSecret");

    return window.btoa(`${userId}:${secret}`);
}
