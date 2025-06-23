/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { ErrorBoundary } from "@components/index";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { StartAt } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, Menu, React, RestAPI } from "@webpack/common";

import { QuestButton, updateOnQuestsPage } from "./button";
import { autoFetchCompatible, parseRestyleValue, settings } from "./settings";
import { addIgnoredQuest, adjustRGB, checkIsIgnoredQuest, decimalToRGB, getFormattedNow, isDarkish, normalizeQuestName, pruneAndUpdate, removeIgnoredQuest } from "./utils";

export let autoFetchInterval: null | ReturnType<typeof setInterval> = null;
export const QuickQuestsLogger = new Logger("QuickQuests");
export const QuestStore = findStoreLazy("QuestsStore");
export const questPath = "/discovery/quests";
const questEndpoint = "/quests/@me";

function getQuestTileClasses(originalClasses, quest) {
    const {
        reorderQuests,
        restyleQuests,
        ignoredQuests,
        gradientStyle,
    } = settings.use([
        "reorderQuests",
        "restyleQuests",
        "ignoredQuests",
        "gradientStyle",
    ]);

    const reorderClasses = [
        "vc-qq-quest-item-reorder-first",
        "vc-qq-quest-item-reorder-second",
        "vc-qq-quest-item-reorder-third",
        "vc-qq-quest-item-reorder-fourth"
    ];

    const customClasses = [
        "vc-qq-quest-item-restyle",
        "vc-qq-quest-item-smooth-gradient",
        "vc-qq-quest-item-contrast-gradient",
        "vc-qq-quest-item-hide-gradient",
        ...reorderClasses
    ];

    const questName = normalizeQuestName(quest.config.messages.questName);
    const claimedQuest = quest.userStatus?.claimedAt;
    const questExpired = new Date(quest.config.expiresAt) < new Date();
    const questIgnored = checkIsIgnoredQuest(questName);
    const [restyleUnclaimed, restyleClaimed, restyleIgnored, restyleExpired] = parseRestyleValue(restyleQuests);
    const baseClasses = (originalClasses || "").split(" ").filter(cls => cls && !customClasses.includes(cls));
    const returnClasses: string[] = [...baseClasses];
    let isRestyledAndDarkish: any = null;

    if (claimedQuest && restyleClaimed) {
        returnClasses.push("vc-qq-quest-item-restyle");
        isRestyledAndDarkish = isDarkish(decimalToRGB(restyleClaimed), 0.9);
    } else if (!claimedQuest && questExpired && restyleExpired) {
        returnClasses.push("vc-qq-quest-item-restyle");
        isRestyledAndDarkish = isDarkish(decimalToRGB(restyleExpired), 0.9);
    } else if (!claimedQuest && !questExpired && questIgnored && restyleIgnored) {
        returnClasses.push("vc-qq-quest-item-restyle");
        isRestyledAndDarkish = isDarkish(decimalToRGB(restyleIgnored), 0.9);
    } else if (!claimedQuest && !questExpired && !questIgnored && restyleUnclaimed) {
        returnClasses.push("vc-qq-quest-item-restyle");
        isRestyledAndDarkish = isDarkish(decimalToRGB(restyleUnclaimed), 0.9);
    }

    if (isRestyledAndDarkish !== null) {
        if (gradientStyle === "smooth-contrast") {
            if (isRestyledAndDarkish) {
                returnClasses.push("vc-qq-quest-item-smooth-gradient");
            } else {
                returnClasses.push("vc-qq-quest-item-contrast-gradient");
            }
        } else if (gradientStyle === "contrast") {
            returnClasses.push("vc-qq-quest-item-contrast-gradient");
        } else if (gradientStyle === "hide") {
            returnClasses.push("vc-qq-quest-item-hide-gradient");
        } else {
            returnClasses.push("vc-qq-quest-item-smooth-gradient");
        }
    }

    if (!!reorderQuests) {
        const orderList = reorderQuests.split(",").map(q => q.trim().toLowerCase());
        const questStatus = claimedQuest ? "claimed" : questExpired ? "expired" : questIgnored ? "ignored" : "unclaimed";
        const idx = orderList.indexOf(questStatus);

        if (idx >= 0 && idx < reorderClasses.length) {
            returnClasses.push(reorderClasses[idx]);
        }
    }

    return returnClasses.join(" ");
}

function getQuestTileStyle(quest) {
    const {
        restyleQuests,
        ignoredQuests,
    } = settings.use([
        "restyleQuests",
        "ignoredQuests",
    ]);

    const style: Record<string, string> = {};
    let color: any = null;

    const questName = normalizeQuestName(quest.config.messages.questName);
    const claimedQuest = quest.userStatus?.claimedAt;
    const questExpired = new Date(quest.config.expiresAt) < new Date();
    const questIgnored = checkIsIgnoredQuest(questName);
    const [restyleUnclaimed, restyleClaimed, restyleIgnored, restyleExpired] = parseRestyleValue(restyleQuests);

    const claimedColor = restyleClaimed ? decimalToRGB(restyleClaimed) : "";
    const unclaimedColor = restyleUnclaimed ? decimalToRGB(restyleUnclaimed) : "";
    const ignoredColor = restyleIgnored ? decimalToRGB(restyleIgnored) : "";
    const expiredColor = restyleExpired ? decimalToRGB(restyleExpired) : "";

    if (claimedQuest && claimedColor) {
        color = claimedColor;
    } else if (!claimedQuest && questExpired && expiredColor) {
        color = expiredColor;
    } else if (!claimedQuest && !questExpired && questIgnored && ignoredColor) {
        color = ignoredColor;
    } else if (!claimedQuest && !questExpired && !questIgnored && unclaimedColor) {
        color = unclaimedColor;
    }

    if (!color) return style;

    const darkish = isDarkish(color);
    const sign = darkish ? 1 : -1;

    style["--vc-qq-color"] = `rgb(${color.r}, ${color.g}, ${color.b})`;
    style["--vc-qq-quest-name"] = adjustRGB(color, 200 * sign);
    style["--vc-qq-reward-title"] = adjustRGB(color, 150 * sign);
    style["--vc-qq-reward-description"] = adjustRGB(color, 100 * sign);
    style["--vc-qq-button-normal"] = adjustRGB(color, 50 * sign);
    style["--vc-qq-button-hover"] = adjustRGB(color, 75 * sign);

    return style;
}

function shouldDisableQuestTileOptions(quest, markAsIgnored: boolean) {
    const questName = normalizeQuestName(quest.config.messages.questName);
    const completed = !!quest.userStatus?.completedAt;
    const expired = new Date(quest.config.expiresAt) < new Date();

    return completed || expired || (
        markAsIgnored ?
            !questName || checkIsIgnoredQuest(questName) :
            !questName || !checkIsIgnoredQuest(questName)
    );
}

function shouldHideQuestPopup(quest) {
    const { hideQuestPopup } = settings.use(["hideQuestPopup"]);
    return hideQuestPopup && !quest.userStatus?.progress;
}

function shouldPreloadAssets() {
    const { preloadAssets } = settings.use(["preloadAssets"]);
    return preloadAssets;
}

function QuestTileContextMenu(children, props) {
    children.unshift((
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="vc-qq-ignore-quests"
                label="Mark as Ignored"
                disabled={shouldDisableQuestTileOptions(props.quest, true)}
                action={() => { addIgnoredQuest(props.quest.config.messages.questName); }}
            />
            <Menu.MenuItem
                id="vc-qq-unignore-quests"
                label="Unmark as Ignored"
                disabled={shouldDisableQuestTileOptions(props.quest, false)}
                action={() => { removeIgnoredQuest(props.quest.config.messages.questName); }}
            />
        </Menu.MenuGroup>
    ));
}

export async function fetchAndDispatchQuests() {
    try {
        const { body } = await RestAPI.get({ url: questEndpoint, retries: 3 });

        function toCamelCase(str: string) {
            return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        }

        function convertKeysToCamelCase(obj: any): any {
            if (Array.isArray(obj)) {
                return obj.map(convertKeysToCamelCase);
            } else if (obj && typeof obj === "object") {
                return Object.fromEntries(
                    Object.entries(obj).map(([key, value]) => [
                        toCamelCase(key),
                        convertKeysToCamelCase(value)
                    ])
                );
            }

            return obj;
        }

        const camelBody = body ? convertKeysToCamelCase(body) : body;

        if (camelBody && camelBody.quests) {
            FluxDispatcher.dispatch({
                type: "QUESTS_MANUAL_FETCH_SUCCESS" as any,
                quests: camelBody.quests
            });
        }
    } catch (e) {
        QuickQuestsLogger.warn(`[${getFormattedNow()}] Failed to manually fetch quests:`, e);
    }
}

export function startAutoFetchQuests() {
    if (autoFetchInterval === null) {
        QuickQuestsLogger.info(`[${getFormattedNow()}] Starting hourly auto-fetch of quests.`);
        autoFetchInterval = setInterval(fetchAndDispatchQuests, 60 * 60 * 1000);
    }
}

export function stopAutoFetchQuests() {
    if (autoFetchInterval) {
        QuickQuestsLogger.info(`[${getFormattedNow()}] Stopping hourly auto-fetch of quests.`);
        clearInterval(autoFetchInterval);
        autoFetchInterval = null;
    }
}

export default definePlugin({
    name: "QuickQuests",
    description: "Add a Quests shortcut, style & reorder Quests, ignore Quests, hide the Quests popup, & more.",
    authors: [Devs.Etorix],
    dependencies: ["ServerListAPI"],
    startAt: StartAt.Init, // Needed in order to beat Read All Messages to inserting above the server list.
    settings,
    getQuestTileStyle,
    getQuestTileClasses,
    shouldHideQuestPopup,
    shouldPreloadAssets,

    patches: [
        {
            // Restyles quest tiles with colors and ordering.
            find: "id:\"quest-tile-\".concat",
            replacement: {
                match: /(concat\((\i)[^}]+},)className:(\i\(\)\([^)]+\)),/,
                replace: "$1className:$self.getQuestTileClasses($3, $2),style:$self.getQuestTileStyle($2),"
            }
        },
        {
            // Hides the occasional new quest popup if the setting is enabled.
            // If progress has been made on *any* quest, show the popup regardless as
            // it doubles as a progress tracker display for the currently active quest.
            find: "QUESTS_BAR,questId",
            replacement: {
                match: /return null==(\i)\?null:\(/,
                replace: "return null==$1?null:!$self.shouldHideQuestPopup($1)&&("
            }
        },
        {
            // Whether preloading assets is enabled or not, the placeholders loading
            // before the assets cause a lot of element shifting, whereas if
            // the elements load immediately instead, it doesn't.
            find: "rewardDescriptionContainer,children",
            replacement: {
                match: /showPlaceholder:!\i/,
                replace: "showPlaceholder:false"
            }
        },
        {
            // Encourages banners to load quicker if the setting is enabled.
            find: "id:\"quest-tile-\".concat",
            replacement: {
                match: /(warningHints:\i,)isVisibleInViewport:(\i)/,
                replace: "$1isVisibleInViewport:$self.shouldPreloadAssets()?true:$2"
            }
        },
        {
            // Encourages reward icons to load quicker if the setting is enabled.
            find: "id:\"quest-tile-\".concat",
            replacement: {
                match: /(onReceiveErrorHints:\i,)isVisibleInViewport:(\i)/,
                replace: "$1isVisibleInViewport:$self.shouldPreloadAssets()?true:$2"
            }
        },
    ],

    contextMenus: {
        "quests-entry": QuestTileContextMenu
    },

    flux: {
        CHANNEL_SELECT(data) {
            updateOnQuestsPage(window.location.pathname === questPath);
        },

        QUESTS_MANUAL_FETCH_SUCCESS(data) {
            QuickQuestsLogger.info(`[${getFormattedNow()}] [QUESTS_MANUAL_FETCH_SUCCESS]\n`, data);
            pruneAndUpdate(undefined, data.quests);
        },

        QUESTS_FETCH_CURRENT_QUESTS_SUCCESS(data) {
            QuickQuestsLogger.info(`[${getFormattedNow()}] [QUESTS_FETCH_CURRENT_QUESTS_SUCCESS]\n`, data);
            pruneAndUpdate();
        },

        QUESTS_ENROLL_SUCCESS(data) {
            QuickQuestsLogger.info(`[${getFormattedNow()}] [QUESTS_ENROLL_SUCCESS]\n`, data);
            pruneAndUpdate();
        },

        QUESTS_CLAIM_REWARD_SUCCESS(data) {
            QuickQuestsLogger.info(`[${getFormattedNow()}] [QUESTS_CLAIM_REWARD_SUCCESS]\n`, data);
            pruneAndUpdate();
        },

        QUESTS_CLAIM_REWARD_CODE_SUCCESS(data) {
            QuickQuestsLogger.info(`[${getFormattedNow()}] [QUESTS_CLAIM_REWARD_CODE_SUCCESS]\n`, data);
            pruneAndUpdate();
        },

        QUESTS_FETCH_QUEST_TO_DELIVER_SUCCESS(data) {
            QuickQuestsLogger.info(`[${getFormattedNow()}] [QUESTS_FETCH_QUEST_TO_DELIVER_SUCCESS]\n`, data);
            pruneAndUpdate();
        },
    },

    renderQuickQuestsButton: ErrorBoundary.wrap(QuestButton, { noop: true }),

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderQuickQuestsButton);

        if (settings.store.autoFetchQuests && autoFetchCompatible()) {
            startAutoFetchQuests();
        }
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderQuickQuestsButton);
        stopAutoFetchQuests();
    }
});
