/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RestAPI } from "@webpack/common";
import { User } from "discord-types/general";

import style from "./index.css?managed";

const settings = definePluginSettings({
    animate: {
        description: "Animate banners",
        type: OptionType.BOOLEAN,
        default: false
    },
});
const data: { [key: string]: string | null; } = {};

let enabled = false;

async function refreshVisibleMembers() {
    // TODO - move away from dom query
    for await (const elem of document.querySelectorAll(
        'div[role="listitem"][class*="member"]'
    )) {
        const rect = elem.getBoundingClientRect();

        if (
            !(
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <=
                (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <=
                (window.innerWidth || document.documentElement.clientWidth)
            )
        )
            continue;

        const avatar = (
            elem.querySelector('img[class*="avatar"]') as any
        ).src.split("/");

        let memberId = "";
        if (avatar[3] === "avatars") memberId = avatar[4];
        else if (avatar[3] === "guilds") memberId = avatar[6];
        else continue;

        if (data[memberId]) continue;

        let res: any;
        try {
            res = (await RestAPI.get({
                url: `/users/${memberId}`,
            })) as { body: { banner: string; }; };
        } catch (e: any) {
            if (e.status === 429) {
                await new Promise(r => setTimeout(r, e.body.retry_after * 2000));
                continue;
            }
        }

        const { banner } = res.body;

        if (!banner) {
            data[memberId] = null;
            continue;
        }

        data[
            memberId
        ] = `https://cdn.discordapp.com/banners/${memberId}/${banner}.${banner.startsWith("a_") ? "gif" : "png"
        }?size=4096`;

        // Trigger a rerender via hovering
        elem.dispatchEvent(
            new MouseEvent("mouseover", {
                bubbles: true,
                cancelable: true,
                view: window,
            })
        );

        // Please dont ratelimit us :pleadey:
        await new Promise(r => setTimeout(r, 1000));
    }
    if (enabled) {
        setTimeout(refreshVisibleMembers, 1000);
    }
}

export default definePlugin({
    name: "BannersEverywhere",
    description: "Displays nitro and USRBG banners in the member list",
    authors: [Devs.ImLvna, Devs.AutumnVN],
    settings,
    patches: [
        {
            find: "lostPermissionTooltipText",
            replacement:
            {
                // We add the banner as a property while we can still access the user id
                match: /((\i)=\i\.user.+)(,avatar:function)/,
                replace: "$1,banner:$self.memberListBannerHook($2)$3",
            },
        },
        {
            find: "apply(this,arguments)).handleKeyPress",
            replacement:
            {
                // We cant access the user id here, so we take the banner property we set earlier
                match: /(renderInner=function.+\i=)(\i)\.children/,
                replace: "$1[$2.banner, $2.children]",
            }
        }

    ],

    start() {
        enableStyle(style);
        enabled = true;
        refreshVisibleMembers();
    },

    stop() {
        enabled = false;
        disableStyle(style);
    },

    memberListBannerHook(user: User) {
        let url = this.getBanner(user.id);
        if (url === "") return;
        if (!settings.store.animate) url = url.replace(".gif", ".png");

        return (
            <img src={url} className="vc-banners-everywhere-memberlist"></img>
        );
    },

    getBanner(userId: string): string {
        if (data[userId]) return data[userId] as string;
        if (Vencord.Plugins.isPluginEnabled("USRBG") && (Vencord.Plugins.plugins.USRBG as any).data[userId]) {
            data[userId] = (Vencord.Plugins.plugins.USRBG as any).data[userId];
            return data[userId] as string;
        }
        return "";
    },
});
