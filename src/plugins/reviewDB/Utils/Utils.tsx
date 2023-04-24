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

import { Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import { openModal } from "@utils/modal";
import { findByProps } from "@webpack";
import { FluxDispatcher, React, SelectedChannelStore, Toasts, UserUtils } from "@webpack/common";

import { Review } from "../entities/Review";

export async function openUserProfileModal(userId: string) {
    await UserUtils.fetchUser(userId);

    await FluxDispatcher.dispatch({
        type: "USER_PROFILE_MODAL_OPEN",
        userId,
        channelId: SelectedChannelStore.getChannelId(),
        analyticsLocation: "Explosive Hotel"
    });
}

export function authorize(callback?: any) {
    const { OAuth2AuthorizeModal } = findByProps("OAuth2AuthorizeModal");

    openModal((props: any) =>
        <OAuth2AuthorizeModal
            {...props}
            scopes={["identify"]}
            responseType="code"
            redirectUri="https://manti.vendicated.dev/URauth"
            permissions={0n}
            clientId="915703782174752809"
            cancelCompletesFlow={false}
            callback={async (u: string) => {
                try {
                    const url = new URL(u);
                    url.searchParams.append("returnType", "json");
                    url.searchParams.append("clientMod", "vencord");
                    const res = await fetch(url, {
                        headers: new Headers({ Accept: "application/json" })
                    });
                    const { token, status } = await res.json();
                    if (status === 0) {
                        Settings.plugins.ReviewDB.token = token;
                        showToast("Successfully logged in!");
                        callback?.();
                    } else if (res.status === 1) {
                        showToast("An Error occurred while logging in.");
                    }
                } catch (e) {
                    new Logger("ReviewDB").error("Failed to authorise", e);
                }
            }}
        />
    );
}

export function showToast(text: string) {
    Toasts.show({
        type: Toasts.Type.MESSAGE,
        message: text,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        },
    });
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function canDeleteReview(review: Review, userId: string) {
    if (review.sender.discordID === userId) return true;

    const myId = BigInt(userId);
    return myId === Devs.mantikafasi.id ||
        myId === Devs.Ven.id ||
        myId === Devs.rushii.id;
}
