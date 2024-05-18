/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Alerts, Menu } from "@webpack/common";
import { Message } from "discord-types/general";

const DOUBLECOUNTER_APP_ID = "703886990948565003";
const VERIFICATION_LINK_REGEX = /https:\/\/verify.doublecounter.gg\/v\/[0-9a-z]{8,16}/g;

const patchMessageContextMenu: NavContextMenuPatchCallback = (children, { message }) => {
    const { components } = message;

    if (message.author.id === DOUBLECOUNTER_APP_ID && components?.length === 0 && message.embeds?.map(embed => embed)[0].fields.length === 4) {
        children.push((
            <Menu.MenuItem
                id="ml-dcvp"
                key="ml-dcvp-verify"
                label="Bypass Double Counter"
                color="brand"
                action={() => {
                    const regex_link = VERIFICATION_LINK_REGEX.exec(message.embeds.map(embed => embed.fields.map(field => field))[0][1].rawValue);
                    if (regex_link) {
                        verify(regex_link[0]).then(() => {
                            Alerts.show({
                                title: "Verified",
                                body: "You have been verified successfully, please wait a little bit for DoubleCounter to update your roles.",
                                confirmText: "Okay",
                            });
                        });
                    } else {
                        Alerts.show({
                            title: "Link not found",
                            body: "The link has not been found in this message.",
                            confirmText: "Okay"
                        });
                    }
                }}
            />
        ));
    }
};

async function verify(link) {
    try {
        const res = await fetch(link);
        console.log(res.ok);
    } catch { }
}

export default definePlugin({
    name: "DoubleCounterBypass",
    description: "Bypass Double Counter verifications easily.",
    authors: [Devs.nyx],

    contextMenus: {
        "message": patchMessageContextMenu,
    },

    flux: {
        async MESSAGE_CREATE({ message }: { message: Message; }) {
            if (message.author.id !== DOUBLECOUNTER_APP_ID || message.type !== 19 || message.embeds.length === 0) return;

            // @ts-ignore
            const link = VERIFICATION_LINK_REGEX.exec(message.embeds.map(embed => embed.fields.map(field => field))[0][1].value);
            console.log(link);
            await verify(link).then(() => {
                Alerts.show({
                    title: "Verified",
                    body: "You have been verified successfully, please wait a little bit for DoubleCounter to update your roles.",
                    confirmText: "Okay",
                    onConfirm: () => { }
                });
            });
        }
    }
});
