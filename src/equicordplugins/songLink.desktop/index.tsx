/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 nin0
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";

import Providers from "./Providers";
import { Settings } from "./Settings";
import SongLinker from "./SongLinker";

export const settings = definePluginSettings({
    servicesSettings: {
        type: OptionType.CUSTOM,
        description: "settings for services",
        default: Object.fromEntries(Object.entries(Providers).map(([name, data]) => [name, {
            enabled: true,
            // @ts-ignore
            openInNative: data.native || false
        }]))
    },
    userCountry: {
        type: OptionType.STRING,
        description: "Country used for lookup (Two letter country code)",
        default: "US"
    },
    servicesComponent: {
        type: OptionType.COMPONENT,
        component: () => <Settings />
    }
});

export type SongLinkResult = {
    info?: {
        title: string;
        artist: string;
    };
    links: {
        [platform: string]: {
            url: string;
            nativeUri?: string;
        };
    };
};

export const Native = VencordNative.pluginHelpers.SongLink as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "SongLink",
    description: "Adds streaming service buttons below song links",
    authors: [Devs.nin0dev],
    settings,
    Providers,
    cache: ({} as Record<string, SongLinkResult>),
    addToCache(link, data: SongLinkResult) {
        this.cache[link] = data;
    },
    renderMessageAccessory(props: Record<string, any>) {
        const { content }: {
            content: string;
        } = props.message;
        if (!content) return;

        const regexes = [
            /https:\/\/(?:open|play)\.spotify\.com\/track\/[a-zA-Z0-9]+/, // spotify
            /https:\/\/(music|itunes)\.apple\.com\/[a-z]{2}\/album\/\S+/, // apple music/itunes
            /https:\/\/music\.youtube\.com\/watch\?v=[0-9A-Za-z_-]+/, // yt music
            /https:\/\/tidal\.com\/track\/[0-9]+\/u/ // tidal
        ];
        const musicLinks = content.match(new RegExp(regexes.map(r => r.source).join("|"), "g"));
        if (!musicLinks?.length) return;

        return <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "7px"
        }}>
            {
                musicLinks.map(item => <SongLinker key={item} url={item} />)
            }
        </div>;
    }
});
