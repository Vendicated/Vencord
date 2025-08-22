/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    oneBadgePerChannel: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show only one badge per channel",
        restartNeeded: true,
    },
    showTextBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Text badge",
        restartNeeded: true,
    },
    showVoiceBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Voice badge",
        restartNeeded: true,
    },
    showCategoryBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Category badge",
        restartNeeded: true,
    },
    showDirectoryBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Directory badge",
        restartNeeded: true,
    },
    showAnnouncementThreadBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Announcement Thread badge",
        restartNeeded: true,
    },
    showPublicThreadBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Public Thread badge",
        restartNeeded: true,
    },
    showPrivateThreadBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Private Thread badge",
        restartNeeded: true,
    },
    showStageBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Stage badge",
        restartNeeded: true,
    },
    showAnnouncementBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Announcement badge",
        restartNeeded: true,
    },
    showForumBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Forum badge",
        restartNeeded: true,
    },
    showMediaBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Media badge",
        restartNeeded: true,
    },
    showNSFWBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show NSFW badge",
        restartNeeded: true,
    },
    showLockedBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Locked badge",
        restartNeeded: true,
    },
    showRulesBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Rules badge",
        restartNeeded: true,
    },
    showUnknownBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Unknown badge",
        restartNeeded: true,
    },

    textBadgeLabel: {
        type: OptionType.STRING,
        default: "Text",
        description: "Text badge label",
        restartNeeded: true,
    },
    voiceBadgeLabel: {
        type: OptionType.STRING,
        default: "Voice",
        description: "Voice badge label",
        restartNeeded: true,
    },
    categoryBadgeLabel: {
        type: OptionType.STRING,
        default: "Category",
        description: "Category badge label",
        restartNeeded: true,
    },
    announcementBadgeLabel: {
        type: OptionType.STRING,
        default: "News",
        description: "Announcement badge label",
        restartNeeded: true,
    },
    announcementThreadBadgeLabel: {
        type: OptionType.STRING,
        default: "News Thread",
        description: "Announcement Thread badge label",
        restartNeeded: true,
    },
    publicThreadBadgeLabel: {
        type: OptionType.STRING,
        default: "Thread",
        description: "Public Thread badge label",
        restartNeeded: true,
    },
    privateThreadBadgeLabel: {
        type: OptionType.STRING,
        default: "Private Thread",
        description: "Private Thread badge label",
        restartNeeded: true,
    },
    stageBadgeLabel: {
        type: OptionType.STRING,
        default: "Stage",
        description: "Stage badge label",
        restartNeeded: true,
    },
    directoryBadgeLabel: {
        type: OptionType.STRING,
        default: "Directory",
        description: "Directory badge label",
        restartNeeded: true,
    },
    forumBadgeLabel: {
        type: OptionType.STRING,
        default: "Forum",
        description: "Forum badge label",
        restartNeeded: true,
    },
    mediaBadgeLabel: {
        type: OptionType.STRING,
        default: "Media",
        description: "Media badge label",
        restartNeeded: true,
    },
    nsfwBadgeLabel: {
        type: OptionType.STRING,
        default: "NSFW",
        description: "NSFW badge label",
        restartNeeded: true,
    },
    lockedBadgeLabel: {
        type: OptionType.STRING,
        default: "Locked",
        description: "Locked badge label",
        restartNeeded: true,
    },
    rulesBadgeLabel: {
        type: OptionType.STRING,
        default: "Rules",
        description: "Rules badge label",
        restartNeeded: true,
    },
    unknownBadgeLabel: {
        type: OptionType.STRING,
        default: "Unknown",
        description: "Unknown badge label",
        restartNeeded: true,
    },

    textBadgeColor: {
        type: OptionType.STRING,
        description: "Text badge color",
        restartNeeded: true,
    },
    voiceBadgeColor: {
        type: OptionType.STRING,
        description: "Voice badge color",
        restartNeeded: true,
    },
    categoryBadgeColor: {
        type: OptionType.STRING,
        description: "Category badge color",
        restartNeeded: true,
    },
    announcementBadgeColor: {
        type: OptionType.STRING,
        description: "Announcement badge color",
        restartNeeded: true,
    },
    announcementThreadBadgeColor: {
        type: OptionType.STRING,
        description: "Announcement Thread badge color",
        restartNeeded: true,
    },
    publicThreadBadgeColor: {
        type: OptionType.STRING,
        description: "Public Thread badge color",
        restartNeeded: true,
    },
    privateThreadBadgeColor: {
        type: OptionType.STRING,
        description: "Private Thread badge color",
        restartNeeded: true,
    },
    stageBadgeColor: {
        type: OptionType.STRING,
        description: "Stage badge color",
        restartNeeded: true,
    },
    directoryBadgeColor: {
        type: OptionType.STRING,
        description: "Directory badge color",
        restartNeeded: true,
    },
    forumBadgeColor: {
        type: OptionType.STRING,
        description: "Forum badge color",
        restartNeeded: true,
    },
    mediaBadgeColor: {
        type: OptionType.STRING,
        description: "Media badge color",
        restartNeeded: true,
    },
    nsfwBadgeColor: {
        type: OptionType.STRING,
        description: "NSFW badge color",
        restartNeeded: true,
    },
    lockedBadgeColor: {
        type: OptionType.STRING,
        description: "Locked badge color",
        restartNeeded: true,
    },
    rulesBadgeColor: {
        type: OptionType.STRING,
        description: "Rules badge color",
        restartNeeded: true,
    },
    unknownBadgeColor: {
        type: OptionType.STRING,
        description: "Unknown badge color",
        restartNeeded: true,
    },
});

export const defaultValues = {
    showTextBadge: true,
    showVoiceBadge: true,
    showCategoryBadge: true,
    showAnnouncementBadge: true,
    showAnnouncementThreadBadge: true,
    showPublicThreadBadge: true,
    showPrivateThreadBadge: true,
    showStageBadge: true,
    showDirectoryBadge: true,
    showForumBadge: true,
    showMediaBadge: true,
    showNSFWBadge: true,
    showLockedBadge: true,
    showRulesBadge: true,
    showUnknownBadge: true,

    channelBadges: {
        text: "Text",
        voice: "Voice",
        category: "Category",
        announcement: "News",
        announcement_thread: "News Thread",
        public_thread: "Thread",
        private_thread: "Private Thread",
        stage: "Stage",
        directory: "Directory",
        forum: "Forum",
        media: "Media",
        nsfw: "NSFW",
        locked: "Locked",
        rules: "Rules",
        unknown: "Unknown"
    },
    lockedBadgeTooltip: "This channel is locked.",
    nsfwBadgeTooltip: "This channel is marked as NSFW.",
};

export function isEnabled(type: number) {
    const fromValues = settings.store;

    switch (type) {
        case 0:
            return fromValues.showTextBadge;
        case 2:
            return fromValues.showVoiceBadge;
        case 4:
            return fromValues.showCategoryBadge;
        case 5:
            return fromValues.showAnnouncementBadge;
        case 10:
            return fromValues.showAnnouncementThreadBadge;
        case 11:
            return fromValues.showPublicThreadBadge;
        case 12:
            return fromValues.showPrivateThreadBadge;
        case 13:
            return fromValues.showStageBadge;
        case 14:
            return fromValues.showDirectoryBadge;
        case 15:
            return fromValues.showForumBadge;
        case 16:
            return fromValues.showMediaBadge;
        case 6100:
            return fromValues.showNSFWBadge;
        case 6101:
            return fromValues.showLockedBadge;
        case 6102:
            return fromValues.showRulesBadge;
        default:
            return fromValues.showUnknownBadge;
    }
}

export function returnChannelBadge(type: number) {
    switch (type) {
        case 0:
            return { css: "text", label: settings.store.textBadgeLabel, color: settings.store.textBadgeColor };
        case 2:
            return { css: "voice", label: settings.store.voiceBadgeLabel, color: settings.store.voiceBadgeColor };
        case 4:
            return { css: "category", label: settings.store.categoryBadgeLabel, color: settings.store.categoryBadgeColor };
        case 5:
            return { css: "announcement", label: settings.store.announcementBadgeLabel, color: settings.store.announcementBadgeColor };
        case 10:
            return { css: "announcement-thread", label: settings.store.announcementThreadBadgeLabel, color: settings.store.announcementThreadBadgeColor };
        case 11:
            return { css: "thread", label: settings.store.publicThreadBadgeLabel, color: settings.store.publicThreadBadgeColor };
        case 12:
            return { css: "private-thread", label: settings.store.privateThreadBadgeLabel, color: settings.store.privateThreadBadgeColor };
        case 13:
            return { css: "stage", label: settings.store.stageBadgeLabel, color: settings.store.stageBadgeColor };
        case 14:
            return { css: "directory", label: settings.store.directoryBadgeLabel, color: settings.store.directoryBadgeColor };
        case 15:
            return { css: "forum", label: settings.store.forumBadgeLabel, color: settings.store.forumBadgeColor };
        case 16:
            return { css: "media", label: settings.store.mediaBadgeLabel, color: settings.store.mediaBadgeColor };
        case 6100:
            return { css: "nsfw", label: settings.store.nsfwBadgeLabel, color: settings.store.nsfwBadgeColor };
        case 6101:
            return { css: "locked", label: settings.store.lockedBadgeLabel, color: settings.store.lockedBadgeColor };
        case 6102:
            return { css: "rules", label: settings.store.rulesBadgeLabel, color: settings.store.rulesBadgeColor };
        default:
            return { css: "unknown", label: settings.store.unknownBadgeLabel, color: settings.store.unknownBadgeColor };
    }
}
