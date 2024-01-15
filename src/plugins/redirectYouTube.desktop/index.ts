/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "RedirectYouTube",
    description: "Replace all YouTube embeds with an embed from an third-party YouTube frontend, such as Invidious or Piped.",
    authors: [Devs.katlyn],
    settings: definePluginSettings({
        instances: {
            type: OptionType.STRING,
            description: "A comma-separated list of alternate YouTube frontends (including protocol such as https). If multiple frontends are specified, one will be chosen at random.",
            restartNeeded: true,
            default: "https://invidious.fdn.fr/, https://vid.puffyan.us/, https://invidious.nerdvpn.de/, https://invidious.projectsegfau.lt/, https://invidious.flokinet.to/"
        }
    }),
    patches: [{
        find: "case\"YouTube\":",
        replacement: {
            match: /(let{src:\i,autoMute:\i.{10,200}src:)(\i)/,
            replace: "$1 $self.rewriteUrl($2)"
        }
    }],
    getRandomInstance() {
        const instances = this.settings.store.instances.split(",").map(s => new URL(s.trim()).origin);
        return instances[Math.floor(Math.random() * instances.length)];
    },
    rewriteUrl(url: string) {
        return url.replace(/^https:\/\/www.youtube.com/, this.getRandomInstance());
    }
});
