/*!
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

export * as Api from "./api";
export * as Components from "./components";
export * as Plugins from "./plugins";
export * as Util from "./utils";
export * as QuickCss from "./utils/quickCss";
export * as Updater from "./utils/updater";
export * as Webpack from "./webpack";
export { PlainSettings, Settings };

import "./utils/quickCss";
import "./webpack/patchWebpack";

import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { StartAt } from "@utils/types";

import { get as dsGet } from "./api/DataStore";
import { showNotification } from "./api/Notifications";
import { PlainSettings, Settings } from "./api/Settings";
import { patches, PMLogger, startAllPlugins } from "./plugins";
import { localStorage } from "./utils/localStorage";
import { relaunch } from "./utils/native";
import { getCloudSettings, putCloudSettings } from "./utils/settingsSync";
import { checkForUpdates, update, UpdateLogger } from "./utils/updater";
import { onceReady } from "./webpack";
import { SettingsRouter } from "./webpack/common";

if (IS_REPORTER) {
    require("./debug/runReporter");
}

async function syncSettings() {
    // pre-check for local shared settings
    if (
        Settings.cloud.authenticated &&
        !await dsGet("Vencord_cloudSecret") // this has been enabled due to local settings share or some other bug
    ) {
        // show a notification letting them know and tell them how to fix it
        showNotification({
            title: "Cloud Integrations",
            body: "We've noticed you have cloud integrations enabled in another client! Due to limitations, you will " +
                "need to re-authenticate to continue using them. Click here to go to the settings page to do so!",
            color: "var(--yellow-360)",
            onClick: () => SettingsRouter.open("VencordCloud")
        });
        return;
    }

    if (
        Settings.cloud.settingsSync && // if it's enabled
        Settings.cloud.authenticated // if cloud integrations are enabled
    ) {
        if (localStorage.Vencord_settingsDirty) {
            await putCloudSettings();
            delete localStorage.Vencord_settingsDirty;
        } else if (await getCloudSettings(false)) { // if we synchronized something (false means no sync)
            // we show a notification here instead of allowing getCloudSettings() to show one to declutter the amount of
            // potential notifications that might occur. getCloudSettings() will always send a notification regardless if
            // there was an error to notify the user, but besides that we only want to show one notification instead of all
            // of the possible ones it has (such as when your settings are newer).
            showNotification({
                title: "Cloud Settings",
                body: "Your settings have been updated! Click here to restart to fully apply changes!",
                color: "var(--green-360)",
                onClick: relaunch
            });
        }
    }
}
/* Settings.plugins = {
    "MessageEventsAPI": {
        "enabled": true
    },
    "CommandsAPI": {
        "enabled": true
    },
    "MenuItemDeobfuscatorAPI": {
        "enabled": true
    },
    "MessagePopoverAPI": {
        "enabled": true
    },
    "MessageAccessoriesAPI": {
        "enabled": true
    },
    "ServerListAPI": {
        "enabled": true
    },
    "BetterNotesBox": {
        "enabled": false
    },
    "TimeBarAllActivities": {
        "enabled": false
    },
    "AnonymiseFileNames": {
        "enabled": false,
        "method": 0,
        "randomisedLength": 7,
        "consistent": "image"
    },
    "BANger": {
        "enabled": false,
        "source": "https://i.imgur.com/wp5q52C.mp4"
    },
    "BetterGifAltText": {
        "enabled": false
    },
    "BetterRoleDot": {
        "enabled": false
    },
    "BetterUploadButton": {
        "enabled": false
    },
    "BlurNSFW": {
        "enabled": true,
        "blurAmount": 10
    },
    "CallTimer": {
        "enabled": true,
        "format": "stopwatch"
    },
    "EmoteCloner": {
        "enabled": true
    },
    "Experiments": {
        "enabled": true,
        "enableIsStaff": true,
        "forceStagingBanner": true,
        "toolbarDevMenu": true
    },
    "FakeNitro": {
        "enabled": false,
        "enableEmojiBypass": true,
        "enableStickerBypass": true,
        "enableStreamQualityBypass": true,
        "transformStickers": true,
        "transformEmojis": true,
        "transformCompoundSentence": false
    },
    "ForceOwnerCrown": {
        "enabled": true
    },
    "iLoveSpam": {
        "enabled": false
    },
    "IgnoreActivities": {
        "enabled": false
    },
    "LoadingQuotes": {
        "enabled": true,
        "replaceEvents": true,
        "enableDiscordPresetQuotes": true,
        "additionalQuotes": "",
        "additionalQuotesDelimiter": "|",
        "enablePluginPresetQuotes": true
    },
    "MemberCount": {
        "enabled": true,
        "memberList": true,
        "toolTip": true
    },
    "MessageLinkEmbeds": {
        "enabled": false
    },
    "MessageLogger": {
        "enabled": true,
        "deleteStyle": "text",
        "ignoreBots": false,
        "ignoreSelf": false,
        "ignoreUsers": "",
        "ignoreChannels": "",
        "ignoreGuilds": "",
        "logEdits": true,
        "logDeletes": true,
        "collapseDeleted": false,
        "inlineEdits": true
    },
    "NoBlockedMessages": {
        "enabled": false
    },
    "NoDevtoolsWarning": {
        "enabled": true
    },
    "NoReplyMention": {
        "enabled": false
    },
    "NoSystemBadge": {
        "enabled": false
    },
    "NoUnblockToJump": {
        "enabled": true
    },
    "NSFWGateBypass": {
        "enabled": true
    },
    "PlainFolderIcon": {
        "enabled": true
    },
    "PlatformIndicators": {
        "enabled": false,
        "list": true,
        "badges": true,
        "messages": true,
        "colorMobileIndicator": true
    },
    "ReverseImageSearch": {
        "enabled": true
    },
    "ReviewDB": {
        "enabled": false
    },
    "ShikiCodeblocks": {
        "enabled": false
    },
    "ShowHiddenChannels": {
        "enabled": true,
        "hideUnreads": true,
        "showMode": 0,
        "defaultAllowedUsersAndRolesDropdownState": true
    },
    "SilentTyping": {
        "enabled": false
    },
    "SortFriendRequests": {
        "enabled": false
    },
    "SpotifyControls": {
        "enabled": true,
        "hoverControls": false
    },
    "SpotifyCrack": {
        "enabled": false,
        "noSpotifyAutoPause": true,
        "keepSpotifyActivityOnIdle": false
    },
    "StartupTimings": {
        "enabled": false
    },
    "Unindent": {
        "enabled": false
    },
    "ReactErrorDecoder": {
        "enabled": true
    },
    "VoiceChatDoubleClick": {
        "enabled": false
    },
    "ViewIcons": {
        "enabled": false
    },
    "VolumeBooster": {
        "enabled": true,
        "multiplier": 2
    },
    "WebContextMenus": {
        "enabled": false,
        "addBack": true
    },
    "WhoReacted": {
        "enabled": false
    },
    "Settings": {
        "enabled": true,
        "settingsLocation": "aboveActivity"
    },
    "WebRichPresence (arRPC)": {
        "enabled": false
    },
    "ClearURLs": {
        "enabled": false
    },
    "ConsoleShortcuts": {
        "enabled": true
    },
    "CorruptMp4s": {
        "enabled": true
    },
    "UrbanDictionary": {
        "enabled": false
    },
    "Fart2": {
        "enabled": false
    },
    "FriendInvites": {
        "enabled": true
    },
    "FxTwitter": {
        "enabled": false
    },
    "HideAttachments": {
        "enabled": false
    },
    "KeepCurrentChannel": {
        "enabled": false
    },
    "LastFMRichPresence": {
        "enabled": false
    },
    "MessageClickActions": {
        "enabled": false
    },
    "MessageTags": {
        "enabled": false
    },
    "MoreCommands": {
        "enabled": false
    },
    "MoreKaomoji": {
        "enabled": true
    },
    "Moyai": {
        "enabled": false
    },
    "NoCanaryMessageLinks": {
        "enabled": false,
        "linkPrefix": "sex",
        "alwaysUseDiscordHost": true
    },
    "oneko": {
        "enabled": false
    },
    "petpet": {
        "enabled": true
    },
    "QuickMention": {
        "enabled": false
    },
    "QuickReply": {
        "enabled": false
    },
    "ReadAllNotificationsButton": {
        "enabled": true
    },
    "ServerListIndicators": {
        "enabled": false
    },
    "SpotifyShareCommands": {
        "enabled": false
    },
    "UwUifier": {
        "enabled": false
    },
    "ViewRaw": {
        "enabled": false
    },
    "BadgeAPI": {
        "enabled": true
    },
    "NoticesAPI": {
        "enabled": true
    },
    "NoTrack": {
        "enabled": true,
        "disableAnalytics": false
    },
    "MessageDecorationsAPI": {
        "enabled": true
    },
    "MemberListDecoratorsAPI": {
        "enabled": true
    },
    "NoScreensharePreview": {
        "enabled": false
    },
    "InvisibleChat": {
        "enabled": false,
        "savedPasswords": "password, Password"
    },
    "AlwaysTrust": {
        "enabled": false
    },
    "CustomRPC": {
        "enabled": false
    },
    "RevealAllSpoilers": {
        "enabled": false
    },
    "TypingTweaks": {
        "enabled": false
    },
    "VcNarrator": {
        "enabled": false
    },
    "NoF1": {
        "enabled": true
    },
    "NoRPC": {
        "enabled": false
    },
    "ContextMenuAPI": {
        "enabled": true
    },
    "MoreUserTags": {
        "enabled": true,
        "visibility_WEBHOOK": "always",
        "visibility_OWNER": "always",
        "visibility_ADMINISTRATOR": "always",
        "visibility_MODERATOR_STAFF": "always",
        "visibility_MODERATOR": "always",
        "visibility_VOICE_MODERATOR": "always",
        "tagSettings": {
            "WEBHOOK": {
                "text": "Webhook",
                "showInChat": true,
                "showInNotChat": true
            },
            "OWNER": {
                "text": "Owner",
                "showInChat": true,
                "showInNotChat": true
            },
            "ADMINISTRATOR": {
                "text": "Admin",
                "showInChat": true,
                "showInNotChat": true
            },
            "MODERATOR_STAFF": {
                "text": "Staff",
                "showInChat": true,
                "showInNotChat": true
            },
            "MODERATOR": {
                "text": "Mod",
                "showInChat": true,
                "showInNotChat": true
            },
            "VOICE_MODERATOR": {
                "text": "VC Mod",
                "showInChat": true,
                "showInNotChat": true
            },
            "CHAT_MODERATOR": {
                "text": "Chat Mod",
                "showInChat": true,
                "showInNotChat": true
            }
        }
    },
    "SettingsStoreAPI": {
        "enabled": false
    },
    "BetterFolders": {
        "enabled": false
    },
    "ColorSighted": {
        "enabled": false
    },
    "CrashHandler": {
        "enabled": true,
        "attemptToPreventCrashes": true,
        "attemptToNavigateToHome": false
    },
    "F8Break": {
        "enabled": false
    },
    "FakeProfileThemes": {
        "enabled": false
    },
    "FixInbox": {
        "enabled": false
    },
    "GameActivityToggle": {
        "enabled": false
    },
    "GifPaste": {
        "enabled": false
    },
    "ImageZoom": {
        "enabled": false
    },
    "RelationshipNotifier": {
        "enabled": false
    },
    "RoleColorEverywhere": {
        "enabled": false
    },
    "SilentMessageToggle": {
        "enabled": false
    },
    "SupportHelper": {
        "enabled": true
    },
    "TypingIndicator": {
        "enabled": false
    },
    "UserVoiceShow": {
        "enabled": false
    },
    "Wikisearch": {
        "enabled": false
    },
    "AlwaysAnimate": {
        "enabled": false
    },
    "PinDMs": {
        "enabled": false
    },
    "SendTimestamps": {
        "enabled": false
    },
    "ShowMeYourName": {
        "enabled": false
    },
    "USRBG": {
        "enabled": false
    },
    "GreetStickerPicker": {
        "enabled": false
    },
    "ShowAllMessageButtons": {
        "enabled": false
    },
    "ShowConnections": {
        "enabled": false
    },
    "TextReplace": {
        "enabled": false
    },
    "Translate": {
        "enabled": true,
        "autoTranslate": false,
        "receivedInput": "auto",
        "receivedOutput": "en",
        "sentInput": "auto",
        "sentOutput": "de",
        "showChatBarButton": true,
        "service": "google",
        "showAutoTranslateTooltip": true
    },
    "ValidUser": {
        "enabled": true
    },
    "VencordToolbox": {
        "enabled": false
    },
    "PermissionsViewer": {
        "enabled": true,
        "permissionsSortOrder": 1,
        "defaultPermissionsDropdownState": true
    },
    "FavoriteEmojiFirst": {
        "enabled": false
    },
    "BiggerStreamPreview": {
        "enabled": false
    },
    "MutualGroupDMs": {
        "enabled": false
    },
    "NoPendingCount": {
        "enabled": false
    },
    "NoProfileThemes": {
        "enabled": false
    },
    "UnsuppressEmbeds": {
        "enabled": false
    },
    "OpenInApp": {
        "enabled": true,
        "spotify": true,
        "steam": true,
        "epic": true,
        "tidal": true,
        "itunes": true
    },
    "CopyUserURLs": {
        "enabled": false
    },
    "FavoriteGifSearch": {
        "enabled": false
    },
    "FixSpotifyEmbeds": {
        "enabled": true
    },
    "NormalizeMessageLinks": {
        "enabled": false
    },
    "PreviewMessage": {
        "enabled": false
    },
    "SecretRingToneEnabler": {
        "enabled": false
    },
    "ThemeAttributes": {
        "enabled": false
    },
    "VoiceMessages": {
        "enabled": false,
        "noiseSuppression": true,
        "echoCancellation": true
    },
    "Dearrow": {
        "enabled": false
    },
    "PictureInPicture": {
        "enabled": false
    },
    "OnePingPerDM": {
        "enabled": false
    },
    "PermissionFreeWill": {
        "enabled": true,
        "lockout": true,
        "onboarding": true
    },
    "AI Noise Suppression": {
        "enabled": true
    },
    "WebKeybinds": {
        "enabled": true
    },
    "NoMosaic": {
        "enabled": false,
        "inlineVideo": true
    },
    "ClientTheme": {
        "enabled": false
    },
    "FixImagesQuality": {
        "enabled": false
    },
    "NoTypingAnimation": {
        "enabled": false
    },
    "SuperReactionTweaks": {
        "enabled": false
    },
    "Decor": {
        "enabled": false
    },
    "NotificationVolume": {
        "enabled": false
    },
    "XSOverlay": {
        "enabled": false
    },
    "BetterGifPicker": {
        "enabled": false
    },
    "FixCodeblockGap": {
        "enabled": false
    },
    "FixYoutubeEmbeds": {
        "enabled": true
    },
    "ChatInputButtonAPI": {
        "enabled": true
    },
    "DisableCallIdle": {
        "enabled": false
    },
    "NewGuildSettings": {
        "enabled": false
    },
    "BetterRoleContext": {
        "enabled": false
    },
    "FriendsSince": {
        "enabled": false
    },
    "ResurrectHome": {
        "enabled": false
    },
    "BetterSettings": {
        "enabled": false
    },
    "OverrideForumDefaults": {
        "enabled": false,
        "defaultLayout": 1,
        "defaultSortOrder": 0
    },
    "UnlockedAvatarZoom": {
        "enabled": false
    },
    "ShowHiddenThings": {
        "enabled": true,
        "showTimeouts": true,
        "showInvitesPaused": true,
        "showModView": true,
        "disableDiscoveryFilters": true,
        "disableDisallowedDiscoveryFilters": true
    },
    "BetterSessions": {
        "enabled": true,
        "backgroundCheck": false
    },
    "ImplicitRelationships": {
        "enabled": false
    },
    "StreamerModeOnStream": {
        "enabled": false
    },
    "ImageLink": {
        "enabled": false
    },
    "MessageLatency": {
        "enabled": false
    },
    "PauseInvitesForever": {
        "enabled": false
    },
    "ReplyTimestamp": {
        "enabled": false
    },
    "VoiceDownload": {
        "enabled": false
    },
    "WebScreenShareFixes": {
        "enabled": true
    },
    "ShowTimeoutDuration": {
        "enabled": false
    },
    "CtrlEnterSend": {
        "enabled": false
    },
    "NoServerEmojis": {
        "enabled": false
    },
    "ValidReply": {
        "enabled": true
    },
    "PartyMode": {
        "enabled": false,
        "superIntensePartyMode": 0
    },
    "ServerInfo": {
        "enabled": true
    },
    "MessageUpdaterAPI": {
        "enabled": true
    },
    "AppleMusicRichPresence": {
        "enabled": false
    },
    "AutomodContext": {
        "enabled": false
    },
    "CopyEmojiMarkdown": {
        "enabled": true
    },
    "CustomIdle": {
        "enabled": false
    },
    "DontRoundMyTimestamps": {
        "enabled": false
    },
    "MaskedLinkPaste": {
        "enabled": false
    },
    "UserSettingsAPI": {
        "enabled": true
    },
    "NoDefaultHangStatus": {
        "enabled": false
    },
    "NoOnboardingDelay": {
        "enabled": true
    },
    "ReplaceGoogleSearch": {
        "enabled": false
    },
    "Summaries": {
        "enabled": true,
        "summaryExpiryThresholdDays": 3
    },
    "YoutubeAdblock": {
        "enabled": false
    },
    "ConsoleJanitor": {
        "enabled": false
    },
    "MentionAvatars": {
        "enabled": false
    },
    "AlwaysExpandRoles": {
        "enabled": false
    },
    "CopyFileContents": {
        "enabled": false
    },
    "NoMaskedUrlPaste": {
        "enabled": false
    },
    "StickerPaste": {
        "enabled": false
    },
    "FullSearchContext": {
        "enabled": false
    },
    "AccountPanelServerProfile": {
        "enabled": false
    },
    "UserMessagesPronouns": {
        "enabled": false,
        "showSelf": true,
        "pronounsFormat": "LOWERCASE"
    },
    "DynamicImageModalAPI": {
        "enabled": true
    }
}; */
async function init() {
    await onceReady;
    startAllPlugins(StartAt.WebpackReady);

    syncSettings();

    if (!IS_WEB && !IS_UPDATER_DISABLED) {
        try {
            const isOutdated = await checkForUpdates();
            if (!isOutdated) return;

            if (Settings.autoUpdate) {
                await update();
                if (Settings.autoUpdateNotification)
                    setTimeout(() => showNotification({
                        title: "Vencord has been updated!",
                        body: "Click here to restart",
                        permanent: true,
                        noPersist: true,
                        onClick: relaunch
                    }), 10_000);
                return;
            }

            setTimeout(() => showNotification({
                title: "A Vencord update is available!",
                body: "Click here to view the update",
                permanent: true,
                noPersist: true,
                onClick: openUpdaterModal!
            }), 10_000);
        } catch (err) {
            UpdateLogger.error("Failed to check for updates", err);
        }
    }

    if (IS_DEV) {
        const pendingPatches = patches.filter(p => !p.all && p.predicate?.() !== false);
        if (pendingPatches.length)
            PMLogger.warn(
                "Webpack has finished initialising, but some patches haven't been applied yet.",
                "This might be expected since some Modules are lazy loaded, but please verify",
                "that all plugins are working as intended.",
                "You are seeing this warning because this is a Development build of Vencord.",
                "\nThe following patches have not been applied:",
                "\n\n" + pendingPatches.map(p => `${p.plugin}: ${p.find}`).join("\n")
            );
    }
}

startAllPlugins(StartAt.Init);
init();

document.addEventListener("DOMContentLoaded", () => {
    startAllPlugins(StartAt.DOMContentLoaded);

    if (IS_DISCORD_DESKTOP && Settings.winNativeTitleBar && navigator.platform.toLowerCase().startsWith("win")) {
        document.head.append(Object.assign(document.createElement("style"), {
            id: "vencord-native-titlebar-style",
            textContent: "[class*=titleBar]{display: none!important}"
        }));
    }
}, { once: true });
