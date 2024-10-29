/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { Logger } from "@utils/Logger";
import { ModalProps, openModal } from "@utils/modal";
import { OAuth2AuthorizeModal, showToast, Toasts, UserStore } from "@webpack/common";

import { API_URL, getCurrentToken, verifyLogin } from "../api";
import settings from "../settings";

const REDIRECT_URI: string = `${API_URL}/auth`;
const CLIENT_ID: string = "922650528821940224";
const SCOPES: string[] = ["identify"];

export async function openTimezoneDBAuthModal() {
    const token = getCurrentToken();
    if (token && await verifyLogin(token)) return; // TODO: open set current user modal

    openModal(modalProps => <>
        <ErrorBoundary>
            <TimezoneDBAuthModal {...modalProps} />
        </ErrorBoundary>
    </>);
}

function TimezoneDBAuthModal(modalProps: ModalProps): JSX.Element {
    return <OAuth2AuthorizeModal
        {...modalProps}
        scopes={SCOPES}
        responseType="code"
        redirectUri={REDIRECT_URI}
        permissions={0n}
        clientId={CLIENT_ID}
        cancelCompletesFlow={false}
        callback={async (response: { location: string }) => {
            try {
                const res = await fetch(response.location, {
                    redirect: "manual",
                    headers: {
                        "Content-Type": VENCORD_USER_AGENT,
                    },
                });

                const { token } = await res.json() as { token: string };

                if (!await verifyLogin(token)) {
                    throw "Returned token was invalid!";
                }

                settings.store.tokens = {
                    [UserStore.getCurrentUser().id]: token,
                    ...settings.store.tokens,
                };

                showToast("Successfully connected to TimezoneDB!", Toasts.Type.SUCCESS);
            } catch (e) {
                showToast("Failed to authorize TimezoneDB!", Toasts.Type.FAILURE);
                new Logger("Timezones").error("Failed to authorize TimezoneDB", e);
            }
        }}
    />;
}
