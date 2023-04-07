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
export const getCloudUrl = () => new URL(Settings.cloud.url);

export async function getAuthorization() {
    const secrets = await DataStore.get<Record<string, string>>("Vencord_cloudSecret") ?? {};
    return secrets[getCloudUrl().origin];
}

async function setAuthorization(secret: string) {
    await DataStore.update<Record<string, string>>("Vencord_cloudSecret", secrets => {
        secrets ??= {};
        secrets[getCloudUrl().origin] = secret;
        return secrets;
    });
}

export async function deauthorizeCloud() {
    await DataStore.update<Record<string, string>>("Vencord_cloudSecret", secrets => {
        secrets ??= {};
        delete secrets[getCloudUrl().origin];
        return secrets;
    });
}

export async function authorizeCloud() {
    if (await getAuthorization() !== undefined) {
        Settings.cloud.authenticated = true;
        return;
    }

    try {
        const oauthConfiguration = await fetch(new URL("/v1/oauth/settings", getCloudUrl()));
        var { clientId, redirectUri } = await oauthConfiguration.json();
    } catch {
        showNotification({
            title: "Cloud Integration",
            body: "Setup failed (couldn't retrieve OAuth configuration)."
        });
        Settings.cloud.authenticated = false;
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
                Settings.cloud.authenticated = false;
                return;
            }

            try {
                const res = await fetch(callbackUrl, {
                    headers: new Headers({ Accept: "application/json" })
                });
                const { secret } = await res.json();
                if (secret) {
                    cloudLogger.info("Authorized with secret");
                    await setAuthorization(secret);
                    showNotification({
                        title: "Cloud Integration",
                        body: "Cloud integrations enabled!"
                    });
                    Settings.cloud.authenticated = true;
                } else {
                    showNotification({
                        title: "Cloud Integration",
                        body: "Setup failed (no secret returned?)."
                    });
                    Settings.cloud.authenticated = false;
                }
            } catch (e: any) {
                cloudLogger.error("Failed to authorize", e);
                showNotification({
                    title: "Cloud Integration",
                    body: `Setup failed (${e.toString()}).`
                });
                Settings.cloud.authenticated = false;
            }
        }
        }
    />);
}

export async function getCloudAuth() {
    const userId = UserStore.getCurrentUser().id;
    const secret = await getAuthorization();

    return window.btoa(`${secret}:${userId}`);
}
