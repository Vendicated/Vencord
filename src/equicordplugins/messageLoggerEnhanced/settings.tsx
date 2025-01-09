/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { OptionType } from "@utils/types";
import { Alerts, Button } from "@webpack/common";
import { Settings } from "Vencord";

import { Native } from ".";
import { ImageCacheDir, LogsDir } from "./components/FolderSelectInput";
import { openLogModal } from "./components/LogsModal";
import { clearMessagesIDB } from "./db";
import { DEFAULT_IMAGE_CACHE_DIR } from "./utils/constants";
import { exportLogs, importLogs } from "./utils/settingsUtils";

export const settings = definePluginSettings({
    saveMessages: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Wether to save the deleted and edited messages.",
    },

    saveImages: {
        type: OptionType.BOOLEAN,
        description: "Save deleted attachments.",
        default: false
    },

    sortNewest: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Sort logs by newest.",
    },

    cacheMessagesFromServers: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Usually message logger only logs from whitelisted ids and dms, enabling this would mean it would log messages from all servers as well. Note that this may cause the cache to exceed its limit, resulting in some messages being missed. If you are in a lot of servers, this may significantly increase the chances of messages being logged, which can result in a large message record and the inclusion of irrelevant messages.",
    },

    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by bots",
        default: false,
        onChange() {
            // we will be handling the ignoreBots now (enabled or not) so the original messageLogger shouldnt
            Settings.plugins.MessageLogger.ignoreBots = false;
        }
    },

    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by yourself",
        default: false,
        onChange() {
            Settings.plugins.MessageLogger.ignoreSelf = false;
        }
    },

    ignoreMutedGuilds: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Messages in muted guilds will not be logged. Whitelisted users/channels in muted guilds will still be logged."
    },

    ignoreMutedCategories: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Messages in channels belonging to muted categories will not be logged. Whitelisted users/channels in muted guilds will still be logged."
    },

    ignoreMutedChannels: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Messages in muted channels will not be logged. Whitelisted users/channels in muted guilds will still be logged."
    },

    alwaysLogDirectMessages: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Always log DMs",
    },

    alwaysLogCurrentChannel: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Always log current selected channel. Blacklisted channels/users will still be ignored.",
    },

    permanentlyRemoveLogByDefault: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Vencord's base MessageLogger remove log button wiil delete logs permanently",
    },

    hideMessageFromMessageLoggers: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "When enabled, a context menu button will be added to messages to allow you to delete messages without them being logged by other loggers. Might not be safe, use at your own risk."
    },

    ShowLogsButton: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Toggle to whenever show the toolbox or not",
        restartNeeded: true,
    },

    messagesToDisplayAtOnceInLogs: {
        default: 100,
        type: OptionType.NUMBER,
        description: "Number of messages to display at once in logs & number of messages to load when loading more messages in logs.",
    },

    hideMessageFromMessageLoggersDeletedMessage: {
        default: "redacted eh",
        type: OptionType.STRING,
        description: "The message content to replace the message with when using the hide message from message loggers feature.",
    },

    messageLimit: {
        default: 200,
        type: OptionType.NUMBER,
        description: "Maximum number of messages to save. Older messages are deleted when the limit is reached. 0 means there is no limit"
    },

    attachmentSizeLimitInMegabytes: {
        default: 12,
        type: OptionType.NUMBER,
        description: "Maximum size of an attachment in megabytes to save. Attachments larger than this size will not be saved."
    },

    attachmentFileExtensions: {
        default: "png,jpg,jpeg,gif,webp,mp4,webm,mp3,ogg,wav",
        type: OptionType.STRING,
        description: "Comma separated list of file extensions to save. Attachments with file extensions not in this list will not be saved. Leave empty to save all attachments."
    },

    cacheLimit: {
        default: 1000,
        type: OptionType.NUMBER,
        description: "Maximum number of messages to store in the cache. Older messages are deleted when the limit is reached. This helps reduce memory usage and improve performance. 0 means there is no limit",
    },

    whitelistedIds: {
        default: "",
        type: OptionType.STRING,
        description: "Whitelisted server, channel, or user IDs."
    },

    blacklistedIds: {
        default: "",
        type: OptionType.STRING,
        description: "Blacklisted server, channel, or user IDs."
    },

    imageCacheDir: {
        type: OptionType.COMPONENT,
        description: "Select saved images directory",
        component: ErrorBoundary.wrap(ImageCacheDir) as any
    },

    logsDir: {
        type: OptionType.COMPONENT,
        description: "Select logs directory",
        component: ErrorBoundary.wrap(LogsDir) as any
    },

    importLogs: {
        type: OptionType.COMPONENT,
        description: "Import Logs From File",
        component: () =>
            <Button onClick={importLogs}>
                Import Logs
            </Button>
    },

    exportLogs: {
        type: OptionType.COMPONENT,
        description: "Export Logs From IndexedDB",
        component: () =>
            <Button onClick={exportLogs}>
                Export Logs
            </Button>
    },

    openLogs: {
        type: OptionType.COMPONENT,
        description: "Open Logs",
        component: () =>
            <Button onClick={() => openLogModal()}>
                Open Logs
            </Button>
    },
    openImageCacheFolder: {
        type: OptionType.COMPONENT,
        description: "Opens the image cache directory",
        component: () =>
            <Button
                disabled={
                    IS_WEB
                    || settings.store.imageCacheDir == null
                    || settings.store.imageCacheDir === DEFAULT_IMAGE_CACHE_DIR
                }
                onClick={() => Native.showItemInFolder(settings.store.imageCacheDir)}
            >
                Open Image Cache Folder
            </Button>
    },

    clearLogs: {
        type: OptionType.COMPONENT,
        description: "Clear Logs",
        component: () =>
            <Button
                color={Button.Colors.RED}
                onClick={() => Alerts.show({
                    title: "Clear Logs",
                    body: "Are you sure you want to clear all logs?",
                    confirmColor: Button.Colors.RED,
                    confirmText: "Clear",
                    cancelText: "Cancel",
                    onConfirm: () => {
                        clearMessagesIDB();
                    },
                })}
            >
                Clear Logs
            </Button>
    },

});
