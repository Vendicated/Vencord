/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { HeaderBarButton } from "@api/HeaderBar";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings, migratePluginToSettings, Settings } from "@api/Settings";
import { WarningIcon } from "@components/Icons";
import customRPC from "@plugins/customRPC";
import { Devs, EquicordDevs, GUILD_ID, SUPPORT_CHANNEL_ID, SUPPORT_CHANNEL_IDS, VC_SUPPORT_CHANNEL_IDS } from "@utils/constants";
import { isAnyPluginDev } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { StandingState } from "@vencord/discord-types/enums";
import { findByCodeLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Alerts, ApplicationCommandIndexStore, NavigationRouter, React, SettingsRouter, UserStore, useStateFromStores } from "@webpack/common";
import { ComponentType } from "react";

import { PluginButtons } from "./pluginButtons";
import { PluginCards } from "./pluginCards";

migratePluginToSettings(true, "EquicordHelper", "NoBulletPoints", "noBulletPoints");
migratePluginToSettings(true, "EquicordHelper", "NoModalAnimation", "noModalAnimation");
migratePluginToSettings(true, "EquicordHelper", "GuildTagSettings", "disableAdoptTagPrompt");

let clicked = false;

const SafetyHubStore = findStoreLazy("SafetyHubStore");
const fetchSafetyHub: () => Promise<void> = findByCodeLazy("SAFETY_HUB_FETCH_START");
const ShieldIcon = findComponentByCodeLazy("0 0 1-1.29-.88c-.36-.33-.7-.73-.88-1.13-.33-.");

const StandingConfig: Record<number, { label: string; hoverColor: string; Icon: ComponentType<any>; }> = {
    [StandingState.ALL_GOOD]: { label: "All good!", hoverColor: "var(--status-positive)", Icon: ShieldIcon },
    [StandingState.LIMITED]: { label: "Limited", hoverColor: "var(--status-warning)", Icon: WarningIcon },
    [StandingState.VERY_LIMITED]: { label: "Very limited", hoverColor: "var(--orange-345)", Icon: WarningIcon },
    [StandingState.AT_RISK]: { label: "At risk", hoverColor: "var(--status-danger)", Icon: WarningIcon },
    [StandingState.SUSPENDED]: { label: "Suspended", hoverColor: "var(--interactive-muted)", Icon: WarningIcon },
};

function StandingButton() {
    const standing = useStateFromStores([SafetyHubStore], () => SafetyHubStore.getAccountStanding());
    const isInitialized = useStateFromStores([SafetyHubStore], () => SafetyHubStore.isInitialized());
    const [hovered, setHovered] = React.useState(false);

    React.useEffect(() => {
        if (!isInitialized) fetchSafetyHub().catch(() => { });
    }, [isInitialized]);

    const config = StandingConfig[standing?.state] ?? StandingConfig[StandingState.ALL_GOOD];

    return (
        <div style={{ display: "contents" }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <HeaderBarButton
                tooltip={config.label}
                position="bottom"
                icon={props => <config.Icon {...props} color={hovered ? config.hoverColor : "currentColor"} />}
                onClick={() => SettingsRouter.openUserSettings("my_account_panel")}
            />
        </div>
    );
}

const listener = async (channelId, msg) => {
    if (!settings.store.noBulletPoints) return;
    msg.content = textProcessing(msg.content);
};

const settings = definePluginSettings({
    noMirroredCamera: {
        type: OptionType.BOOLEAN,
        description: "Prevents the camera from being mirrored on your screen",
        restartNeeded: true,
        default: false,
    },
    removeActivitySection: {
        type: OptionType.BOOLEAN,
        description: "Removes the activity section above member list",
        restartNeeded: true,
        default: false,
    },
    showYourOwnActivityButtons: {
        type: OptionType.BOOLEAN,
        description: "Discord hides your own activity buttons for some reason",
        restartNeeded: true,
        default: false,
    },
    refreshSlashCommands: {
        type: OptionType.BOOLEAN,
        description: "Refreshes Slash Commands to show newly added commands without restarting your client.",
        default: false,
    },
    forceRoleIcon: {
        type: OptionType.BOOLEAN,
        description: "Forces role icons to display next to messages in compact mode",
        restartNeeded: true,
        default: false
    },
    accountStandingButton: {
        type: OptionType.BOOLEAN,
        description: "Show an account standing button in the header bar",
        restartNeeded: true,
        default: false,
    },
    restoreFileDownloadButton: {
        type: OptionType.BOOLEAN,
        description: "Adds back the Download button at the top right corner of files",
        restartNeeded: true,
        default: false
    },
    noBulletPoints: {
        type: OptionType.BOOLEAN,
        description: "Stops you from typing markdown bullet points (stinky)",
        restartNeeded: true,
        default: false
    },
    noModalAnimation: {
        type: OptionType.BOOLEAN,
        description: "Remove the 300ms long animation when opening or closing modals",
        restartNeeded: true,
        default: false
    },
    disableAdoptTagPrompt: {
        type: OptionType.BOOLEAN,
        description: "Disable the prompt to adopt tags",
        restartNeeded: true,
        default: false,
    },
    jsonGateway: {
        type: OptionType.BOOLEAN,
        description: "Forces JSON on gateway reconnect",
        restartNeeded: true,
        default: false,
    }
});

export default definePlugin({
    name: "EquicordHelper",
    description: "Used to provide support, fix discord caused crashes, and other misc features.",
    tags: ["Appearance", "Commands", "Utility"],
    dependencies: ["CommandsAPI", "HeaderBarAPI", "MessageAccessoriesAPI"],
    authors: [
        Devs.thororen,
        EquicordDevs.nyx,
        EquicordDevs.Naibuu,
        EquicordDevs.keircn,
        EquicordDevs.SerStars,
        EquicordDevs.mart,
        EquicordDevs.omaw,
        Devs.Samwich,
        Devs.AutumnVN
    ],
    required: true,
    settings,
    headerBarButton: {
        icon: ShieldIcon,
        render: () => (settings.store.accountStandingButton ? <StandingButton /> : null),
    },
    patches: [
        // Fixes Unknown Resolution/FPS Crashing
        {
            find: "Unknown resolution:",
            replacement: [
                {
                    match: /throw Error\(`Unknown resolution: \$\{(\i)\}`\)/,
                    replace: "return $1;"
                },
                {
                    match: /throw Error\(`Unknown frame rate: \$\{(\i)\}`\)/,
                    replace: "return $1;"
                }
            ]
        },
        // When focused on voice channel or group chat voice call
        {
            find: ".STATUS_WARNING_BACKGROUND})})",
            predicate: () => settings.store.noMirroredCamera,
            replacement: {
                match: /mirror:\i/,
                replace: "mirror:!1"
            },
        },
        // Popout camera when not focused on voice channel
        {
            find: "this.handleReady})",
            all: true,
            predicate: () => settings.store.noMirroredCamera,
            replacement: {
                match: /(\[\i\.\i\]:)\i/,
                replace: "$1!1"
            },
        },
        // Overriding css on Preview Camera/Change Video Background popup
        {
            find: ".PREVIEW_CAMERA_MODAL,",
            replacement: {
                match: /className:\i.\i,(?=children:\()/,
                replace: "$&style:{transform: \"scalex(1)\"},"
            },
            predicate: () => settings.store.noMirroredCamera
        },
        // Remove Activity Section above Member List
        {
            find: ".GLOBAL_FEED});",
            predicate: () => settings.store.removeActivitySection,
            replacement: {
                match: /null==\i\|\|0.{0,100}VIEW_CHANNEL\)&&/,
                replace: "true||$&"
            },
        },
        // Show your own activity buttons because discord removes them for who knows why
        {
            find: ".USER_PROFILE_ACTIVITY_BUTTONS),",
            predicate: () => settings.store.showYourOwnActivityButtons && !isPluginEnabled(customRPC.name),
            replacement: {
                match: /.getId\(\)===\i.id/,
                replace: "$& && false"
            }
        },
        // Force Role Icon
        {
            find: "#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}",
            predicate: () => settings.store.forceRoleIcon,
            replacement: {
                match: /(?<=\}\):null\].{0,150}\?2:)0(?=\})/,
                replace: "1"
            }
        },
        // Restore File Download Button
        {
            find: '"VISUAL_PLACEHOLDER":',
            predicate: () => settings.store.restoreFileDownloadButton,
            replacement: {
                match: /(\.downloadUrl,showDownload:)\i/,
                replace: "$1!0"
            }
        },
        // Removes Modal Animation
        {
            find: "DURATION_IN:",
            predicate: () => settings.store.noModalAnimation,
            replacement: {
                match: /300,/,
                replace: "0,",
            }
        },
        // Removes Modal Animation
        {
            find: 'backdropFilter:"blur(0px)"',
            predicate: () => settings.store.noModalAnimation,
            replacement: {
                match: /\?0:200/,
                replace: "?0:0",
            }
        },
        // Removes Modal Animation
        {
            find: '="ABOVE"',
            predicate: () => settings.store.noModalAnimation,
            replacement: {
                match: /\?\?300/,
                replace: "??0",
            }
        },
        // Removes Modal Animation
        {
            find: "renderLurkerModeUpsellPopout,position:",
            predicate: () => settings.store.noModalAnimation,
            replacement: {
                match: /200:300/g,
                replace: "0:0",
            },
        },
        {
            find: "GuildTagAvailableCoachmark",
            replacement: {
                match: /return.{0,200}GUILD_TAG_COACHMARK_ASSET/g,
                replace: "return null;$&"
            },
            predicate: () => settings.store.disableAdoptTagPrompt
        },
        {
            find: "JSONEncoding",
            replacement: {
                match: /void 0!==\i\?\i:/,
                replace: ""
            },
            predicate: () => settings.store.jsonGateway
        },
        {
            find: ".USE_OSX_NATIVE_TRAFFIC_LIGHTS",
            replacement: {
                match: /case \i\.\i\.WINDOWS:/,
                replace: 'case "WEB":'
            },
            predicate: () => Settings.winNativeTitleBar,
        },
        {
            find: '"refresh-title-bar-small"',
            replacement: [
                {
                    match: /\i===\i\.PlatformTypes\.WINDOWS/g,
                    replace: "false"
                },
                {
                    match: /\i===\i\.PlatformTypes\.WEB/g,
                    replace: "true"
                }
            ],
            predicate: () => Settings.winNativeTitleBar,
        }
    ],
    renderMessageAccessory(props) {
        return (
            <>
                <PluginButtons message={props.message} />
                <PluginCards message={props.message} />
            </>
        );
    },
    flux: {
        async CHANNEL_SELECT({ channelId }) {
            const isSupportChannel = SUPPORT_CHANNEL_IDS.includes(channelId);
            if (!isSupportChannel) return;

            const selfId = UserStore.getCurrentUser()?.id;
            if (!selfId || isAnyPluginDev(selfId)) return;
            if (VC_SUPPORT_CHANNEL_IDS.includes(channelId) && !clicked) {
                return Alerts.show({
                    title: "Vencord Support Channel Warning",
                    body: "Before asking for help. Check updates and if this issue is actually caused by Equicord!",
                    confirmText: "Equicord Support",
                    onConfirm() {
                        NavigationRouter.transitionTo(`/channels/${GUILD_ID}/${SUPPORT_CHANNEL_ID}`);
                    },
                    cancelText: "Okay continue",
                    onCancel() {
                        clicked = true;
                    },
                });
            }
        },
    },
    commands: [
        {
            name: "refresh-commands",
            description: "Refresh Slash Commands",
            inputType: ApplicationCommandInputType.BUILT_IN,
            predicate: () => settings.store.refreshSlashCommands,
            execute: async (opts, ctx) => {
                try {
                    ApplicationCommandIndexStore.indices = {};
                    sendBotMessage(ctx.channel.id, { content: "Slash Commands refreshed successfully." });
                }
                catch (e) {
                    console.error("[refreshSlashCommands] Failed to refresh commands:", e);
                    sendBotMessage(ctx.channel.id, { content: "Failed to refresh commands. Check console for details." });
                }
            }
        }
    ],
    start() {
        if (settings.store.noBulletPoints) {
            addMessagePreSendListener(listener);
        }
    },
    stop() {
        if (settings.store.noBulletPoints) {
            removeMessagePreSendListener(listener);
        }
    }
});

function textProcessing(text: string): string {
    return text.replace(/(^|\n)(\s*)([*+-])\s+/g, "$1$2\\$3 ");
}
