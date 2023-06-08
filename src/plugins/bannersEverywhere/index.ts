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

import { definePluginSettings } from "@api/Settings";
import { enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, Plugin } from "@utils/types";
import { RestAPI } from "@webpack/common";

import Plugins from "~plugins";

import style from "./index.css?managed";

interface USRBG extends Plugin {
    data: Record<string, string>;
    nitroData: Record<string, string>;
    addNitroData: (userId: string, banner: string) => void;
}

const settings = definePluginSettings({
    nitroFirst: {
        description: "Banner to use if both Nitro and USRBG banners are present",
        type: OptionType.SELECT,
        options: [
            { label: "Nitro banner", value: true, default: true },
            { label: "USRBG banner", value: false },
        ]
    },
    voiceBackground: {
        description: "Use banners as voice chat backgrounds",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    memberListBackground: {
        description: "Show banners in the members list",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    autoLoad: {
        description: "Automatically load banners for visible members",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
        onChange: (value: boolean) => {
            if (value) {
                window.plugins.bannersEverywhere.timeout = window.setInterval(refreshVisibleMembers, 1000);
            } else {
                window.clearInterval(window.plugins.bannersEverywhere.timeout);
            }
        }
    },
    usrbg: {
        description: "Use USRBG banners",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

const membersWithoutBanners: string[] = [];

async function refreshVisibleMembers() {

    const usrbg = Plugins.USRBG as USRBG;

    for await (const elem of document.querySelectorAll('div[role="listitem"][class*="member"]')) {

        const rect = elem.getBoundingClientRect();


        if (
            !(rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth))
        ) continue;


        const avatar = (elem.querySelector('img[class*="avatar"]') as any).src.split("/");

        let memberId = "";
        if (avatar[3] === "avatars") memberId = avatar[4];
        else if (avatar[3] === "guilds") memberId = avatar[6];
        else continue;

        if (usrbg.nitroData[memberId]) continue;
        if (membersWithoutBanners.includes(memberId)) continue;

        let res: any;
        try {
            res = await RestAPI.get({
                url: `/users/${memberId}`
            }) as { body: { banner: string; }; };
        } catch (e: any) {
            if (e.status === 429) {
                await new Promise(r => setTimeout(r, e.body.retry_after * 1000));
                continue;
            }
        }

        const { banner } = res.body;




        if (!banner) {
            membersWithoutBanners.push(memberId);
            continue;
        }

        usrbg.nitroData[memberId] = `https://cdn.discordapp.com/banners/${memberId}/${banner}.${banner.startsWith("a_") ? "gif" : "png"}?size=4096`;


        // Trigger a rerender via hovering
        elem.dispatchEvent(new MouseEvent("mouseover", {
            bubbles: true,
            cancelable: true,
            view: window
        }));

        // Please dont ratelimit us :pleadey:
        await new Promise(r => setTimeout(r, 1000));
    }
    if (settings.store.autoLoad) {
        setTimeout(refreshVisibleMembers, 100);
    }
}

export default definePlugin({
    name: "Banners Everywhere",
    description: "Displays banners in the member list and voice chat",
    authors: [Devs.AutumnVN, Devs.pylix, Devs.TheKodeToad, Devs.ImLvna],
    settings,
    dependencies: ["USRBG"],
    toolboxActions: {
        "Load Visible Avatars": refreshVisibleMembers
    },
    patches: [
        {
            find: "\"data-selenium-video-tile\":",
            predicate: () => settings.store.voiceBackground,
            replacement: [
                {
                    match: /(\i)\.style,/,
                    replace: "$self.voiceBackgroundHook($1),"
                }
            ]
        },
        {
            find: "[\"aria-selected\"])",
            predicate: () => settings.store.memberListBackground,
            replacement: [
                {
                    match: /(forwardRef\(\(function\((\i)(.+?"listitem",))(innerRef)/,
                    replace: "$1style:$self.memberListBannerHook($2),$4"
                }
            ]
        }
    ],

    start() {
        enableStyle(style);
        if (settings.store.autoLoad) {
            refreshVisibleMembers();
        }
    },


    memberListBannerHook(props: any) {
        const userId = props.avatar._owner.pendingProps.user.id;
        const url = this.getBanner(userId);
        if (url === "") return;
        return {
            "--mlbg": `url("${url}")`
        };
    },

    voiceBackgroundHook({ className, participantUserId }: any) {
        const url = this.getBanner(participantUserId);
        if (url === "" || !className.includes("tile-")) return;
        return {
            backgroundImage: `url(${url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
        };
    },

    getBanner(userId: string) {
        const usrbg = Plugins.USRBG as USRBG;
        let url = "";
        if (settings.store.usrbg) {
            if (usrbg.data[userId]) url = usrbg.data[userId];
        }
        if (settings.store.nitroFirst) {
            if (usrbg.nitroData[userId]) url = usrbg.nitroData[userId];
        } else if (url === "" && usrbg.nitroData[userId]) url = usrbg.nitroData[userId];
        return url;
    }
});
