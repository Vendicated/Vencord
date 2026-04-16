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

import { sendBotMessage } from "@api/Commands";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { BaseText } from "@components/BaseText";
import { Card } from "@components/Card";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { openSettingsTabModal, UpdaterTab } from "@components/settings";
import { platformName } from "@equicordplugins/equicordHelper/utils";
import customIdle from "@plugins/customIdle";
import { gitHash, gitHashShort } from "@shared/vencordUserAgent";
import { CONTRIB_ROLE_ID, Devs, DONOR_ROLE_ID, EQUICORD_TEAM, GUILD_ID, SUPPORT_CHANNEL_ID, SUPPORT_CHANNEL_IDS, VC_CONTRIB_ROLE_ID, VC_DONOR_ROLE_ID, VC_GUILD_ID, VC_REGULAR_ROLE_ID, VENCORD_CONTRIB_ROLE_ID } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { isAnyPluginDev, isEquicordGuild, isEquicordSupport, isSupportChannel, tryOrElse } from "@utils/misc";
import { relaunch } from "@utils/native";
import { onlyOnce } from "@utils/onlyOnce";
import { makeCodeblock } from "@utils/text";
import definePlugin from "@utils/types";
import { checkForUpdates, isOutdated, update } from "@utils/updater";
import { CloudUploadPlatform } from "@vencord/discord-types/enums";
import { Alerts, Button, ChannelStore, CloudUploader, Constants, GuildMemberStore, Parser, PermissionsBits, PermissionStore, RelationshipStore, RestAPI, SelectedChannelStore, showToast, SnowflakeUtils, Toasts, UserStore } from "@webpack/common";
import { JSX } from "react";

import plugins, { PluginMeta } from "~plugins";

import SettingsPlugin from "./settings";

const CodeBlockRe = /```snippet\n(.+?)```/s;

const TrustedRolesIds = [
    VC_CONTRIB_ROLE_ID, // Vencord Contributor
    VC_REGULAR_ROLE_ID, // Vencord Regular
    VC_DONOR_ROLE_ID, // Vencord Donor
    EQUICORD_TEAM, // Equicord Team
    DONOR_ROLE_ID, // Equicord Donor
    CONTRIB_ROLE_ID, // Equicord Contributor
    VENCORD_CONTRIB_ROLE_ID, // Vencord Contributor
];

const AsyncFunction = async function () { }.constructor;

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;
const ShowEmbeds = getUserSettingLazy<boolean>("textAndImages", "renderEmbeds")!;

interface clientData {
    name: string;
    version?: string | null | undefined;
    info?: string | boolean | null | undefined;
    spoofed?: string | null | undefined;
    shortHash?: string | null | undefined;
    hash?: string | null | undefined;
    dev?: boolean | null | undefined;
}

async function forceUpdate() {
    const outdated = await checkForUpdates();
    if (outdated) {
        await update();
        relaunch();
    }

    return outdated;
}

export function detectClient(): clientData {
    if (IS_DISCORD_DESKTOP) {
        return {
            name: "Discord Desktop",
            version: DiscordNative.app.getVersion(),
        };
    }
    if (IS_VESKTOP) return {
        name: "Vesktop",
        version: VesktopNative.app.getVersion(),
    };

    if (IS_EQUIBOP) {
        const equibopGitHash = tryOrElse(() => VesktopNative.app.getGitHash?.(), null);
        const spoofInfo = tryOrElse(() => VesktopNative.app.getPlatformSpoofInfo?.(), null);
        const isDevBuild = tryOrElse(() => VesktopNative.app.isDevBuild?.(), false);
        const shortHash = equibopGitHash?.slice(0, 7);
        return {
            name: "Equibop",
            version: VesktopNative.app.getVersion(),
            spoofed: spoofInfo?.spoofed ? `${platformName()} (spoofed from ${spoofInfo.originalPlatform})` : null,
            dev: isDevBuild,
            shortHash: shortHash,
            hash: equibopGitHash,
        };
    }

    if ("legcord" in window) return {
        name: "LegCord",
        version: window.legcord.version,
    };

    if ("goofcord" in window) return {
        name: "GoofCord",
        version: window.goofcord.version,
    };

    const name = typeof unsafeWindow !== "undefined" ? "UserScript" : "Web";
    return {
        name: name,
        info: navigator.userAgent
    };
}

async function generateDebugInfoMessage() {
    const { RELEASE_CHANNEL } = window.GLOBAL_ENV;

    const clientInfo = detectClient();
    let clientString = `${clientInfo.name}`;
    clientString += `${clientInfo.version ? ` v${clientInfo.version}` : ""}`;
    clientString += `${clientInfo.info ? ` • ${clientInfo.info}` : ""}`;
    clientString += `${clientInfo.shortHash ? ` • [${clientInfo.shortHash}](<https://github.com/Equicord/Equibop/commit/${clientInfo.hash}>)` : ""}`;

    const spoofInfo = IS_EQUIBOP ? tryOrElse(() => VesktopNative.app.getPlatformSpoofInfo?.(), null) : null;
    const platformDisplay = spoofInfo?.spoofed
        ? `${platformName()} (spoofed from ${spoofInfo.originalPlatform})`
        : platformName();

    const info = {
        Equicord:
            `v${VERSION} • [${gitHashShort}](<https://github.com/Equicord/Equicord/commit/${gitHash}>)` +
            `${IS_EQUIBOP ? "" : SettingsPlugin.getVersionInfo()} - ${Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
        Client: `${RELEASE_CHANNEL} ~ ${clientString}`,
        Platform: platformDisplay
    };

    if (IS_DISCORD_DESKTOP) {
        info["Last Crash Reason"] = (await tryOrElse(() => DiscordNative.processUtils.getLastCrash(), undefined))?.rendererCrashReason ?? "N/A";
    }

    const potentiallyProblematicPlugins = ([
        "NoRPC", "NoProfileThemes", "NoMosaic", "NoRoleHeaders", "NoSystemBadge",
        "AlwaysAnimate", "ClientTheme", "SoundTroll", "Ingtoninator", "NeverPausePreviews",
        "IdleAutoRestart",
    ].filter(isPluginEnabled) ?? []).sort();

    if (isPluginEnabled(customIdle.name) && customIdle.settings.store.idleTimeout === 0) {
        potentiallyProblematicPlugins.push(customIdle.name);
    }

    const potentiallyProblematicPluginsNote = "-# Note: These plugins might not be the cause of your problem. They are simply plugins that cause common issues.";

    const commonIssues = {
        "Activity Sharing Disabled": tryOrElse(() => !ShowCurrentGame.getSetting(), false),
        "Link Embeds Disabled": tryOrElse(() => !ShowEmbeds.getSetting(), false),
        "Equicord DevBuild": !IS_STANDALONE,
        "Equibop DevBuild": IS_EQUIBOP && tryOrElse(() => VesktopNative.app.isDevBuild?.(), false),
        "Platform Spoofed": spoofInfo?.spoofed ?? false,
        "Has UserPlugins": Object.values(PluginMeta).some(m => m.userPlugin),
        ">2 Weeks Outdated": BUILD_TIMESTAMP < Date.now() - 12096e5,
        [`Potentially Problematic Plugins: ${potentiallyProblematicPlugins.join(", ")}\n${potentiallyProblematicPluginsNote}`]: potentiallyProblematicPlugins.length
    };

    let content = `>>> ${Object.entries(info).map(([k, v]) => `**${k}**: ${v}`).join("\n")}`;
    content += "\n" + Object.entries(commonIssues)
        .filter(([, v]) => v).map(([k]) => `⚠️ ${k}`)
        .join("\n");

    return content.trim();
}

async function uploadPluginListFile(channelId: string, fileContent: string, filename: string) {
    const file = new File([fileContent], filename, { type: "text/plain" });
    const upload = new CloudUploader({ file, platform: CloudUploadPlatform.WEB }, channelId);

    return new Promise<void>((resolve, reject) => {
        upload.on("complete", () => {
            RestAPI.post({
                url: Constants.Endpoints.MESSAGES(channelId),
                body: {
                    flags: 0,
                    channel_id: channelId,
                    content: `⚠️ Plugin list attached as file due to high plugin count (${fileContent.split("\n").filter(l => l.startsWith("  -")).length} plugins enabled)`,
                    nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                    sticker_ids: [],
                    type: 0,
                    attachments: [{
                        id: "0",
                        filename: upload.filename,
                        uploaded_filename: upload.uploadedFilename,
                    }],
                }
            }).then(() => resolve()).catch(reject);
        });

        upload.on("error", () => reject(new Error("Failed to upload file")));

        upload.upload();
    });
}

function generatePluginList() {
    const isApiPlugin = (plugin: string) => plugin.endsWith("API") || plugins[plugin].required;

    const enabledPlugins = Object.keys(plugins)
        .filter(p => isPluginEnabled(p) && !isApiPlugin(p));

    const enabledStockPlugins = enabledPlugins.filter(p => !PluginMeta[p].userPlugin).sort();
    const enabledUserPlugins = enabledPlugins.filter(p => PluginMeta[p].userPlugin).sort();

    const user = UserStore.getCurrentUser();

    if (enabledPlugins.length > 100 && !isAnyPluginDev(user.id)) {
        Alerts.show({
            title: "Warning: High Plugin Count",
            body: <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                    <img src="https://media.tenor.com/QtGqjwBpRzwAAAAi/wumpus-dancing.gif" />
                </div>
                <Paragraph>You have more than 100 plugins enabled.</Paragraph>
                <Paragraph>Due to the sheer amount of plugins, you may not receive support.</Paragraph>
                <Paragraph>Your issue is likely caused by plugin conflicts.</Paragraph>
                <Paragraph>Please consider disabling some plugins to troubleshoot.</Paragraph>
                <Paragraph className={Margins.top8}>Your plugin list will be sent as a text file.</Paragraph>
            </div>
        });

        const fileContent = [
            `Enabled Stock Plugins (${enabledStockPlugins.length}):`,
            ...enabledStockPlugins.map(p => `  - ${p}`),
            "",
        ];

        if (enabledUserPlugins.length) {
            fileContent.push(
                `Enabled User Plugins (${enabledUserPlugins.length}):`,
                ...enabledUserPlugins.map(p => `  - ${p}`),
                ""
            );
        }

        fileContent.push(
            "---",
            `Total Enabled Plugins: ${enabledPlugins.length}`,
            "Warning: Due to the high number of enabled plugins, support may be limited."
        );

        return {
            uploadFile: true,
            fileContent: fileContent.join("\n"),
            filename: `${user.username}-plugins.txt`
        };
    }

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
            predicate: ctx => isAnyPluginDev(UserStore.getCurrentUser()?.id) || isEquicordGuild(ctx?.guild?.id, true),
            execute: async () => ({ content: await generateDebugInfoMessage() })
        },
        {
            name: "equicord-plugins",
            description: "Send Equicord plugin list",
            // @ts-ignore
            predicate: ctx => isAnyPluginDev(UserStore.getCurrentUser()?.id) || isEquicordGuild(ctx?.guild?.id, true),
            execute: async () => {
                const channelId = SelectedChannelStore.getChannelId();
                const pluginList = generatePluginList();

                if (typeof pluginList === "string") {
                    return { content: pluginList };
                } else if (pluginList && typeof pluginList === "object" && pluginList.uploadFile) {
                    try {
                        await uploadPluginListFile(channelId, pluginList.fileContent, pluginList.filename);
                        return { content: "" }; // Empty return since file was already sent
                    } catch (e) {
                        new Logger("SupportHelper").error("Failed to upload plugin list:", e);
                        return { content: "Failed to upload plugin list file. Please try again." };
                    }
                }
                return { content: "Unable to generate plugin list." };
            }
        }
    ],

    flux: {
        async CHANNEL_SELECT({ channelId }) {
            const isSupportChannel = SUPPORT_CHANNEL_IDS.includes(channelId);
            if (!isSupportChannel) return;

            const selfId = UserStore.getCurrentUser()?.id;
            if (!selfId || isAnyPluginDev(selfId)) return;

            if (!IS_UPDATER_DISABLED) {
                await checkForUpdatesOnce().catch(() => { });

                if (isOutdated) {
                    return Alerts.show({
                        title: "Hold on!",
                        body: <div>
                            <Paragraph>You are using an outdated version of Equicord! Chances are, your issue is already fixed.</Paragraph>
                            <Paragraph className={Margins.top8}>
                                Please first update before asking for support!
                            </Paragraph>
                        </div>,
                        onCancel: () => openSettingsTabModal(UpdaterTab!),
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
                        <Paragraph>You are using an externally updated Equicord version, the ability to help you here may be limited.</Paragraph>
                        <Paragraph className={Margins.top8}>
                            Please join the <Link href="https://equicord.org/discord">Equicord Server</Link> for support,
                            or if this issue persists on Vencord, continue on.
                        </Paragraph>
                    </div>
                });
            }

            if (!IS_STANDALONE && !settings.store.dismissedDevBuildWarning) {
                return Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Paragraph>You are using a custom build of Equicord, which we do not provide support for!</Paragraph>

                        <Paragraph className={Margins.top8}>
                            We only provide support for <Link href="https://github.com/Equicord/Equicord">official builds</Link>.
                            Either <Link href="https://github.com/Equicord/Equilotl">switch to an official build</Link> or figure your issue out yourself.
                        </Paragraph>

                        <BaseText size="md" weight="bold" className={Margins.top8}>You will be banned from receiving support if you ignore this rule.</BaseText>
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

        const equicordSupport = isEquicordSupport(props.message.author.id);

        const shouldAddUpdateButton =
            !IS_UPDATER_DISABLED
            && ((isSupportChannel(props.channel.id) && equicordSupport))
            && props.message.content?.toLowerCase().includes("update");

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

        if (isSupportChannel(props.channel.id) && PermissionStore.can(PermissionsBits.SEND_MESSAGES, props.channel) && equicordSupport) {
            if (props.message.content.includes("/equicord-debug") || props.message.content.includes("/equicord-plugins")) {
                buttons.push(
                    <Button
                        key="vc-dbg"
                        color={Button.Colors.PRIMARY}
                        onClick={async () => sendMessage(props.channel.id, { content: await generateDebugInfoMessage() })}
                    >
                        Run /equicord-debug
                    </Button>,
                    <Button
                        key="vc-plg-list"
                        color={Button.Colors.PRIMARY}
                        onClick={async () => {
                            const pluginList = generatePluginList();
                            if (typeof pluginList === "string") {
                                sendMessage(props.channel.id, { content: pluginList });
                            } else if (pluginList && typeof pluginList === "object" && pluginList.uploadFile) {
                                try {
                                    await uploadPluginListFile(props.channel.id, pluginList.fileContent, pluginList.filename);
                                    showToast("Plugin list uploaded successfully!", Toasts.Type.SUCCESS);
                                } catch (e) {
                                    new Logger("SupportHelper").error("Failed to upload plugin list:", e);
                                    showToast("Failed to upload plugin list", Toasts.Type.FAILURE);
                                }
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
                                    const result = await AsyncFunction(match[1])();
                                    const stringed = String(result);
                                    if (stringed) {
                                        await sendBotMessage(SelectedChannelStore.getChannelId(), {
                                            content: stringed
                                        });
                                    }

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
        if (!isAnyPluginDev(userId)) return null;
        if (RelationshipStore.isFriend(userId) || isAnyPluginDev(UserStore.getCurrentUser()?.id)) return null;

        return (
            <Card variant="warning" className={Margins.top8} defaultPadding>
                Please do not private message Equicord & Vencord plugin developers for support!
                <br />
                Instead, use the support channel: {Parser.parse("https://discord.com/channels/1173279886065029291/1297590739911573585")}
                {!ChannelStore.getChannel(SUPPORT_CHANNEL_ID) && " (Click the link to join)"}
            </Card>
        );
    }, { noop: true }),
});
