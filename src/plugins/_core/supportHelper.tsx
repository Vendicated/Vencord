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
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { openUpdaterModal } from "@components/settings/tabs/updater";
import { CONTRIB_ROLE_ID, Devs, DONOR_ROLE_ID, EQUIBOP_CONTRIB_ROLE_ID, EQUICORD_HELPERS, EQUICORD_TEAM, GUILD_ID, SUPPORT_CHANNEL_ID, SUPPORT_CHANNEL_IDS, VC_CONTRIB_ROLE_ID, VC_DONOR_ROLE_ID, VC_GUILD_ID, VC_REGULAR_ROLE_ID, VC_SUPPORT_CHANNEL_IDS, VENCORD_CONTRIB_ROLE_ID } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { isEquicordPluginDev, isPluginDev, tryOrElse } from "@utils/misc";
import { relaunch } from "@utils/native";
import { onlyOnce } from "@utils/onlyOnce";
import { makeCodeblock } from "@utils/text";
import definePlugin from "@utils/types";
import { checkForUpdates, isOutdated, shortGitHash, update } from "@utils/updater";
import { Alerts, Button, Card, ChannelStore, Forms, GuildMemberStore, Parser, PermissionsBits, PermissionStore, RelationshipStore, showToast, Text, Toasts, UserStore } from "@webpack/common";
import { JSX } from "react";

import gitHash from "~git-hash";
import plugins, { PluginMeta } from "~plugins";

import SettingsPlugin from "./settings";

const CodeBlockRe = /```js\n(.+?)```/s;

const TrustedRolesIds = [
    VC_CONTRIB_ROLE_ID, // Vencord Contributor
    VC_REGULAR_ROLE_ID, // Vencord Regular
    VC_DONOR_ROLE_ID, // Vencord Donor
    EQUICORD_TEAM, // Equicord Team
    DONOR_ROLE_ID, // Equicord Donor
    CONTRIB_ROLE_ID, // Equicord Contributor
    EQUIBOP_CONTRIB_ROLE_ID, // Equibop Contributor
    VENCORD_CONTRIB_ROLE_ID, // Vencord Contributor
];

const AsyncFunction = async function () { }.constructor;

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;
const ShowEmbeds = getUserSettingLazy<boolean>("textAndImages", "renderEmbeds")!;

async function forceUpdate() {
    const outdated = await checkForUpdates();
    if (outdated) {
        await update();
        relaunch();
    }

    return outdated;
}

function getWindowsName(release: string) {
    const build = parseInt(release.split(".")[2]);
    if (build >= 22000) return "Windows 11";
    if (build >= 10240) return "Windows 10";
    if (build >= 9200) return "Windows 8.1";
    if (build >= 7600) return "Windows 7";
    return `Windows (${release})`;
}

function getMacOSName(release: string) {
    const major = parseInt(release.split(".")[0]);
    if (major === 24) return "MacOS 15 (Sequoia)";
    if (major === 23) return "MacOS 14 (Sonoma)";
    if (major === 22) return "MacOS 13 (Ventura)";
    if (major === 21) return "MacOS 12 (Monterey)";
    if (major === 20) return "MacOS 11 (Big Sur)";
    if (major === 19) return "MacOS 10.15 (Catalina)";
    return `MacOS (${release})`;
}

function platformName() {
    if (typeof DiscordNative === "undefined") return navigator.platform;
    if (DiscordNative.process.platform === "win32") return `${getWindowsName(DiscordNative.os.release)}`;
    if (DiscordNative.process.platform === "darwin") return `${getMacOSName(DiscordNative.os.release)} (${DiscordNative.process.arch === "arm64" ? "Apple Silicon" : "Intel Silicon"})`;
    if (DiscordNative.process.platform === "linux") return `Linux (${DiscordNative.os.release})`;
    return DiscordNative.process.platform;
}

async function generateDebugInfoMessage() {
    const { RELEASE_CHANNEL } = window.GLOBAL_ENV;

    const client = (() => {
        if (IS_DISCORD_DESKTOP) return `Discord Desktop v${DiscordNative.app.getVersion()}`;
        if (IS_VESKTOP) return `Vesktop v${VesktopNative.app.getVersion()}`;
        if (IS_EQUIBOP) return `Equibop v${VesktopNative.app.getVersion()}`;
        if ("legcord" in window) return `LegCord v${window.legcord.version}`;

        // @ts-expect-error
        const name = typeof unsafeWindow !== "undefined" ? "UserScript" : "Web";
        return `${name} (${navigator.userAgent})`;
    })();

    const info = {
        Equicord:
            `v${VERSION} • [${shortGitHash()}](<https://github.com/Equicord/Equicord/commit/${gitHash}>)` +
            `${SettingsPlugin.getVersionInfo()} - ${Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
        Client: `${RELEASE_CHANNEL} ~ ${client}`,
        Platform: platformName()
    };

    if (IS_DISCORD_DESKTOP) {
        info["Last Crash Reason"] = (await tryOrElse(() => DiscordNative.processUtils.getLastCrash(), undefined))?.rendererCrashReason ?? "N/A";
    }

    const potentiallyProblematicPlugins = ([
        "NoRPC", "NoProfileThemes", "NoMosaic", "NoRoleHeaders", "NoSystemBadge", "NoDeleteSafety",
        "Moyai", "AlwaysAnimate", "ClientTheme", "Equissant", "Ingtoninator", "KeyboardSounds", "NeverPausePreviews",
    ].filter(Vencord.Plugins.isPluginEnabled) ?? []).sort();

    if (Vencord.Plugins.isPluginEnabled("CustomIdle") && Vencord.Settings.plugins.CustomIdle.idleTimeout === 0) {
        potentiallyProblematicPlugins.push("CustomIdle");
    }

    const commonIssues = {
        "Activity Sharing Disabled": tryOrElse(() => !ShowCurrentGame.getSetting(), false),
        "Link Embeds Disabled": tryOrElse(() => !ShowEmbeds.getSetting(), false),
        "Equicord DevBuild": !IS_STANDALONE,
        "Has UserPlugins": Object.values(PluginMeta).some(m => m.userPlugin),
        ">2 Weeks Outdated": BUILD_TIMESTAMP < Date.now() - 12096e5,
        [`Potentially Problematic Plugins: ${potentiallyProblematicPlugins.join(", ")}`]: potentiallyProblematicPlugins.length
    };

    let content = `>>> ${Object.entries(info).map(([k, v]) => `**${k}**: ${v}`).join("\n")}`;
    content += "\n" + Object.entries(commonIssues)
        .filter(([, v]) => v).map(([k]) => `⚠️ ${k}`)
        .join("\n");

    return content.trim();
}

function generatePluginList() {
    const isApiPlugin = (plugin: string) => plugin.endsWith("API") || plugins[plugin].required;

    const enabledPlugins = Object.keys(plugins)
        .filter(p => Vencord.Plugins.isPluginEnabled(p) && !isApiPlugin(p)).sort();

    const enabledStockPlugins = enabledPlugins.filter(p => !PluginMeta[p].userPlugin);
    const enabledUserPlugins = enabledPlugins.filter(p => PluginMeta[p].userPlugin);


    let content = `**Enabled Plugins (${enabledStockPlugins.length}):**\n${makeCodeblock(enabledStockPlugins.join(", "))}`;

    if (enabledUserPlugins.length) {
        content += `**Enabled UserPlugins (${enabledUserPlugins.length}):**\n${makeCodeblock(enabledUserPlugins.join(", "))}`;
    }

    if (enabledPlugins.length > 100 && !(isPluginDev(UserStore.getCurrentUser()?.id) || isEquicordPluginDev(UserStore.getCurrentUser()?.id))) {
        return Alerts.show({
            title: "You are attempting to get support!",
            body: <div>
                <style>
                    {'[class*="backdrop_"][style*="backdrop-filter"]{backdrop-filter:blur(16px) brightness(0.25) !important;}'}
                </style>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                    <img src="https://media.tenor.com/QtGqjwBpRzwAAAAi/wumpus-dancing.gif" />
                </div>
                <Forms.FormText>Before you ask for help,</Forms.FormText>
                <Forms.FormText>We do not handle support for users who use 100+ plugins</Forms.FormText>
                <Forms.FormText>issue could be plugin confliction</Forms.FormText>
                <Forms.FormText>try removing some plugins and see if it fixes!</Forms.FormText>
            </div>,
            cancelText: "Okay continue"
        });
    }

    return content;
}

const checkForUpdatesOnce = onlyOnce(checkForUpdates);

const settings = definePluginSettings({}).withPrivateSettings<{
    dismissedDevBuildWarning?: boolean;
}>();

let clicked = false;

export default definePlugin({
    name: "SupportHelper",
    required: true,
    description: "Helps us provide support to you",
    authors: [Devs.Ven],
    dependencies: ["UserSettingsAPI"],

    settings,

    patches: [{
        find: "#{intl::BEGINNING_DM}",
        replacement: {
            match: /#{intl::BEGINNING_DM},{.+?}\),(?=.{0,300}(\i)\.isMultiUserDM)/,
            replace: "$& $self.renderContributorDmWarningCard({ channel: $1 }),"
        }
    }],

    commands: [
        {
            name: "equicord-debug",
            description: "Send Equicord debug info",
            // @ts-ignore
            predicate: ctx => isPluginDev(UserStore.getCurrentUser()?.id) || isEquicordPluginDev(UserStore.getCurrentUser()?.id) || GUILD_ID === ctx?.guild?.id,
            execute: async () => ({ content: await generateDebugInfoMessage() })
        },
        {
            name: "equicord-plugins",
            description: "Send Equicord plugin list",
            // @ts-ignore
            predicate: ctx => isPluginDev(UserStore.getCurrentUser()?.id) || isEquicordPluginDev(UserStore.getCurrentUser()?.id) || GUILD_ID === ctx?.guild?.id,
            execute: () => {
                const pluginList = generatePluginList();
                return { content: typeof pluginList === "string" ? pluginList : "Unable to generate plugin list." };
            }
        }
    ],

    flux: {
        async CHANNEL_SELECT({ channelId }) {
            const isSupportChannel = SUPPORT_CHANNEL_IDS.includes(channelId);
            if (!isSupportChannel) return;

            const selfId = UserStore.getCurrentUser()?.id;
            if (!selfId || isPluginDev(selfId) || isEquicordPluginDev(selfId)) return;
            if (VC_SUPPORT_CHANNEL_IDS.includes(channelId) && Vencord.Plugins.isPluginEnabled("VCSupport") && !clicked) {
                return Alerts.show({
                    title: "You are entering the support channel!",
                    body: <div>
                        <style>
                            {'[class*="backdrop_"][style*="backdrop-filter"]{backdrop-filter:blur(16px) brightness(0.25) !important;}'}
                        </style>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                            <img src="https://media.tenor.com/QtGqjwBpRzwAAAAi/wumpus-dancing.gif" />
                        </div>
                        <Forms.FormText>Before you ask for help,</Forms.FormText>
                        <Forms.FormText>Check for updates and if this</Forms.FormText>
                        <Forms.FormText>issue could be caused by Equicord!</Forms.FormText>
                    </div>,
                    confirmText: "Go to Equicord Support",
                    onConfirm() {
                        clicked = true;
                        VencordNative.native.openExternal("https://equicord.org/discord");
                    },
                    cancelText: "Okay continue",
                    onCancel() {
                        clicked = true;
                    },
                });
            }

            if (!IS_UPDATER_DISABLED) {
                await checkForUpdatesOnce().catch(() => { });

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
                        onConfirm: forceUpdate,
                        secondaryConfirmText: "I know what I'm doing or I can't update"
                    });
                }
            }

            const roles = GuildMemberStore.getSelfMember(VC_GUILD_ID)?.roles || GuildMemberStore.getSelfMember(GUILD_ID)?.roles;
            if (!roles || TrustedRolesIds.some(id => roles.includes(id))) return;

            if (!IS_WEB && IS_UPDATER_DISABLED) {
                return Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Forms.FormText>You are using an externally updated Equicord version, the ability to help you here may be limited.</Forms.FormText>
                        <Forms.FormText className={Margins.top8}>
                            Please join the <Link href="https://equicord.org/discord">Equicord Server</Link> for support,
                            or if this issue persists on Vencord, continue on.
                        </Forms.FormText>
                    </div>
                });
            }

            if (!IS_STANDALONE && !settings.store.dismissedDevBuildWarning) {
                return Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Forms.FormText>You are using a custom build of Equicord, which we do not provide support for!</Forms.FormText>

                        <Forms.FormText className={Margins.top8}>
                            We only provide support for <Link href="https://github.com/Equicord/Equicord">official builds</Link>.
                            Either <Link href="https://github.com/Equicord/Equilotl">switch to an official build</Link> or figure your issue out yourself.
                        </Forms.FormText>

                        <Text variant="text-md/bold" className={Margins.top8}>You will be banned from receiving support if you ignore this rule.</Text>
                    </div>,
                    confirmText: "Understood",
                    secondaryConfirmText: "Don't show again",
                    onConfirmSecondary: () => settings.store.dismissedDevBuildWarning = true
                });
            }
        }
    },

    renderMessageAccessory(props) {
        const buttons = [] as JSX.Element[];

        const equicordSupport = GuildMemberStore.getMember(GUILD_ID, props.message.author.id)?.roles?.includes(EQUICORD_HELPERS);

        const shouldAddUpdateButton =
            !IS_UPDATER_DISABLED
            && ((props.channel.id === SUPPORT_CHANNEL_ID && equicordSupport))
            && props.message.content?.includes("update");

        if (shouldAddUpdateButton) {
            buttons.push(
                <Button
                    key="vc-update"
                    color={Button.Colors.GREEN}
                    onClick={async () => {
                        try {
                            if (await forceUpdate())
                                showToast("Success! Restarting...", Toasts.Type.SUCCESS);
                            else
                                showToast("Already up to date!", Toasts.Type.MESSAGE);
                        } catch (e) {
                            new Logger(this.name).error("Error while updating:", e);
                            showToast("Failed to update :(", Toasts.Type.FAILURE);
                        }
                    }}
                >
                    Update Now
                </Button>
            );
        }

        if (props.channel.id === SUPPORT_CHANNEL_ID && PermissionStore.can(PermissionsBits.SEND_MESSAGES, props.channel)) {
            if (props.message.content.includes("/equicord-debug") || props.message.content.includes("/equicord-plugins")) {
                buttons.push(
                    <Button
                        key="vc-dbg"
                        onClick={async () => sendMessage(props.channel.id, { content: await generateDebugInfoMessage() })}
                    >
                        Run /equicord-debug
                    </Button>,
                    <Button
                        key="vc-plg-list"
                        onClick={async () => {
                            const pluginList = generatePluginList();
                            if (typeof pluginList === "string") {
                                sendMessage(props.channel.id, { content: pluginList });
                            }
                        }}
                    >
                        Run /equicord-plugins
                    </Button>
                );
            }

            if (equicordSupport) {
                const match = CodeBlockRe.exec(props.message.content || props.message.embeds[0]?.rawDescription || "");
                if (match) {
                    buttons.push(
                        <Button
                            key="vc-run-snippet"
                            onClick={async () => {
                                try {
                                    await AsyncFunction(match[1])();
                                    showToast("Success!", Toasts.Type.SUCCESS);
                                } catch (e) {
                                    new Logger(this.name).error("Error while running snippet:", e);
                                    showToast("Failed to run snippet :(", Toasts.Type.FAILURE);
                                }
                            }}
                        >
                            Run Snippet
                        </Button>
                    );
                }
            }
        }

        return buttons.length
            ? <Flex>{buttons}</Flex>
            : null;
    },

    renderContributorDmWarningCard: ErrorBoundary.wrap(({ channel }) => {
        const userId = channel.getRecipientId();
        if (!isPluginDev(userId) || !isEquicordPluginDev(userId)) return null;
        if (RelationshipStore.isFriend(userId) || isPluginDev(UserStore.getCurrentUser()?.id) || isEquicordPluginDev(UserStore.getCurrentUser()?.id)) return null;

        return (
            <Card className={`vc-plugins-restart-card ${Margins.top8}`}>
                Please do not private message plugin developers for support!
                <br />
                Instead, use the support channel: {Parser.parse("https://discord.com/channels/1173279886065029291/1297590739911573585")}
                {!ChannelStore.getChannel(SUPPORT_CHANNEL_ID) && " (Click the link to join)"}
            </Card>
        );
    }, { noop: true }),
});
