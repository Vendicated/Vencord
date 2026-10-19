/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { HeaderBarButton } from "@api/HeaderBar";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings, migratePluginSettings, migratePluginToSettings } from "@api/Settings";
import { ShieldIcon, WarningIcon } from "@components/Icons";
import customRPC from "@plugins/customRPC";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { StandingState } from "@vencord/discord-types/enums";
import { findByCodeLazy } from "@webpack";
import { ApplicationCommandIndexStore, Menu, React, SafetyHubStore, SettingsRouter, UserGuildSettingsStore, UserStore, useStateFromStores, VoiceStateStore } from "@webpack/common";
import { ComponentType } from "react";

migratePluginSettings("EquiTweaks", "EquicordHelper");
migratePluginToSettings(true, "EquiTweaks", "NoBulletPoints", "noBulletPoints");
migratePluginToSettings(true, "EquiTweaks", "NoModalAnimation", "noModalAnimation");
migratePluginToSettings(true, "EquiTweaks", "GuildTagSettings", "disableAdoptTagPrompt");
migratePluginToSettings(true, "EquiTweaks", "ShowAllBadges", "showAllBadges");

const fetchSafetyHub: () => Promise<void> = findByCodeLazy("SAFETY_HUB_FETCH_START");

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
                onClick={() => SettingsRouter.openUserSettings("account_standing_panel")}
            />
        </div>
    );
}

const addAutoCorrectMenuItem: NavContextMenuPatchCallback = children => {
    const { enableAutoCorrect, autoCorrect } = settings.use(["enableAutoCorrect", "autoCorrect"]);
    if (!enableAutoCorrect) return;

    const group = findGroupChildrenByChildId("spellcheck-enabled", children, true);
    if (!group) return;

    const idx = group.findIndex(c => c?.props?.id?.includes("spellcheck-enabled"));
    group.splice(idx + 1, 0,
        <Menu.MenuCheckboxItem
            id="vc-enable-autocorrect"
            label="Enable Autocorrect"
            checked={autoCorrect}
            action={() => settings.store.autoCorrect = !settings.store.autoCorrect}
        />
    );
};

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
    disableHolidayNotifications: {
        type: OptionType.BOOLEAN,
        description: "Always use Discord's default notification sounds",
        restartNeeded: true,
        default: false,
    },
    jsonGateway: {
        type: OptionType.BOOLEAN,
        description: "Forces JSON on gateway reconnect",
        restartNeeded: true,
        default: false,
    },
    hideVoiceIndicatorForMutedChannels: {
        type: OptionType.BOOLEAN,
        description: "Hide voice indicator in server list when only active channels are muted",
        restartNeeded: true,
        default: false,
    },
    noOnboarding: {
        type: OptionType.BOOLEAN,
        description: "Skips the server onboarding by gaslighting it",
        restartNeeded: true,
        default: false,
    },
    showAllBadges: {
        type: OptionType.BOOLEAN,
        description: "Shows every profile badge instead of collapsing the rest behind +n",
        restartNeeded: true,
        default: false,
    },
    enableAutoCorrect: {
        type: OptionType.BOOLEAN,
        description: "Adds a chat box context menu toggle for native autocorrection and text replacements",
        restartNeeded: true,
        default: false
    },
    autoCorrect: {
        type: OptionType.BOOLEAN,
        description: "Use native autocorrection and text replacements in message editors",
        hidden: true,
        default: false
    }
});

export default definePlugin({
    name: "EquiTweaks",
    description: "A collection of small tweaks and fixes for Discord.",
    tags: ["Appearance", "Commands", "Utility"],
    dependencies: ["CommandsAPI", "HeaderBarAPI"],
    authors: [
        Devs.thororen,
        EquicordDevs.nyx,
        EquicordDevs.Naibuu,
        EquicordDevs.keircn,
        EquicordDevs.SerStars,
        EquicordDevs.mart,
        EquicordDevs.omaw,
        Devs.Samwich,
        Devs.AutumnVN,
        EquicordDevs.auggeeo,
        EquicordDevs.secp192k1,
        EquicordDevs.tie,
        EquicordDevs.itzmeshadow999
    ],
    settings,
    contextMenus: {
        "textarea-context": addAutoCorrectMenuItem
    },
    headerBarButton: {
        icon: ShieldIcon,
        render: () => (settings.store.accountStandingButton ? <StandingButton /> : null),
    },
    patches: [
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
            find: '="ABOVE"',
            predicate: () => settings.store.noModalAnimation,
            replacement: {
                match: /\?\?300/,
                replace: "??0",
            }
        },
        // Removes Modal Animation
        {
            find: ".SWITCH_THUMB_BACKGROUND_SELECTED_DEFAULT)",
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
            find: 'persistKey="SoundpackStore"',
            predicate: () => settings.store.disableHolidayNotifications,
            replacement: {
                match: /(?<=getSoundpack\(\)\{return )\i\.soundpack/,
                replace: '"classic"'
            }
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
            find: "DirectMessage: getSpringConfigs()",
            replacement: [
                {
                    match: /("data-drop-hovering".{0,100}selected:(?:\i|!0),upperBadge:)(\i)(?=,lowerBadge:\i)/g,
                    replace: "$1$self.hasUnmutedVoiceChannel(arguments[0]?.guild?.id)?$2:null"
                },
                {
                    match: /return (\i)\.type===\i\.\i\.GUILD_VOICE/,
                    replace: "$&&&!$self.isChannelMuted($1?.guildId,$1?.id)"
                },
                {
                    match: /\.afkChannelId\).{0,80}.filter\((\i)=>\i\.type===\i\.\i\.VOICE/,
                    replace: "$&&&!$self.isChannelMuted($1?.guildId,$1?.channelId)"
                },
                {
                    match: /\.getAllApplicationStreams\(\).filter\((\i)=>\i\.guildId===\i/,
                    replace: "$&&&!$self.isChannelMuted($1?.guildId,$1?.channelId)"
                },
                {
                    match: /\.getEmbeddedActivitiesForGuild\((\i)\)(?=.{0,100}\.flatMap\(\i=>)/,
                    replace: "$&.filter(e=>!$self.isChannelMuted($1?.guildId,e?.channelId))"
                }
            ],
            predicate: () => settings.store.hideVoiceIndicatorForMutedChannels,
        },
        {
            find: 'type:"GUILD_ONBOARDING_PROMPTS_FETCH_START"',
            replacement: {
                match: /(?<="GUILD_ONBOARDING_PROMPTS_FETCH_SUCCESS",guildId:\i,\.\.\.\i)(?=\})/,
                replace: ",enabled:!1"
            },
            predicate: () => settings.store.noOnboarding
        },
        {
            find: "UserProfileBadgeListRows",
            replacement: {
                match: /let (\i)=\i&&!\i(?=,\i=\1\?Math\.max\()/,
                replace: "let $1=!1"
            },
            predicate: () => settings.store.showAllBadges
        },
        // Add opening profile functionality to some connections
        {
            find: "getPlatformUserUrl:",
            replacement: [
                {
                    match: /name:("(?:Xbox|Epic Games)").{0,180}enabled:!0/g,
                    replace: "$&,getPlatformUserUrl:e=>$self.getPlatformUrl($1, e)"
                }
            ]
        },
        {
            find: "getSlateEditor:()=>",
            replacement: {
                match: /spellCheck:\i(?=,autoFocus:)/,
                replace: "$&,autoCorrect:$self.useAutoCorrect()"
            },
            predicate: () => settings.store.enableAutoCorrect
        },
        {
            find: "onPasteCapture:this.handlePasteCapture",
            replacement: {
                match: /autoCorrect:"off"(?=,"data-can-focus":)/,
                replace: 'autoCorrect:this.props.autoCorrect??"off"'
            },
            predicate: () => settings.store.enableAutoCorrect
        }
    ],
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
    },
    isChannelMuted(guildId: string, channelId: string) {
        const currentUserVoiceState = VoiceStateStore.getVoiceStateForUser(UserStore.getCurrentUser()?.id);
        if (currentUserVoiceState?.channelId === channelId) return false;
        return UserGuildSettingsStore.isChannelMuted(guildId, channelId);
    },
    hasUnmutedVoiceChannel(guildId: string) {
        const voiceStates = VoiceStateStore.getVoiceStates(guildId);
        const currentUserVoiceState = VoiceStateStore.getVoiceStateForUser(UserStore.getCurrentUser()?.id);

        return Object.values(voiceStates ?? {}).some(voiceState =>
            voiceState?.channelId === currentUserVoiceState?.channelId ||
            !UserGuildSettingsStore.isChannelMuted(guildId, voiceState?.channelId!)
        );
    },
    useAutoCorrect() {
        const { autoCorrect } = settings.use(["autoCorrect"]);
        return autoCorrect ? "on" : "off";
    },
    getPlatformUrl(platform, args) {
        switch (platform) {
            case "Xbox":
                return `https://www.xbox.com/play/user/${encodeURIComponent(args.name)}`;
            case "Epic Games":
                return `https://store.epicgames.com/u/${encodeURIComponent(args.id)}`;
            default:
                return null;
        }
    }
});

function textProcessing(text: string): string {
    return text.replace(/(^|\n)(\s*)([*+-])\s+/g, "$1$2\\$3 ");
}
