/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { reloadBadges } from "./index";

const settings = definePluginSettings({
    oneBadgePerChannel: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show only one badge per channel",
        onChange: reloadBadges,
    },
    showTextBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Text badge",
        onChange: reloadBadges,
    },
    showVoiceBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Voice badge",
        onChange: reloadBadges,
    },
    showCategoryBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Category badge",
        onChange: reloadBadges,
    },
    showDirectoryBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Directory badge",
        onChange: reloadBadges,
    },
    showAnnouncementThreadBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Announcement Thread badge",
        onChange: reloadBadges,
    },
    showPublicThreadBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Public Thread badge",
        onChange: reloadBadges,
    },
    showPrivateThreadBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Private Thread badge",
        onChange: reloadBadges,
    },
    showStageBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Stage badge",
        onChange: reloadBadges,
    },
    showAnnouncementBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Announcement badge",
        onChange: reloadBadges,
    },
    showForumBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Forum badge",
        onChange: reloadBadges,
    },
    showMediaBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Media badge",
        onChange: reloadBadges,
    },
    showNSFWBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show NSFW badge",
        onChange: reloadBadges,
    },
    showLockedBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Locked badge",
        onChange: reloadBadges,
    },
    showRulesBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Rules badge",
        onChange: reloadBadges,
    },
    showUnknownBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show Unknown badge",
        onChange: reloadBadges,
    },

    textBadgeLabel: {
        type: OptionType.STRING,
        default: "Text",
        description: "Text badge label",
        onChange: reloadBadges,
    },
    voiceBadgeLabel: {
        type: OptionType.STRING,
        default: "Voice",
        description: "Voice badge label",
        onChange: reloadBadges,
    },
    categoryBadgeLabel: {
        type: OptionType.STRING,
        default: "Category",
        description: "Category badge label",
        onChange: reloadBadges,
    },
    announcementBadgeLabel: {
        type: OptionType.STRING,
        default: "News",
        description: "Announcement badge label",
        onChange: reloadBadges,
    },
    announcementThreadBadgeLabel: {
        type: OptionType.STRING,
        default: "News Thread",
        description: "Announcement Thread badge label",
        onChange: reloadBadges,
    },
    publicThreadBadgeLabel: {
        type: OptionType.STRING,
        default: "Thread",
        description: "Public Thread badge label",
        onChange: reloadBadges,
    },
    privateThreadBadgeLabel: {
        type: OptionType.STRING,
        default: "Private Thread",
        description: "Private Thread badge label",
        onChange: reloadBadges,
    },
    stageBadgeLabel: {
        type: OptionType.STRING,
        default: "Stage",
        description: "Stage badge label",
        onChange: reloadBadges,
    },
    directoryBadgeLabel: {
        type: OptionType.STRING,
        default: "Directory",
        description: "Directory badge label",
        onChange: reloadBadges,
    },
    forumBadgeLabel: {
        type: OptionType.STRING,
        default: "Forum",
        description: "Forum badge label",
        onChange: reloadBadges,
    },
    mediaBadgeLabel: {
        type: OptionType.STRING,
        default: "Media",
        description: "Media badge label",
        onChange: reloadBadges,
    },
    nsfwBadgeLabel: {
        type: OptionType.STRING,
        default: "NSFW",
        description: "NSFW badge label",
        onChange: reloadBadges,
    },
    lockedBadgeLabel: {
        type: OptionType.STRING,
        default: "Locked",
        description: "Locked badge label",
        onChange: reloadBadges,
    },
    rulesBadgeLabel: {
        type: OptionType.STRING,
        default: "Rules",
        description: "Rules badge label",
        onChange: reloadBadges,
    },
    unknownBadgeLabel: {
        type: OptionType.STRING,
        default: "Unknown",
        description: "Unknown badge label",
        onChange: reloadBadges,
    },


    textBadgeColor: {
        type: OptionType.STRING,
        description: "Text badge color",
        onChange: reloadBadges,
    },
    voiceBadgeColor: {
        type: OptionType.STRING,
        description: "Voice badge color",
        onChange: reloadBadges,
    },
    categoryBadgeColor: {
        type: OptionType.STRING,
        description: "Category badge color",
        onChange: reloadBadges,
    },
    announcementBadgeColor: {
        type: OptionType.STRING,
        description: "Announcement badge color",
        onChange: reloadBadges,
    },
    announcementThreadBadgeColor: {
        type: OptionType.STRING,
        description: "Announcement Thread badge color",
        onChange: reloadBadges,
    },
    publicThreadBadgeColor: {
        type: OptionType.STRING,
        description: "Public Thread badge color",
        onChange: reloadBadges,
    },
    privateThreadBadgeColor: {
        type: OptionType.STRING,
        description: "Private Thread badge color",
        onChange: reloadBadges,
    },
    stageBadgeColor: {
        type: OptionType.STRING,
        description: "Stage badge color",
        onChange: reloadBadges,
    },
    directoryBadgeColor: {
        type: OptionType.STRING,
        description: "Directory badge color",
        onChange: reloadBadges,
    },
    forumBadgeColor: {
        type: OptionType.STRING,
        description: "Forum badge color",
        onChange: reloadBadges,
    },
    mediaBadgeColor: {
        type: OptionType.STRING,
        description: "Media badge color",
        onChange: reloadBadges,
    },
    nsfwBadgeColor: {
        type: OptionType.STRING,
        description: "NSFW badge color",
        onChange: reloadBadges,
    },
    lockedBadgeColor: {
        type: OptionType.STRING,
        description: "Locked badge color",
        onChange: reloadBadges,
    },
    rulesBadgeColor: {
        type: OptionType.STRING,
        description: "Rules badge color",
        onChange: reloadBadges,
    },
    unknownBadgeColor: {
        type: OptionType.STRING,
        description: "Unknown badge color",
        onChange: reloadBadges,
    },
});

const defaultValues = {
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

function isEnabled(type: number) {
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

function returnChannelBadge(type: number) {
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

export { defaultValues, isEnabled, returnChannelBadge, settings };
