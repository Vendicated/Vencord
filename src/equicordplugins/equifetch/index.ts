/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, Argument, CommandContext } from "@api/Commands";
import { gitHash } from "@shared/vencordUserAgent";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { isEquicordPluginDev, isPluginDev } from "@utils/misc";
import definePlugin, { Plugin } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { GuildMemberStore, UserStore } from "@webpack/common";

import { PluginMeta } from "~plugins";

import SettingsPlugin from "../../plugins/_core/settings";

const clientVersion = () => {
    const version = IS_DISCORD_DESKTOP ? DiscordNative.app.getVersion() : IS_VESKTOP ? VesktopNative.app.getVersion() : null;
    // @ts-ignore
    const name = IS_DISCORD_DESKTOP ? "Desktop" : IS_VESKTOP ? "Vesktop" : typeof unsafeWindow !== "undefined" ? "UserScript" : "Web";

    return `${name}${version ? ` v${version}` : ""}`;
};

const lines = `\

 ______
/_____/\\
\\::::_\\/_
 \\:\\/___/\\
  \\::___\\/_
   \\:\\____/\\
    \\_____\\/


   ______
  /_____/\\
  \\:::_ \\ \\
   \\:\\ \\ \\ \\_
    \\:\\ \\ /_ \\
     \\:\\_-  \\ \\
      \\___|\\_\\_/\
`.split("\n");
const sanitised = `\

 ______
/_____/\\
\\::::_\\/_
 \\:\\/___/\\
  \\::___\\/_
   \\:\\____/\\
    \\_____\\/


   ______
  /_____/\\
  \\:::_ \\ \\
   \\:\\ \\ \\ \\_
    \\:\\ \\ /_ \\
     \\:\\_-  \\ \\
      \\___|\\_\\_/\
`.split("\n");

const isApiPlugin = (plugin: Plugin) => plugin.name.endsWith("API") || plugin.required;

function getEnabledPlugins() {
    const counters = {
        official: {
            enabled: 0,
            total: 0
        },
        user: {
            enabled: 0,
            total: 0
        }
    };

    Object.values(Vencord.Plugins.plugins).filter(plugin => !isApiPlugin(plugin)).forEach(plugin => {
        if (PluginMeta[plugin.name]?.userPlugin) {
            if (plugin.started) counters.user.enabled++;
            counters.user.total++;
        } else {
            if (plugin.started) counters.official.enabled++;
            counters.official.total++;
        }
    });

    return `${counters.official.enabled} / ${counters.official.total} (official)` + (counters.user.total ? `, ${counters.user.enabled} / ${counters.user.total} (userplugins)` : "");
}
function getDonorStatus() {
    return GuildMemberStore.getMember("1015060230222131221", UserStore.getCurrentUser().id)?.roles.includes("1042507929485586532");
}
function getContribStatus() {
    return isPluginDev(UserStore.getCurrentUser().id) || GuildMemberStore.getMember("1015060230222131221", UserStore.getCurrentUser().id)?.roles.includes("1026534353167208489");
}
function getEquicordDevStatus() {
    return GuildMemberStore.getMember("1173279886065029291", UserStore.getCurrentUser().id)?.roles.includes("1173520023239786538");
}
function getEquicordDonorStatus() {
    return GuildMemberStore.getMember("1173279886065029291", UserStore.getCurrentUser().id)?.roles.includes("1173316879083896912");
}
function getEquicordContribStatus() {
    return isEquicordPluginDev(UserStore.getCurrentUser().id) || GuildMemberStore.getMember("1173279886065029291", UserStore.getCurrentUser().id)?.roles.includes("1222677964760682556");
}
function getEquibopContribStatus() {
    return GuildMemberStore.getMember("1173279886065029291", UserStore.getCurrentUser().id)?.roles.includes("1287079931645263968");
}
function getSuncordContribStatus() {
    return GuildMemberStore.getMember("1207691698386501634", UserStore.getCurrentUser().id)?.roles.includes("1230686049513111695");
}

function humanFileSize(bytes) {
    const thresh = 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + " B";
    }

    const units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let u = -1;
    const r = 10 ** 1;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

    return bytes.toFixed(1) + " " + units[u];
}

const getVersions = findByCodeLazy("logsUploaded:new Date().toISOString(),");

export default definePlugin({
    name: "Equifetch",
    description: "neofetch for equicord",
    authors: [Devs.nin0dev],
    commands: [
        {
            name: "equifetch",
            description: "neofetch for equicord",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (args: Argument[], ctx: CommandContext) => {
                const { username } = UserStore.getCurrentUser();
                const versions = getVersions();
                const info: Record<string, string | null> = {
                    version: `${VERSION} ~ ${gitHash}${SettingsPlugin.additionalInfo} - ${Intl.DateTimeFormat(navigator.language, { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
                    client: `${t(window.GLOBAL_ENV.RELEASE_CHANNEL)} ~ ${clientVersion()}`,
                    "Build Number": `${versions.buildNumber} ~ Hash: ${versions.versionHash?.slice(0, 7) ?? "unknown"}`,

                    _: null,

                    // @ts-ignore
                    platform: navigator.userAgentData?.platform ? `${navigator.userAgentData?.platform} (${navigator.platform})` : navigator.platform,
                    plugins: getEnabledPlugins(),
                    uptime: `${~~((Date.now() - window.GLOBAL_ENV.HTML_TIMESTAMP) / 1000)}s`,
                    memory: `${humanFileSize(VencordNative.native.systemMemoryInfo().total * 1024 - VencordNative.native.systemMemoryInfo().free * 1024)} Used / ${humanFileSize(VencordNative.native.systemMemoryInfo().total * 1024)} Total`,

                    __: null,

                    "Vencord Donor": getDonorStatus() ? "yes" : "no",
                    "Vencord Contributor": getContribStatus() ? "yes" : "no",
                    "Equicord Dev": getEquicordDevStatus() ? "yes" : "no",
                    "Equicord Donor": getEquicordDonorStatus() ? "yes" : "no",
                    "Equicord Contributor": getEquicordContribStatus() ? "yes" : "no",
                    "Equibop Contributor": getEquibopContribStatus() ? "yes" : "no",
                    "Suncord Contributor": getSuncordContribStatus() ? "yes" : "no",

                    ___: null,

                    __COLOR_TEST__: "[2;40m[2;30m███[0m[2;40m[0m[2;31m[0m[2;30m███[0m[2;31m███[0m[2;32m███[0m[2;33m███[0m[2;34m███[0m[2;35m███[0m[2;36m███[0m[2;37m███[0m"

                    // electron web context, want to get total memory usage
                };

                const computed: [string, string | null][] = Object.entries(info).map(([key, value]) => [key, value]);

                let str = "";

                str += `${lines[0]}${" ".repeat(25 - lines[0].length)}[1;2m[4;2m[0m[0m[4;2m[1;2m${username}[0m[0m\n`;

                for (let i = 1; i < computed.length + 1; i++) {
                    const line = computed[i - 1];

                    if (lines[i]) {
                        str += `${lines[i]}`;

                        if (line && line[1] !== null && line[0] !== "__COLOR_TEST__") str += `${" ".repeat(25 - sanitised[i].length)}[2;35m[0m[2;35m${t(line[0])}: [0m[0m${line[1]}[0m[2;35m[0m\n`;
                        else if (line[0] === "__COLOR_TEST__") str += line[0] + "\n"; else str += "\n";
                    } else {
                        if (line && line[1] !== null && line[0] !== "__COLOR_TEST__") str += `${" ".repeat(25)}[2;35m[0m[2;35m${t(line[0])}: [0m[0m${line[1]}[0m[2;35m[0m\n`;
                        else if (line[0] === "__COLOR_TEST__") str += `${" ".repeat(25)}${line[1]}\n`; else str += "\n";
                    }
                }

                sendMessage(ctx.channel.id, {
                    content: `\`\`\`ansi\n${str}\n\`\`\``
                });
                return;
            }
        }
    ]
});

const t = (e: string) => e.length > 0 ? e[0].toUpperCase() + e.slice(1) : "";
