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

import { openModal } from "../../../utils/modal";
import { Settings } from "../../../Vencord";
import { findByProps } from "../../../webpack";
import { FluxDispatcher, React, SelectedChannelStore, Toasts, UserUtils } from "../../../webpack/common";

export async function openUserProfileModal(userId) {
    await UserUtils.fetchUser(userId);
    return FluxDispatcher.dispatch({
        type: "USER_PROFILE_MODAL_OPEN",
        userId,
        channelId: SelectedChannelStore.getChannelId(),
        analyticsLocation: "Explosive Hotel"
    });

}

export function authorize(callback?: any) {
    const settings = Settings.plugins.ReviewDB;
    const { getOAuth2AuthorizeProps } = findByProps("openOAuth2Modal");
    const { OAuth2AuthorizeModal } = findByProps("OAuth2AuthorizeModal");

    const opts = getOAuth2AuthorizeProps("https://discord.com/api/oauth2/authorize?client_id=915703782174752809&redirect_uri=https%3A%2F%2Fmanti.vendicated.dev%2FURauth&response_type=code&scope=identify");

    openModal((props: any) =>
        React.createElement(OAuth2AuthorizeModal, {
            ...props,
            ...opts,
            responseType: "code",
            cancelCompletesFlow: false,
            callback: (c: any) => {
                try {
                    const url = new URL(c);
                    fetch(url + "&returnType=json&clientMod=vencord")
                        .then(res => {
                            res.json().then(res => {
                                if (res.status === 0) {
                                    settings.set("token", res.token);
                                    showToast("Successfully logged in!");
                                    callback?.();
                                } else if (res.status === 1) {
                                    showToast("An Error Occured while logging in.");
                                }
                            });
                        });
                } catch (e) {
                    console.log(e);
                }
            }
        })
    );
}

export function showToast(text: string) {
    Toasts.show({
        message: text, options: { position: 1 },
        id: "",
        type: 0
    });
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

