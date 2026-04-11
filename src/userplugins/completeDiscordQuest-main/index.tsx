/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { FluxDispatcher, RestAPI } from "@webpack/common";

import { QuestButton, QuestsCount } from "./components/QuestButton";
import { questHandlers } from "./handlers";
import { bypassCaptcha, cleanupCaptchaMonitor, clearTokenCache, detectCaptchaChallenge, patchRequestWithCaptchaBypass, setupCaptchaMonitor, startTokenCacheCleanup, stopTokenCacheCleanup } from "./handlers/captcha";
import settings from "./settings";
import { ChannelStore, GuildChannelStore, QuestsStore, RunningGameStore } from "./stores";
import { SpoofingProfile, SpoofingSpeedMode } from "./types/spoofing";
import { callWithRetry } from "./utils/retry";

const QuestApplyAction = findByCodeLazy("type:\"QUESTS_ENROLL_BEGIN\"") as (questId: string, action: QuestAction) => Promise<any>;
const QuestClaimAction = findByCodeLazy("type:\"QUESTS_CLAIM_REWARD_BEGIN\"") as (questId: string, action: QuestAction) => Promise<any>;
const QuestLocationMap = findByPropsLazy("QUEST_HOME_DESKTOP", "11") as Record<string, any>;

let availableQuests: QuestValue[] = [];
let acceptableQuests: QuestValue[] = [];
let completableQuests: QuestValue[] = [];
let claimableQuests: QuestValue[] = [];

const completingQuest = new Map();
const fakeGames = new Map();
const fakeApplications = new Map();
const claimingQuest = new Set<string>();

let captchaMonitor: MutationObserver | null = null;

const rewardPreferenceCache = new Map<string, boolean>();
let updateQuestsTimeout: NodeJS.Timeout | null = null;
let lastProcessedQuestIds = new Set<string>();

let cachedRunningGames: any[] | null = null;
let cachedStreamMetadata: any | null = null;

function invalidateGamesCache() {
    cachedRunningGames = null;
}

function invalidateApplicationsCache() {
    cachedStreamMetadata = null;
}

function addFakeGame(questId: string, game: any) {
    fakeGames.set(questId, game);
    invalidateGamesCache();
}

function removeFakeGame(questId: string) {
    const result = fakeGames.delete(questId);
    if (result) invalidateGamesCache();
    return result;
}

function addFakeApplication(questId: string, app: any) {
    fakeApplications.set(questId, app);
    invalidateApplicationsCache();
}

function removeFakeApplication(questId: string) {
    const result = fakeApplications.delete(questId);
    if (result) invalidateApplicationsCache();
    return result;
}




const RewardPreference = {
    ANY: "any",
    NITRO: "nitro",
    AVATAR_DECORATION: "avatar_decoration",
    GAME_ITEM: "game_item",
    CURRENCY: "currency",
} as const;

type RewardPreference = (typeof RewardPreference)[keyof typeof RewardPreference];

const NitroSkuIds = new Set<string>([
    "521842865731829760",
    "521846918637420545",
]);

function getQuestRewardCategories(quest: QuestValue): RewardPreference[] {
    const rewards = quest.config?.rewardsConfig?.rewards ?? [];
    if (rewards.length === 0) {
        return [RewardPreference.GAME_ITEM];
    }

    const categories = new Set<RewardPreference>();

    for (const reward of rewards) {
        const rewardName = reward.messages?.name ?? "";
        const rewardLabel = `${rewardName} ${reward.messages?.nameWithArticle ?? ""}`.toLowerCase();
        if (NitroSkuIds.has(reward.skuId) || rewardLabel.includes("nitro")) {
            categories.add(RewardPreference.NITRO);
        }
        if (reward.orbQuantity > 0 || rewardLabel.includes("orb")) {
            categories.add(RewardPreference.CURRENCY);
        }
        if (rewardLabel.includes("avatar decoration") || rewardLabel.includes("profile decoration") || rewardLabel.includes("decoration")) {
            categories.add(RewardPreference.AVATAR_DECORATION);
        }
    }

    if (categories.size === 0) {
        categories.add(RewardPreference.GAME_ITEM);
    }

    return [...categories];
}

function questMatchesRewardPreference(quest: QuestValue) {
    const preference = (settings.store.preferredRewardType ?? RewardPreference.ANY) as RewardPreference;
    if (preference === RewardPreference.ANY) {
        return true;
    }

    const cacheKey = `${quest.id}-${preference}`;
    if (rewardPreferenceCache.has(cacheKey)) {
        return rewardPreferenceCache.get(cacheKey)!;
    }

    const rewardCategories = getQuestRewardCategories(quest);
    const matches = rewardCategories.includes(preference);
    rewardPreferenceCache.set(cacheKey, matches);
    return matches;
}

function getSpoofingProfile(): SpoofingProfile {
    const mode = (settings.store.spoofingSpeedMode ?? SpoofingSpeedMode.BALANCED) as SpoofingSpeedMode;

    switch (mode) {
        case SpoofingSpeedMode.SPEEDRUN:
            return {
                video: { maxFuture: 9999, speed: 60, interval: 0.15 },
                playActivity: { intervalMs: 2_000 },
            };
        case SpoofingSpeedMode.STEALTH:
            return {
                video: { maxFuture: 5, speed: 1, interval: 1 },
                playActivity: { intervalMs: 25_000 },
            };
        case SpoofingSpeedMode.BALANCED:
        default:
            return {
                video: { maxFuture: 10, speed: 7, interval: 1 },
                playActivity: { intervalMs: 20_000 },
            };
    }
}

function gatherRedeemCodes(body: any): string[] {
    const codes = new Set<string>();
    const codePattern = /^[A-Za-z0-9-]{10,}$/;

    const isValidRedeemCode = (str: string): boolean => {
        if (!codePattern.test(str)) return false;
        if (/^\d+$/.test(str)) return false;
        if (str.length < 10 || str.length > 50) return false;
        const letterCount = (str.match(/[A-Za-z]/g) || []).length;
        const hasHyphen = str.includes("-");
        return letterCount >= 3 || (letterCount >= 2 && hasHyphen);
    };

    const isCodeRelatedKey = (key: string): boolean => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes("code") ||
            lowerKey.includes("redemption") ||
            lowerKey.includes("reward") ||
            lowerKey.includes("claim") ||
            lowerKey.includes("gift") ||
            lowerKey.includes("key") ||
            lowerKey.includes("voucher") ||
            lowerKey.includes("token");
    };

    const walk = (value: any, depth: number, parentKey: string = "") => {
        if (depth > 6 || value == null) return;

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (isValidRedeemCode(trimmed)) {
                codes.add(trimmed);
                console.log(`[CompleteDiscordQuest] Found potential code: ${trimmed} (from key: ${parentKey})`);
            }
            return;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                walk(item, depth + 1, parentKey);
            }
            return;
        }

        if (typeof value === "object") {
            for (const [key, val] of Object.entries(value)) {
                if (isCodeRelatedKey(key) || isCodeRelatedKey(parentKey)) {
                    walk(val, depth + 1, key);
                } else {
                    walk(val, depth + 1, key);
                }
            }
        }
    };

    console.log("[CompleteDiscordQuest] Scanning response for codes:", JSON.stringify(body, null, 2).substring(0, 1000));
    walk(body, 0);
    return Array.from(codes);
}


function appendRedeemCodes(codes: string[], questName: string) {
    if (codes.length === 0) return;
    const timestamp = new Date().toLocaleString();
    const existing = (settings.store.redeemCodes ?? "").split("\n").map(x => x.trim()).filter(Boolean);
    const existingCodes = existing.map(line => line.split(" ")[0]);

    const newEntries = codes
        .filter(code => !existingCodes.includes(code))
        .map(code => `${code} (${questName} - ${timestamp})`);

    if (newEntries.length === 0) return;

    const merged = [...newEntries, ...existing];
    settings.store.redeemCodes = merged.join("\n");
    console.log("[CompleteDiscordQuest] Saved redeem codes:", newEntries.map(e => e.split(" ")[0]).join(", "));
}

async function claimQuestReward(quest: QuestValue) {
    if (!settings.store.autoClaimRewards) return;
    if (claimingQuest.has(quest.id)) return;
    if (quest.userStatus?.claimedAt) return;

    const questName = quest.config.messages.questName ?? quest.id;
    const endpoints = [`/quests/${quest.id}/claim-reward`];

    let claimPayload: any = {
        platform: 0,
        location: QuestLocationMap?.QUEST_HOME_DESKTOP ?? 11,
        is_targeted: false,
        metadata_raw: null,
    };

    if (settings.store.autoCaptchaSolving) {
        claimPayload = patchRequestWithCaptchaBypass(claimPayload);
    }

    claimingQuest.add(quest.id);
    try {
        let claimed = false;
        const collectedCodes: string[] = [];
        const tryClaim = async (fn: () => Promise<any>, label: string) => {
            try {
                const res = await callWithRetry(fn, { label: "claim-reward" });
                const codes = gatherRedeemCodes(res?.body ?? res);
                if (codes.length > 0) {
                    collectedCodes.push(...codes);
                }
                return true;
            } catch (err: any) {
                if (settings.store.autoCaptchaSolving) {
                    const challenge = detectCaptchaChallenge(err);
                    if (challenge) {
                        console.log("[CompleteDiscordQuest] Captcha detected during claim, bypassing...");
                        const bypassResult = await bypassCaptcha(challenge);
                        if (bypassResult.success && bypassResult.token) {
                            try {
                                const retryRes = await callWithRetry(fn, { label: "claim-reward-with-captcha" });
                                const codes = gatherRedeemCodes(retryRes?.body ?? retryRes);
                                if (codes.length > 0) {
                                    collectedCodes.push(...codes);
                                }
                                return true;
                            } catch (retryErr) {
                                console.warn(`[CompleteDiscordQuest] Claim retry with captcha failed for ${questName}`, retryErr);
                            }
                        }
                    }
                }
                console.warn(`[CompleteDiscordQuest] Claim attempt failed (${label}) for quest ${questName}`, err);
                return false;
            }
        };

        for (const url of endpoints) {
            if (claimed) break;
            claimed = await tryClaim(() => RestAPI.post({ url, body: claimPayload }), `${url} (with body)`);
        }

        if (!claimed) {
            claimed = await tryClaim(() => RestAPI.get({ url: `/quests/${quest.id}/reward-code` }), "reward-code");
        }
        if (claimed) {
            appendRedeemCodes(collectedCodes, questName);
            console.log("Claimed reward for quest:", questName);
        } else {
            console.error("Failed to claim reward for quest:", questName);
        }
    } finally {
        claimingQuest.delete(quest.id);
    }
}

function handleQuestCompletion(quest: QuestValue) {
    completingQuest.set(quest.id, false);
    void claimQuestReward(quest);
}

export default definePlugin({
    name: "CompleteDiscordQuest",
    description: "A plugin that completes multiple discord quests in background simultaneously.",
    authors: [{
        name: "Talya1412",
        id: 935942283214344302n
    }],
    settings,
    patches: [
        {
            find: ".winButtonsWithDivider]",
            replacement: {
                match: /(\((\i)\){)(let{leading)/,
                replace: "$1$2?.trailing?.props?.children?.unshift($self.renderQuestButtonTopBar());$3"
            }
        },
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /className:\i\.buttons,.+?children:\[/,
                replace: "$&$self.renderQuestButtonSettingsBar(),"
            }
        },
        {
            find: "\"innerRef\",\"navigate\",\"onClick\"",
            replacement: {
                match: /(\i).createElement\("a",(\i)\)/,
                replace: "$1.createElement(\"a\",$self.renderQuestButtonBadges($2))"
            }
        },
        {
            find: "location:\"GlobalDiscoverySidebar\"",
            replacement: {
                match: /(\(\i\){let{tab:(\i)}=.+?children:\i}\))(]}\))/,
                replace: "$1,$self.renderQuestButtonBadges($2)$3"
            }
        }
    ],
    start: () => {
        QuestsStore.addChangeListener(updateQuestsDebounced);
        updateQuests();

        // Always setup captcha monitor for auto-click checkbox feature
        const servicePreference = settings.store.autoCaptchaSolving ?
            settings.store.captchaSolvingService : "fallback";
        const apiKeys = settings.store.autoCaptchaSolving ? {
            nopecha: settings.store.nopchaApiKey,
            twoCaptcha: settings.store.twoCaptchaApiKey,
            capsolver: settings.store.capsolverApiKey,
        } : undefined;

        captchaMonitor = setupCaptchaMonitor(servicePreference, apiKeys);

        startTokenCacheCleanup();
    },
    stop: () => {
        QuestsStore.removeChangeListener(updateQuestsDebounced);
        if (updateQuestsTimeout) {
            clearTimeout(updateQuestsTimeout);
            updateQuestsTimeout = null;
        }
        stopCompletingAll();

        stopTokenCacheCleanup();
        clearTokenCache();

        if (captchaMonitor) {
            cleanupCaptchaMonitor(captchaMonitor);
            captchaMonitor = null;
        }

        rewardPreferenceCache.clear();
        lastProcessedQuestIds.clear();
    },

    renderQuestButtonTopBar() {
        if (settings.store.disableUiRendering) return;
        if (settings.store.showQuestsButtonTopBar) {
            return <QuestButton type="top-bar" />;
        }
    },

    renderQuestButtonSettingsBar() {
        if (settings.store.disableUiRendering) return;
        if (settings.store.showQuestsButtonSettingsBar) {
            return <QuestButton type="settings-bar" />;
        }
    },

    renderQuestButtonBadges(questButton) {
        if (settings.store.disableUiRendering) {
            return questButton;
        }
        if (settings.store.showQuestsButtonBadges && typeof questButton === "string" && questButton === "quests") {
            return (<QuestsCount />);
        }
        if (settings.store.showQuestsButtonBadges && questButton?.href?.startsWith("/quest-home")
            && Array.isArray(questButton?.children) && questButton.children.findIndex(child => child?.type === QuestsCount) === -1) {
            questButton.children.push(<QuestsCount />);
        }
        return questButton;
    }
});

function updateQuestsDebounced() {
    if (updateQuestsTimeout) {
        clearTimeout(updateQuestsTimeout);
    }

    updateQuestsTimeout = setTimeout(() => {
        updateQuests();
        updateQuestsTimeout = null;
    }, 300);
}

function updateQuests() {
    availableQuests = [...QuestsStore.quests.values()];
    const preferredQuests = availableQuests.filter(questMatchesRewardPreference);
    acceptableQuests = preferredQuests.filter(x => x.userStatus?.enrolledAt == null && new Date(x.config.expiresAt).getTime() > Date.now()) || [];
    completableQuests = preferredQuests.filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now()) || [];
    claimableQuests = preferredQuests.filter(x => x.userStatus?.completedAt && !x.userStatus?.claimedAt && new Date(x.config.expiresAt).getTime() > Date.now()) || [];

    const currentQuestIds = new Set([
        ...acceptableQuests.map(q => `accept-${q.id}`),
        ...completableQuests.map(q => `complete-${q.id}`),
        ...claimableQuests.map(q => `claim-${q.id}`)
    ]);

    const hasChanges = currentQuestIds.size !== lastProcessedQuestIds.size ||
        [...currentQuestIds].some(id => !lastProcessedQuestIds.has(id));

    if (!hasChanges && lastProcessedQuestIds.size > 0) {
        return;
    }

    lastProcessedQuestIds = currentQuestIds;

    for (const quest of acceptableQuests) {
        acceptQuest(quest);
    }
    for (const quest of completableQuests) {
        if (completingQuest.has(quest.id)) {
            if (completingQuest.get(quest.id) === false) {
                completingQuest.delete(quest.id);
            }
        } else {
            completeQuest(quest);
        }
    }
    for (const quest of claimableQuests) {
        claimQuestReward(quest);
    }
}

async function acceptQuest(quest: QuestValue) {
    if (!settings.store.acceptQuestsAutomatically) return;
    const action: QuestAction = {
        questContent: QuestLocationMap.QUEST_HOME_DESKTOP,
        questContentCTA: "ACCEPT_QUEST",
        sourceQuestContent: 0,
    };

    try {
        await QuestApplyAction(quest.id, action);
        console.log("Accepted quest:", quest.config.messages.questName);
    } catch (err: any) {
        if (settings.store.autoCaptchaSolving) {
            const challenge = detectCaptchaChallenge(err);
            if (challenge) {
                console.log("[CompleteDiscordQuest] Captcha detected during quest accept, bypassing...");
                const bypassResult = await bypassCaptcha(challenge);
                if (bypassResult.success) {
                    console.log("[CompleteDiscordQuest] Captcha bypassed, retrying quest accept...");
                    try {
                        await QuestApplyAction(quest.id, action);
                        console.log("Accepted quest after captcha bypass:", quest.config.messages.questName);
                        return;
                    } catch (retryErr) {
                        console.error("Failed to accept quest after captcha bypass:", quest.config.messages.questName, retryErr);
                    }
                }
            }
        }
        console.error("Failed to accept quest:", quest.config.messages.questName, err);
    }
}

function stopCompletingAll() {
    for (const quest of completableQuests) {
        if (completingQuest.has(quest.id)) {
            completingQuest.set(quest.id, false);
        }
    }
    console.log("Stopped completing all quests.");
}

function completeQuest(quest: QuestValue) {
    const isApp = typeof DiscordNative !== "undefined";
    if (!quest) {
        console.log("You don't have any uncompleted quests!");
        return;
    }

    const pid = Math.floor(Math.random() * 30000) + 1000;

    const applicationId = quest.config.application.id;
    const applicationName = quest.config.application.name;
    const { questName } = quest.config.messages;
    const taskConfig = (quest.config as any).taskConfig ?? quest.config.taskConfigV2;
    const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
    if (!taskName) {
        console.log("Unknown task type for quest:", questName);
        return;
    }
    const secondsNeeded = taskConfig.tasks[taskName].target;
    const secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

    if (!isApp && taskName !== "WATCH_VIDEO" && taskName !== "WATCH_VIDEO_ON_MOBILE") {
        console.log("This no longer works in browser for non-video quests. Use the discord desktop app to complete the", questName, "quest!");
        return;
    }

    const handler = questHandlers.find(h => h.supports(taskName));
    if (!handler) {
        console.error("No handler found for task type:", taskName);
        completingQuest.set(quest.id, false);
        return;
    }

    completingQuest.set(quest.id, true);

    console.log(`Completing quest ${questName} (${quest.id}) - ${taskName} for ${secondsNeeded} seconds.`);

    handler.handle({
        quest,
        questName,
        taskName,
        secondsNeeded,
        secondsDone,
        applicationId,
        applicationName,
        configVersion: quest.config.configVersion,
        pid,
        isApp,
        completingQuest,
        fakeGames,
        fakeApplications,
        addFakeGame,
        removeFakeGame,
        addFakeApplication,
        removeFakeApplication,
        RestAPI,
        FluxDispatcher,
        RunningGameStore,
        ChannelStore,
        GuildChannelStore,
        getSpoofingProfile,
        onQuestComplete: () => handleQuestCompletion(quest)
    });
}
