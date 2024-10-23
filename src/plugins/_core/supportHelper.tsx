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

import { addAccessory } from "@api/MessageAccessories";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs, GUILD_ID, SUPPORT_CHANNEL_ID, SUPPORT_CHANNEL_IDS, VC_GUILD_ID, VC_SUPPORT_CHANNEL_ID } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { isEquicordPluginDev, isPluginDev, tryOrElse } from "@utils/misc";
import { relaunch } from "@utils/native";
import { onlyOnce } from "@utils/onlyOnce";
import { makeCodeblock } from "@utils/text";
import definePlugin from "@utils/types";
import { checkForUpdates, isOutdated, update } from "@utils/updater";
import { Alerts, Button, Card, ChannelStore, Forms, GuildMemberStore, Parser, RelationshipStore, showToast, Text, Toasts, UserStore } from "@webpack/common";

import gitHash from "~git-hash";
import plugins, { PluginMeta } from "~plugins";

import SettingsPlugin from "./settings";

const VENBOT_USER_ID = "1017176847865352332";
const KNOWN_ISSUES_CHANNEL_ID = "1222936386626129920";
const CodeBlockRe = /```js\n(.+?)```/s;

const TrustedRolesIds = [
    "1026534353167208489", // contributor
    "1026504932959977532", // regular
    "1042507929485586532", // donor
    "1173520023239786538", // Equicord Team
    "1222677964760682556", // Equicord Contributor
    "1287079931645263968", // Equibop Contributor
    "1173343399470964856", // Vencord Contributor
];

const AsyncFunction = async function () { }.constructor;

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

async function forceUpdate() {
    const outdated = await checkForUpdates();
    if (outdated) {
        await update();
        relaunch();
    }

    return outdated;
}

async function generateDebugInfoMessage() {
    const { RELEASE_CHANNEL } = window.GLOBAL_ENV;

    const client = (() => {
        if (IS_DISCORD_DESKTOP) return `Discord Desktop v${DiscordNative.app.getVersion()}`;
        if (IS_VESKTOP) return `Vesktop v${VesktopNative.app.getVersion()}`;
        if (IS_EQUIBOP) return `Equibop v${VesktopNative.app.getVersion()}`;
        if ("legcord" in window) return `LegCord v${window.armcord.version}`;

        // @ts-expect-error
        const name = typeof unsafeWindow !== "undefined" ? "UserScript" : "Web";
        return `${name} (${navigator.userAgent})`;
    })();

    const info = {
        Equicord:
            `v${VERSION} • [${gitHash}](<https://github.com/Equicord/Equicord/commit/${gitHash}>)` +
            `${SettingsPlugin.additionalInfo} - ${Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
        Client: `${RELEASE_CHANNEL} ~ ${client}`,
        Platform: window.navigator.platform
    };

    if (IS_DISCORD_DESKTOP) {
        info["Last Crash Reason"] = (await tryOrElse(() => DiscordNative.processUtils.getLastCrash(), undefined))?.rendererCrashReason ?? "N/A";
    }

    const commonIssues = {
        "NoRPC enabled": Vencord.Plugins.isPluginEnabled("NoRPC"),
        "Activity Sharing disabled": tryOrElse(() => !ShowCurrentGame.getSetting(), false),
        "Equicord DevBuild": !IS_STANDALONE,
        "Has UserPlugins": Object.values(PluginMeta).some(m => m.userPlugin),
        "More than two weeks out of date": BUILD_TIMESTAMP < Date.now() - 12096e5,
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
    dependencies: ["UserSettingsAPI", "MessageAccessoriesAPI"],

    settings,

    patches: [{
        find: ".BEGINNING_DM.format",
        replacement: {
            match: /BEGINNING_DM\.format\(\{.+?\}\),(?=.{0,300}(\i)\.isMultiUserDM)/,
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
            execute: () => ({ content: generatePluginList() })
        }
    ],

    flux: {
        async CHANNEL_SELECT({ channelId }) {
            if (!SUPPORT_CHANNEL_IDS.includes(channelId)) return;

            const selfId = UserStore.getCurrentUser()?.id;
            if (!selfId || isPluginDev(selfId) || isEquicordPluginDev(selfId)) return;
            if (channelId === VC_SUPPORT_CHANNEL_ID && Vencord.Plugins.isPluginEnabled("VCSupport") && !clicked) {
                clicked = true;
                return Alerts.show({
                    title: "You are entering the support channel!",
                    body: <div>
                        <style>
                            {'[class*="backdrop_"][style*="backdrop-filter"]{backdrop-filter:blur(16px) brightness(0.25) !important;}'}
                        </style>
                        <img src="https://media.tenor.com/QtGqjwBpRzwAAAAi/wumpus-dancing.gif" />
                        <Forms.FormText>Before you ask for help,</Forms.FormText>
                        <Forms.FormText>Check for updates and if this</Forms.FormText>
                        <Forms.FormText>issue could be caused by Equicord!</Forms.FormText>
                    </div>,
                    confirmText: "Go to Equicord Support",
                    cancelText: "Okay continue",
                    onConfirm: () => VencordNative.native.openExternal("https://discord.gg/npnv52UQwY"),
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

            // @ts-ignore outdated type
            const roles = GuildMemberStore.getSelfMember(VC_GUILD_ID)?.roles || GuildMemberStore.getSelfMember(GUILD_ID)?.roles;
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

    renderContributorDmWarningCard: ErrorBoundary.wrap(({ channel }) => {
        const userId = channel.getRecipientId();
        if (!isPluginDev(userId) || !isEquicordPluginDev(userId)) return null;
        if (RelationshipStore.isFriend(userId) || isPluginDev(UserStore.getCurrentUser()?.id) || isEquicordPluginDev(UserStore.getCurrentUser()?.id)) return null;

        return (
            <Card className={`vc-plugins-restart-card ${Margins.top8}`}>
                Please do not private message plugin developers for support!
                <br />
                Instead, use the support channel: {Parser.parse("https://discord.com/channels/1173279886065029291/1173342942858055721")}
                {!ChannelStore.getChannel(SUPPORT_CHANNEL_ID) && " (Click the link to join)"}
            </Card>
        );
    }, { noop: true }),

    start() {
        addAccessory("equicord-debug", props => {
            const buttons = [] as JSX.Element[];

            const shouldAddUpdateButton =
                !IS_UPDATER_DISABLED
                && (
                    (props.channel.id === KNOWN_ISSUES_CHANNEL_ID) ||
                    (props.channel.id === SUPPORT_CHANNEL_ID && props.message.author.id === VENBOT_USER_ID)
                )
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

            if (props.channel.id === SUPPORT_CHANNEL_ID) {
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
                            onClick={async () => sendMessage(props.channel.id, { content: generatePluginList() })}
                        >
                            Run /equicord-plugins
                        </Button>
                    );
                }

                if (props.message.author.id === VENBOT_USER_ID) {
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
        });
    },
});
