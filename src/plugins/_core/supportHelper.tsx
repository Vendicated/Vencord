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

import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs, EquicordDevs, SUPPORT_CHANNEL_ID, SUPPORT_CHANNEL_IDS, VC_SUPPORT_CHANNEL_ID } from "@utils/constants";
import { Margins } from "@utils/margins";
import { isEquicordPluginDev, isPluginDev } from "@utils/misc";
import { relaunch } from "@utils/native";
import { makeCodeblock } from "@utils/text";
import definePlugin from "@utils/types";
import { isOutdated, update } from "@utils/updater";
import { Alerts, Card, ChannelStore, Forms, GuildMemberStore, Parser, RelationshipStore, UserStore } from "@webpack/common";

import gitHash from "~git-hash";
import plugins from "~plugins";

import settings from "./settings";

const VENCORD_GUILD_ID = "1015060230222131221";
const EQUICORD_GUILD_ID = "1015060230222131221";

const AllowedChannelIds = [
    SUPPORT_CHANNEL_ID,
    "1173659827881390160", // Equicord > #dev
    "1173342942858055721", // Equicord > #support
];

const TrustedRolesIds = [
    "1026534353167208489", // contributor
    "1026504932959977532", // regular
    "1042507929485586532", // donor
    "1173520023239786538", // Equicord Team
    "1222677964760682556", // Equicord Contributor
    "1173343399470964856", // Vencord Contributor
];

export default definePlugin({
    name: "SupportHelper",
    required: true,
    description: "Helps us provide support to you",
    authors: [Devs.Ven, EquicordDevs.thororen, EquicordDevs.coolesding],
    dependencies: ["CommandsAPI"],

    patches: [{
        find: ".BEGINNING_DM.format",
        replacement: {
            match: /BEGINNING_DM\.format\(\{.+?\}\),(?=.{0,100}userId:(\i\.getRecipientId\(\)))/,
            replace: "$& $self.ContributorDmWarningCard({ userId: $1 }),"
        }
    }],

    commands: [{
        name: "equicord-debug",
        description: "Send Equicord Debug info",
        predicate: ctx => AllowedChannelIds.includes(ctx.channel.id),
        async execute() {
            const { RELEASE_CHANNEL } = window.GLOBAL_ENV;

            const client = (() => {
                if (IS_DISCORD_DESKTOP) return `Discord Desktop v${DiscordNative.app.getVersion()}`;
                if (IS_VESKTOP) return `Vesktop w Equicord v${VesktopNative.app.getVersion()}`;
                if ("armcord" in window) return `ArmCord v${window.armcord.version}`;

                // @ts-expect-error
                const name = typeof unsafeWindow !== "undefined" ? "UserScript" : "Web";
                return `${name} (${navigator.userAgent})`;
            })();

            const isApiPlugin = (plugin: string) => plugin.endsWith("API") || plugins[plugin].required;

            const enabledPlugins = Object.keys(plugins).filter(p => Vencord.Plugins.isPluginEnabled(p) && !isApiPlugin(p));

            const info = {
                Vencord:
                    `v${VERSION} • [${gitHash}](<https://github.com/Vendicated/Vencord/commit/${gitHash}>)` +
                    `${settings.additionalInfo} - ${Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
                Client: `${RELEASE_CHANNEL} ~ ${client}`,
                Platform: window.navigator.platform
            };

            if (IS_DISCORD_DESKTOP) {
                info["Last Crash Reason"] = (await DiscordNative.processUtils.getLastCrash())?.rendererCrashReason ?? "N/A";
            }

            const debugInfo = `
>>> ${Object.entries(info).map(([k, v]) => `**${k}**: ${v}`).join("\n")}

Enabled Plugins (${enabledPlugins.length}):
${makeCodeblock(enabledPlugins.join(", "))}
`;

            return {
                content: debugInfo.trim().replaceAll("```\n", "```")
            };
        }
    }],

    flux: {
        async CHANNEL_SELECT({ channelId }) {
            if (!SUPPORT_CHANNEL_IDS.includes(channelId)) return;

            if (channelId === VC_SUPPORT_CHANNEL_ID && Vencord.Plugins.isPluginEnabled("VCSupport")) return Alerts.show({
                title: "You are entering the support channel!",
                body: <div>
                    <style>
                        {'[class*="backdrop_"][style*="backdrop-filter"]{backdrop-filter:blur(16px) brightness(0.25) !important;}'}
                    </style>
                    <img src="https://media.tenor.com/QtGqjwBpRzwAAAAi/wumpus-dancing.gif" />
                    <Forms.FormText>Before you ask for help,</Forms.FormText>
                    <Forms.FormText>Check for updates and if this</Forms.FormText>
                    <Forms.FormText>issue could be caused by Equicord!</Forms.FormText>
                </div>
            });

            const selfId = UserStore.getCurrentUser()?.id;
            if (!selfId || isPluginDev(selfId) || isEquicordPluginDev(selfId)) return;

            if (isOutdated) {
                return Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Forms.FormText>You are using an outdated version of Equicord! Chances are, your issue is already fixed.</Forms.FormText>
                        <Forms.FormText className={Margins.top8}>
                            Please first update before asking for support!
                        </Forms.FormText>
                    </div>,
                    onCancel: () => openUpdaterModal!(),
                    cancelText: "View Updates",
                    confirmText: "Update & Restart Now",
                    async onConfirm() {
                        await update();
                        relaunch();
                    },
                    secondaryConfirmText: "I know what I'm doing or I can't update"
                });
            }

            // @ts-ignore outdated type
            const roles = GuildMemberStore.getSelfMember(VENCORD_GUILD_ID)?.roles || GuildMemberStore.getSelfMember(EQUICORD_GUILD_ID)?.roles;
            if (!roles || TrustedRolesIds.some(id => roles.includes(id))) return;

            if (!IS_WEB && IS_UPDATER_DISABLED) {
                return Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Forms.FormText>You are using an externally updated Equicord version, the ability to help you here may be limited.</Forms.FormText>
                        <Forms.FormText className={Margins.top8}>
                            Please join the <Link href="https://discord.gg/5Xh2W87egW">Equicord Server</Link> for support,
                            or if this issue persists on Vencord, continue on.
                        </Forms.FormText>
                    </div>
                });
            }

            const repo = await VencordNative.updater.getRepo();
            if (repo.ok && !repo.value.includes("Vendicated/Vencord")) {
                return Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Forms.FormText>You are running a modified version of Vencord.</Forms.FormText>
                        <Forms.FormText className={Margins.top8}>
                            Please join the <Link href="https://discord.gg/5Xh2W87egW">Equicord Server </Link> for support,
                            or if this issue persists on Vencord, continue on.
                        </Forms.FormText>
                    </div>
                });
            }
        }
    },

    ContributorDmWarningCard: ErrorBoundary.wrap(({ userId }) => {
        if (!isPluginDev(userId) || !isEquicordPluginDev(userId)) return null;
        if (RelationshipStore.isFriend(userId)) return null;

        return (
            <Card className={`vc-plugins-restart-card ${Margins.top8}`}>
                Please do not private message plugin developers for support!
                <br />
                Instead, use the support channel: {Parser.parse("https://discord.com/channels/1173279886065029291/1173342942858055721")}
                {!ChannelStore.getChannel(SUPPORT_CHANNEL_ID) && " (Click the link to join)"}
            </Card>
        );
    }, { noop: true })
});
