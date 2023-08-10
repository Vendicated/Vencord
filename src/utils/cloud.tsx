/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { findByProps } from "@webpack";
import { UserStore } from "@webpack/common";

import { Logger } from "./Logger";
import { openModal } from "./modal";

export const cloudLogger = new Logger("Cloud", "#39b7e0");
export const getCloudUrl = () => new URL(Settings.cloud.url);

const cloudUrlOrigin = () => getCloudUrl().origin;
const getUserId = () => {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) throw new Error("User not yet logged in");
    return id;
};

export async function getAuthorization() {
    const secrets = await DataStore.get<Record<string, string>>("Vencord_cloudSecret") ?? {};

    const origin = cloudUrlOrigin();

    // we need to migrate from the old format here
    if (secrets[origin]) {
        await DataStore.update<Record<string, string>>("Vencord_cloudSecret", secrets => {
            secrets ??= {};
            // use the current user ID
            secrets[`${origin}:${getUserId()}`] = secrets[origin];
            delete secrets[origin];
            return secrets;
        });

        // since this doesn't update the original object, we'll early return the existing authorization
        return secrets[origin];
    }

    return secrets[`${origin}:${getUserId()}`];
}

async function setAuthorization(secret: string) {
    await DataStore.update<Record<string, string>>("Vencord_cloudSecret", secrets => {
        secrets ??= {};
        secrets[`${cloudUrlOrigin()}:${getUserId()}`] = secret;
        return secrets;
    });
}

export async function deauthorizeCloud() {
    await DataStore.update<Record<string, string>>("Vencord_cloudSecret", secrets => {
        secrets ??= {};
        delete secrets[`${cloudUrlOrigin()}:${getUserId()}`];
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
        callback={async ({ location }: any) => {
            if (!location) {
                Settings.cloud.authenticated = false;
                return;
            }

            try {
                const res = await fetch(location, {
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
    const secret = await getAuthorization();

    return window.btoa(`${secret}:${getUserId()}`);
}
