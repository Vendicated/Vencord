/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getQuestifySettings, useQuestifySettings } from "../settings/access";
import { defaultClaimedSubsort, defaultExpiredSubsort, defaultIgnoredSubsort, defaultQuestOrder, defaultUnclaimedSubsort, type QuestOrderStatus, type QuestSubsort, type QuestTileColorSetting, type QuestTileGradient } from "../settings/def";
import { getIgnoredQuestIDs } from "../settings/ignoredQuests";
import { getQuestStatus, QuestStatus } from "./questState";
import { Quest, QuestTaskType, QuestTaskWatchVideo, QuestTaskWatchVideoOnMobile } from "./types";
import { adjustRGB, decimalToRGB, isDarkish, q, type RGB } from "./ui";

type QuestGroupKey = "claimed" | "expired" | "ignored" | "unclaimed" | "unknown";

export const desktopVideoCompatibilityQuestIds = new Set<string>();

interface QuestTileColorSettings {
    questTileUnclaimedColor: QuestTileColorSetting;
    questTileClaimedColor: QuestTileColorSetting;
    questTileIgnoredColor: QuestTileColorSetting;
    questTileExpiredColor: QuestTileColorSetting;
}

const customQuestTileClasses = [
    q("quest-item-restyle"),
    q("quest-item-intense-gradient"),
    q("quest-item-default-gradient"),
    q("quest-item-black-gradient"),
    q("quest-item-hide-gradient"),
    q("quest-item-contrast-logo"),
];

const sortFallbacks = {
    unclaimed: defaultUnclaimedSubsort,
    claimed: defaultClaimedSubsort,
    ignored: defaultIgnoredSubsort,
    expired: defaultExpiredSubsort,
} as const satisfies Record<string, QuestSubsort>;

const validSubsorts = new Set<QuestSubsort>([
    "Recent ASC",
    "Recent DESC",
    "Expiring ASC",
    "Expiring DESC",
    "Claimed ASC",
    "Claimed DESC",
]);

function getTileColorSetting(status: QuestStatus, colors: QuestTileColorSettings): QuestTileColorSetting | null {
    switch (status) {
        case QuestStatus.Claimed:
            return colors.questTileClaimedColor;
        case QuestStatus.Unclaimed:
            return colors.questTileUnclaimedColor;
        case QuestStatus.Ignored:
            return colors.questTileIgnoredColor;
        case QuestStatus.Expired:
            return colors.questTileExpiredColor;
        default:
            return null;
    }
}

function getQuestTileColor(quest: Quest & { dummyColor?: QuestTileColorSetting; }, colors: QuestTileColorSettings): number | null {
    const questStatus = getQuestStatus(quest, getIgnoredQuestIDs());
    const setting = quest.dummyColor ?? getTileColorSetting(questStatus, colors);

    if (!setting?.enabled) {
        return null;
    }

    return setting.color;
}

function getGradientClass(gradient: QuestTileGradient): string | null {
    if (gradient === "black") return q("quest-item-black-gradient");
    if (gradient === "hide") return q("quest-item-hide-gradient");
    if (gradient === "default") return q("quest-item-default-gradient");

    return q("quest-item-intense-gradient");
}

export function getQuestTileClasses(originalClasses: string, quest: Quest & { dummyColor?: QuestTileColorSetting; }, gradientOverride?: QuestTileGradient): string {
    const questTiles = useQuestifySettings([
        "disableQuestsEverything",
        "ignoredQuestIDs",
        "questTileUnclaimedColor",
        "questTileClaimedColor",
        "questTileIgnoredColor",
        "questTileExpiredColor",
        "questTileGradient",
    ]);

    const baseClasses = originalClasses
        .split(" ")
        .filter(cls => cls && !customQuestTileClasses.includes(cls));
    const colors: QuestTileColorSettings = {
        questTileUnclaimedColor: questTiles.questTileUnclaimedColor as QuestTileColorSetting,
        questTileClaimedColor: questTiles.questTileClaimedColor as QuestTileColorSetting,
        questTileIgnoredColor: questTiles.questTileIgnoredColor as QuestTileColorSetting,
        questTileExpiredColor: questTiles.questTileExpiredColor as QuestTileColorSetting,
    };
    const color = !questTiles.disableQuestsEverything
        ? getQuestTileColor(quest, colors)
        : null;

    if (color == null) {
        return baseClasses.join(" ");
    }

    const returnClasses = [...baseClasses, q("quest-item-restyle")];
    const gradient = gradientOverride ?? questTiles.questTileGradient as QuestTileGradient;
    const gradientClass = getGradientClass(gradient);

    if (gradientClass != null) {
        returnClasses.push(gradientClass);
    }

    if (gradient !== "black" && gradient !== "hide" && !isDarkish(decimalToRGB(color), 0.875)) {
        returnClasses.push(q("quest-item-contrast-logo"));
    }

    return returnClasses.join(" ");
}

export function getQuestTileStyle(quest: (Quest & { dummyColor?: QuestTileColorSetting; }) | null): Record<string, string> {
    const questTiles = useQuestifySettings([
        "disableQuestsEverything",
        "ignoredQuestIDs",
        "questTileUnclaimedColor",
        "questTileClaimedColor",
        "questTileIgnoredColor",
        "questTileExpiredColor",
    ]);

    const style: Record<string, string> = {};
    const colors: QuestTileColorSettings = {
        questTileUnclaimedColor: questTiles.questTileUnclaimedColor as QuestTileColorSetting,
        questTileClaimedColor: questTiles.questTileClaimedColor as QuestTileColorSetting,
        questTileIgnoredColor: questTiles.questTileIgnoredColor as QuestTileColorSetting,
        questTileExpiredColor: questTiles.questTileExpiredColor as QuestTileColorSetting,
    };
    const themeColor = quest && !questTiles.disableQuestsEverything
        ? getQuestTileColor(quest, colors)
        : null;

    if (themeColor == null) return style;

    const rgb = decimalToRGB(themeColor);
    const darkish = isDarkish(rgb);
    const sign = darkish ? 1 : -1;
    const questNameColor = adjustRGB(rgb, 200 * sign);
    const rewardTitleColor = adjustRGB(rgb, 150 * sign);
    const rewardDescriptionColor = adjustRGB(rgb, 100 * sign);
    const buttonNormalColor = adjustRGB(rgb, 50 * sign);
    const buttonHoverColor = adjustRGB(rgb, 75 * sign);

    function toRGB(value: RGB): string {
        return `rgb(${value.r}, ${value.g}, ${value.b})`;
    }

    style["--questify-color"] = toRGB(rgb);
    style["--questify-quest-name"] = toRGB(questNameColor);
    style["--questify-reward-title"] = toRGB(rewardTitleColor);
    style["--questify-reward-description"] = toRGB(rewardDescriptionColor);
    style["--questify-button-normal"] = toRGB(buttonNormalColor);
    style["--questify-button-hover"] = toRGB(buttonHoverColor);

    return style;
}

function createSortFunction(subsort: QuestSubsort): (a: Quest, b: Quest) => number {
    switch (subsort) {
        case "Recent ASC":
            return (a, b) => new Date(a.config.startsAt).getTime() - new Date(b.config.startsAt).getTime();
        case "Recent DESC":
            return (a, b) => new Date(b.config.startsAt).getTime() - new Date(a.config.startsAt).getTime();
        case "Expiring ASC":
            return (a, b) => new Date(a.config.expiresAt).getTime() - new Date(b.config.expiresAt).getTime();
        case "Expiring DESC":
            return (a, b) => new Date(b.config.expiresAt).getTime() - new Date(a.config.expiresAt).getTime();
        case "Claimed ASC":
            return (a, b) => new Date(a.userStatus?.claimedAt || 0).getTime() - new Date(b.userStatus?.claimedAt || 0).getTime();
        case "Claimed DESC":
            return (a, b) => new Date(b.userStatus?.claimedAt || 0).getTime() - new Date(a.userStatus?.claimedAt || 0).getTime();
    }
}

function getValidSubsort(value: unknown, fallback: QuestSubsort): QuestSubsort {
    return validSubsorts.has(value as QuestSubsort) ? value as QuestSubsort : fallback;
}

function getValidQuestOrder(value: unknown): QuestOrderStatus[] {
    const validStatuses = new Set<QuestOrderStatus>(defaultQuestOrder);
    const configuredOrder = Array.isArray(value)
        ? value
        : defaultQuestOrder;
    const order = configuredOrder.filter((status): status is QuestOrderStatus => validStatuses.has(status as QuestOrderStatus));

    for (const status of defaultQuestOrder) {
        if (!order.includes(status)) {
            order.push(status);
        }
    }

    return order;
}

function injectDesktopVideoQuestTasks(quests: Quest[]): void {
    for (const quest of quests) {
        const tasks = quest.config.taskConfigV2?.tasks;
        const mobileVideoTask = tasks?.[QuestTaskType.WATCH_VIDEO_ON_MOBILE] as QuestTaskWatchVideoOnMobile | undefined;

        if (!tasks || !mobileVideoTask || tasks[QuestTaskType.WATCH_VIDEO]) {
            continue;
        }

        const desktopVideoTask: QuestTaskWatchVideo = {
            ...mobileVideoTask,
            type: QuestTaskType.WATCH_VIDEO,
        };

        const reorderedTasks: typeof tasks = {};

        for (const [taskType, task] of Object.entries(tasks) as [QuestTaskType, typeof tasks[QuestTaskType]][]) {
            if (taskType === QuestTaskType.WATCH_VIDEO_ON_MOBILE) {
                reorderedTasks[QuestTaskType.WATCH_VIDEO] = desktopVideoTask;
            }

            reorderedTasks[taskType] = task;
        }

        quest.config.taskConfigV2.tasks = reorderedTasks;
        desktopVideoCompatibilityQuestIds.add(quest.id);
    }
}

export function hasInjectedDesktopVideoCompatibility(quest?: Quest | string | null): boolean {
    return !quest ? false : desktopVideoCompatibilityQuestIds.has(typeof quest === "string" ? quest : quest.id);
}

export function sortQuests(quests: Quest[], skip?: boolean): Quest[] {
    const questSorting = useQuestifySettings([
        "disableQuestsEverything",
        "ignoredQuestIDs",
        "makeMobileVideoQuestsDesktopCompatible",
        "completeVideoQuestsQuicker",
        "questOrder",
        "unclaimedSubsort",
        "claimedSubsort",
        "ignoredSubsort",
        "expiredSubsort",
        "autoCompleteQuestTypes",
    ]);

    if (questSorting.disableQuestsEverything) {
        return quests;
    }

    if (questSorting.makeMobileVideoQuestsDesktopCompatible || !!questSorting.autoCompleteQuestTypes.WATCH_VIDEO_ON_MOBILE) {
        injectDesktopVideoQuestTasks(quests);
    }

    if (skip) {
        return quests;
    }

    const ignoredQuestIds = getIgnoredQuestIDs();
    const questGroups: Record<QuestGroupKey, Quest[]> = {
        claimed: [],
        expired: [],
        ignored: [],
        unclaimed: [],
        unknown: [],
    };

    for (const quest of quests) {
        switch (getQuestStatus(quest, ignoredQuestIds)) {
            case QuestStatus.Claimed:
                questGroups.claimed.push(quest);
                break;
            case QuestStatus.Unclaimed:
                questGroups.unclaimed.push(quest);
                break;
            case QuestStatus.Expired:
                questGroups.expired.push(quest);
                break;
            case QuestStatus.Ignored:
                questGroups.ignored.push(quest);
                break;
            default:
                questGroups.unknown.push(quest);
                break;
        }
    }

    const unclaimedSortFunction = createSortFunction(getValidSubsort(questSorting.unclaimedSubsort, sortFallbacks.unclaimed));

    questGroups.unclaimed.sort((a, b) => {
        const aCompleted = !!a.userStatus?.completedAt;
        const bCompleted = !!b.userStatus?.completedAt;

        if (aCompleted !== bCompleted) {
            return aCompleted ? 1 : -1;
        }

        return unclaimedSortFunction(a, b);
    });

    questGroups.claimed.sort(createSortFunction(getValidSubsort(questSorting.claimedSubsort, sortFallbacks.claimed)));
    questGroups.ignored.sort(createSortFunction(getValidSubsort(questSorting.ignoredSubsort, sortFallbacks.ignored)));
    questGroups.expired.sort(createSortFunction(getValidSubsort(questSorting.expiredSubsort, sortFallbacks.expired)));

    return [
        ...getValidQuestOrder(questSorting.questOrder).flatMap(status => questGroups[status.toLowerCase() as QuestGroupKey]),
        ...questGroups.unknown,
    ];
}

export function shouldPreloadQuestAssets(): boolean {
    const settings = getQuestifySettings();

    return !settings.disableQuestsEverything && settings.questTilePreload;
}

export function getLastSortChoice(): string | null {
    const { rememberQuestPageSort, lastQuestPageSort } = getQuestifySettings();

    return rememberQuestPageSort ? lastQuestPageSort : "questify";
}

export function setLastSortChoice(sort: string): void {
    getQuestifySettings().lastQuestPageSort = sort || "questify";
}

function getFilterChoiceKey({ group, filter }: { group: string; filter: string; }): string {
    return JSON.stringify([group, filter]);
}

export function getLastFilterChoices(): { group: string, filter: string; }[] | null {
    const { rememberQuestPageFilters, lastQuestPageFilters } = getQuestifySettings();

    return rememberQuestPageFilters
        ? Object.values(lastQuestPageFilters).map(item => JSON.parse(JSON.stringify(item)))
        : null;
}

export function setLastFilterChoices(filters: { group: string, filter: string; }[] | null): void {
    if (!filters?.length) {
        getQuestifySettings().lastQuestPageFilters = {};

        return;
    }

    if (!filters.every(filter => filter?.group && filter?.filter)) {
        return;
    }

    getQuestifySettings().lastQuestPageFilters = JSON.parse(JSON.stringify(filters)).reduce((acc, item) => {
        acc[getFilterChoiceKey(item)] = item;

        return acc;
    }, {} as Record<string, { group: string, filter: string; }>);
}
