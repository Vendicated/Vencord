/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PluginNative } from "@utils/types";
import type { Quest, User } from "@vencord/discord-types";
import { QuestTargetedContent, QuestTaskJoinOperator, QuestTaskType } from "@vencord/discord-types/enums";
import { findByCodeLazy, findLazy } from "@webpack";
import { FluxDispatcher, QuestStore, RestAPI, showToast, SnowflakeUtils, UserStore } from "@webpack/common";

import { createQuestEnrollmentGuard } from "../index";
import { getCurrentUserId, getQuestifySettings } from "../settings/access";
import { autoCompleteQuestTaskTypes, isAutoCompleteCompatible, isEnrollmentCompatible } from "../settings/def";
import { resetQuestsToResume } from "../settings/fetching";
import { getIgnoredQuestIDs } from "../settings/ignoredQuests";
import { rerenderQuests } from "../settings/rerender";
import { normalizeQuestName, type QuestIncludedTypes, questMatchesIncludedTypes } from "./filtering";
import { QL } from "./logging";
import { getQuestStatus, getQuestStoredProgress, isQuestHidden, isVideoQuestTask, QuestStatus, QuestTask, refreshQuest } from "./questState";
import { hasInjectedDesktopVideoCompatibility } from "./questTiles";

type QuestEnrollResult =
    | { type: "success"; }
    | { type: "cancelled"; }
    | { type: "unknown_error"; error?: unknown; }
    | { type: "previous_in_flight_request"; };

type QuestEnrollmentResult =
    | { type: "success"; }
    | { type: "unavailable"; }
    | { type: "previous_in_flight_request"; }
    | { type: "rate_limited"; retryAfter: number | null; }
    | { type: "cancelled"; }
    | { type: "unknown_error"; status: number | null; };

interface QuestEnrollmentMetadata {
    questContent: QuestTargetedContent;
    questContentCTA: string;
    sourceQuestContent: QuestTargetedContent;
    questContentPosition?: number;
    questContentRowIndex?: number;
}

interface QuestCTAConstants {
    START_QUEST: string;
    ACCEPT_QUEST: string;
}

interface QuestButtonAnalyticsArgs {
    analyticsCtxQuestContent?: QuestEnrollmentMetadata["questContent"];
    analyticsCtxSourceQuestContent?: QuestEnrollmentMetadata["sourceQuestContent"];
    analyticsCtxQuestContentPosition?: QuestEnrollmentMetadata["questContentPosition"];
    analyticsCtxQuestContentRowIndex?: QuestEnrollmentMetadata["questContentRowIndex"];
}

export interface QuestButtonPropsArgs extends QuestButtonAnalyticsArgs {
    quest: Quest;
    preClickCallback?: () => void;
}

export interface QuestButtonPatchProps {
    icon: string | undefined;
    text: string;
    onClick: () => void;
}

interface QuestButtonTextOptions {
    prepositional?: boolean;
}

export enum QuestCompletionState {
    Completing = "COMPLETING",
    Queued = "QUEUED",
    Accepted = "ACCEPTED",
    Unenrolled = "UNENROLLED",
}

type QuestCompletionStateTuple = [text: string | null, state: QuestCompletionState];

interface QuestRewardItem {
    orbQuantity?: number;
    premiumOrbQuantity?: number | null;
    messages?: {
        nameWithArticle?: string;
    };
}

const reportVideoProgress = findByCodeLazy(".QUESTS_VIDEO_PROGRESS(") as (questId: string, progress: number) => Promise<void>;
const sendHeartbeat = findByCodeLazy(".QUESTS_HEARTBEAT(") as (options: {
    questId: string;
    streamKey?: string;
    applicationId?: string;
    terminal?: boolean;
    executableFingerprint?: unknown;
}) => Promise<void>;
const getApplicationProxyTicket = findByCodeLazy(".expiresAt>", ".ticket;") as (applicationId: string, channelId?: string) => Promise<string>;
export const enrollInQuestNative = findByCodeLazy('type:"QUESTS_ENROLL_BEGIN",') as (questId: string, options: QuestEnrollmentMetadata) => Promise<QuestEnrollResult>;
const sortQuestsNative = findByCodeLazy("sortMethod:", "isRenewableEndDateSortEnabled") as (quests: Quest[], options: { sortMethod: string; filters: unknown[]; }) => Quest[];
const getQuestOrbQuantity = findByCodeLazy("premiumOrbQuantity??", "orbQuantity") as (
    config: Quest["config"],
    user: User | null | undefined
) => number | null;
const QuestCTA = findLazy(m => !!m?.START_QUEST && !!m?.ACCEPT_QUEST) as QuestCTAConstants;

async function getActivityProxyTicket(appId: string): Promise<string | undefined> {
    try {
        return await getApplicationProxyTicket(appId);
    } catch {
        QL.error("AUTO_COMPLETE_ACHIEVEMENT_PROXY_TICKET_FAILED", { appId });
    }
}

async function getApplicationGrantId(appId: string): Promise<string | null> {
    const response = await RestAPI.get({ url: "/oauth2/tokens" });
    const grants: unknown = response.body;

    if (!Array.isArray(grants) || grants.some(grant =>
        !grant || typeof grant.id !== "string" || !grant.id || typeof grant.application?.id !== "string"
    )) {
        throw new Error("Invalid application authorization response.");
    }

    return grants.find(grant => grant.application.id === appId)?.id ?? null;
}

const activeAchievementApplications = new Set<string>();

function resolveQuestCTA(quest: Quest): string {
    const tasks = quest.config.taskConfigV2?.tasks;
    const taskType = tasks?.[QuestTaskType.WATCH_VIDEO]?.type ?? Object.values(tasks ?? {})[0]?.type;

    switch (taskType) {
        case QuestTaskType.ACHIEVEMENT_IN_ACTIVITY:
        case QuestTaskType.PLAY_ACTIVITY:
        case QuestTaskType.WATCH_VIDEO:
            return QuestCTA.START_QUEST;
        default:
            return QuestCTA.ACCEPT_QUEST;
    }
}

export function makeEnrollmentData(quest: Quest, analytics: QuestButtonAnalyticsArgs = {}): QuestEnrollmentMetadata {
    const questContent = analytics.analyticsCtxQuestContent ?? QuestTargetedContent.QUEST_HOME_DESKTOP;
    let questContentPosition = analytics.analyticsCtxQuestContentPosition;
    let questContentRowIndex = analytics.analyticsCtxQuestContentRowIndex;

    if (questContent === QuestTargetedContent.QUEST_HOME_DESKTOP && (questContentPosition == null || questContentRowIndex == null)) {
        try {
            if (questContentPosition == null) {
                const quests = sortQuestsNative(Array.from(QuestStore.quests.values()), { sortMethod: "suggested", filters: [] });
                const index = quests.findIndex(candidate => candidate.id === quest.id);

                if (index !== -1) {
                    questContentPosition = index;
                }
            }

            if (questContentPosition != null) {
                questContentRowIndex ??= Math.floor(questContentPosition / 3);
            }
        } catch (error) {
            QL.error("QUEST_ENROLLMENT_POSITION_FAILED", { questId: quest.id, error });
        }
    }

    return {
        questContent,
        questContentCTA: resolveQuestCTA(quest),
        sourceQuestContent: analytics.analyticsCtxSourceQuestContent ?? questContent,
        questContentPosition,
        questContentRowIndex
    };
}

const QuestifyNative = VencordNative?.pluginHelpers?.Questify as PluginNative<typeof import("../native")> | undefined;

const videoQuestLeeway = 24;
const resumeExpiryMs = 60 * 60 * 1000;
const maxBatchNonRateLimitEnrollmentFailures = 3;
const maxQuestProcessingBatches = 4;
const minBatchEnrollmentDelayMs = 1000;
export type AutoCompleteQuestKind = "watch" | "play" | "achievement";
export type AutoCompleteQuestStatus = "queued" | "running";
export type AutoCompleteStartSource = "manual" | "resume" | "auto";

export interface AutoCompleteEntry {
    questId: string;
    questName: string;
    task: QuestTask;
    kind: AutoCompleteQuestKind;
    source: AutoCompleteStartSource;
    status: AutoCompleteQuestStatus;
    progress: number | null;
    abortController: AbortController;
    progressInterval: ReturnType<typeof setInterval> | null;
    rerenderInterval: ReturnType<typeof setInterval> | null;
}

export interface AutoCompleteStartOptions {
    force?: boolean;
    source?: AutoCompleteStartSource;
}

interface ProcessQuestsOptions {
    autoComplete: boolean;
    source?: "manual" | "auto";
}

interface QuestProcessingBatch {
    batchId: number;
    source: "manual" | "auto";
    autoComplete: boolean;
    status: "waiting" | "running";
    questCount: number;
    remainingQuestCount: number;
}

export interface AutoCompleteStopOptions {
    manual?: boolean;
    preserveResume?: boolean;
    terminalHeartbeat?: boolean;
    userId?: string | null;
}

type HeartbeatDispatchResult =
    | { type: "success"; userStatus: Quest["userStatus"]; }
    | { type: "failure"; error: unknown; }
    | { type: "timeout"; };

interface AutoCompleteQuestTarget {
    raw: number;
    adjusted: number;
}

type PlayHeartbeatResult = { progress: number | null; completed: boolean; };
type HeartbeatDispatchWaiter = { promise: Promise<HeartbeatDispatchResult>; cancel: () => void; };

interface VideoProgressReportOptions {
    attempts?: number;
    delay?: number;
    displayProgress?: number;
}

const activeAutoCompletes = new Map<string, AutoCompleteEntry>();
const manuallyStoppedQuests = new Set<string>();
let autoCompleteStartGeneration = 0;
let questProcessingTail: Promise<void> = Promise.resolve();
let nextQuestProcessingBatchId = 0;
const questProcessingControllers = new Map<AbortController, QuestProcessingBatch>();
const failedBatchEnrollments = new Set<string>();
let suppressQueueDrain = false;
let videoProgressStackTracePatchSucceeded = false;
let heartbeatStackTracePatchSucceeded = false;
let didShowBrokenAutoCompleteToast = false;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
        return Promise.reject(new Error("Auto-complete aborted."));
    }

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);

        function onAbort() {
            clearTimeout(timeoutId);
            signal?.removeEventListener("abort", onAbort);
            reject(new Error("Auto-complete aborted."));
        }

        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

function clampFloat(value: number, precision: number = 6): number {
    return Number(value.toFixed(precision));
}

function randomBetween(min: number, max: number): number {
    return clampFloat(min + Math.random() * (max - min));
}

export function setVideoProgressStackTracePatchSucceeded(): void {
    videoProgressStackTracePatchSucceeded = true;
}

export function setHeartbeatStackTracePatchSucceeded(): void {
    heartbeatStackTracePatchSucceeded = true;
}

export function getStackTracePatchesSucceeded(): { videoProgress: boolean; heartbeat: boolean; } {
    return {
        videoProgress: videoProgressStackTracePatchSucceeded,
        heartbeat: heartbeatStackTracePatchSucceeded,
    };
}

function showBrokenAutoCompleteToast(): void {
    if (didShowBrokenAutoCompleteToast) {
        return;
    }

    didShowBrokenAutoCompleteToast = true;
    showToast({ text: "AutoComplete is broken. A fix will be implemented shortly.", variant: "critical" });
}

export function hasEnabledAutoCompleteQuestTypes(): boolean {
    return autoCompleteQuestTaskTypes.some(questType => getQuestifySettings().autoCompleteQuestTypes[questType]);
}

function isAutoCompleteRuntimeReady(notify: boolean = false): boolean {
    const stackTracePatches = getStackTracePatchesSucceeded();

    if (stackTracePatches.videoProgress && stackTracePatches.heartbeat) {
        return true;
    }

    if (notify) {
        showBrokenAutoCompleteToast();
        QL.warn("AUTO_COMPLETE_STACK_TRACE_PATCH_MISSING", stackTracePatches);
    }

    return false;
}

export function getQuestAutoCompleteProgress(quest: Quest): number | null {
    return activeAutoCompletes.get(quest.id)?.progress ?? null;
}

export function getQuestAutoCompleteEntry(questOrId: Quest | string): Readonly<AutoCompleteEntry> | null {
    const questId = typeof questOrId === "string" ? questOrId : questOrId.id;

    return activeAutoCompletes.get(questId) ?? null;
}

export function getAutoCompleteQuestTarget(task: QuestTask): AutoCompleteQuestTarget {
    const raw = task.target;

    return {
        raw,
        adjusted: Math.max(0, raw - (isVideoQuestTask(task.type) && getQuestifySettings().completeVideoQuestsQuicker ? videoQuestLeeway : 0)),
    };
}

function getAutoCompleteQuestTasks(quest: Quest): QuestTask[] {
    const tasks = quest.config.taskConfigV2?.tasks;

    if (!tasks || (quest.config.taskConfigV2.joinOperator === QuestTaskJoinOperator.AND && Object.keys(tasks).length > 1)) {
        return [];
    }

    return autoCompleteQuestTaskTypes.flatMap(taskType => {
        const task = tasks[taskType] as QuestTask | undefined;

        return task ? [task] : [];
    });
}

function getQuestAutoCompleteKind(task: QuestTask): AutoCompleteQuestKind | null {
    switch (task.type) {
        case QuestTaskType.WATCH_VIDEO:
        case QuestTaskType.WATCH_VIDEO_ON_MOBILE:
            return "watch";
        case QuestTaskType.PLAY_ON_DESKTOP:
        case QuestTaskType.PLAY_ON_XBOX:
        case QuestTaskType.PLAY_ON_PLAYSTATION:
        case QuestTaskType.PLAY_ACTIVITY:
            return "play";
        case QuestTaskType.ACHIEVEMENT_IN_ACTIVITY:
            return "achievement";
        default:
            return null;
    }
}

function getEffectiveAutoCompleteTaskType(task: QuestTask, quest: Quest): QuestTaskType {
    return task.type === QuestTaskType.WATCH_VIDEO && hasInjectedDesktopVideoCompatibility(quest)
        ? QuestTaskType.WATCH_VIDEO_ON_MOBILE
        : task.type;
}

function isAutoCompleteQuestTaskEnabled(quest: Quest, task: QuestTask): boolean {
    const taskType = getEffectiveAutoCompleteTaskType(task, quest);
    const compatible = isAutoCompleteCompatible(taskType);
    const enabled = getQuestifySettings().autoCompleteQuestTypes[taskType] === true;

    return compatible && enabled && getQuestAutoCompleteKind(task) != null;
}

function resolveAutoCompleteQuest(quest: Quest): { task: QuestTask; kind: AutoCompleteQuestKind; } | null {
    if (!quest.userStatus?.enrolledAt && !isQuestEnrollmentCompatible(quest)) {
        return null;
    }

    for (const task of getAutoCompleteQuestTasks(quest)) {
        const kind = getQuestAutoCompleteKind(task);

        if (kind && isAutoCompleteQuestTaskEnabled(quest, task)) {
            return { task, kind };
        }
    }

    return null;
}

function getResumeQuestIds(): string[] {
    return Array.from(activeAutoCompletes.keys());
}

function getAutomaticResumeQuestIds(): string[] {
    return Array.from(activeAutoCompletes.values()).filter(entry => entry.source === "auto").map(entry => entry.questId);
}

function isResumeStateExpired(timestamp: number): boolean {
    return Date.now() - timestamp > resumeExpiryMs;
}

function updateResumeState(questIDs: string[] = getResumeQuestIds(), userId: string | null = getCurrentUserId(), automaticQuestIDs: string[] = getAutomaticResumeQuestIds()): void {
    if (!userId) {
        QL.warn("AUTO_COMPLETE_RESUME_NO_USER");
        return;
    }

    if (!getQuestifySettings().resumeInterruptedQuests || questIDs.length === 0) {
        delete getQuestifySettings().resumeQuestIDs[userId];
        return;
    }

    getQuestifySettings().resumeQuestIDs[userId] = {
        timestamp: Date.now(),
        questIDs,
        automaticQuestIDs,
    };
}

function createAutoCompleteEntry(
    quest: Quest,
    task: QuestTask,
    kind: AutoCompleteQuestKind,
    source: AutoCompleteStartSource,
): AutoCompleteEntry {
    return {
        questId: quest.id,
        questName: normalizeQuestName(quest),
        task,
        kind,
        source,
        status: "queued",
        progress: getQuestStoredProgress(quest, task),
        abortController: new AbortController(),
        progressInterval: null,
        rerenderInterval: null,
    };
}

function clearEntryTimers(entry: AutoCompleteEntry): void {
    if (entry.progressInterval) {
        clearInterval(entry.progressInterval);
        entry.progressInterval = null;
    }

    if (entry.rerenderInterval) {
        clearInterval(entry.rerenderInterval);
        entry.rerenderInterval = null;
    }
}

function isEntryActive(entry: AutoCompleteEntry): boolean {
    return activeAutoCompletes.get(entry.questId) === entry && !entry.abortController.signal.aborted;
}

function formatQuestTime(seconds: number, prepositional: boolean = false): string {
    const remaining = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(remaining / 60);
    const secondsPart = remaining % 60;

    if (prepositional) {
        return remaining >= 60 ? `${minutes}m ${secondsPart}s` : `${secondsPart}s`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}`;
}

function isQuestQueuedForResume(questId: string): boolean {
    if (!getQuestifySettings().resumeInterruptedQuests) {
        return false;
    }

    const userId = getCurrentUserId();
    const resumeState = userId ? getQuestifySettings().resumeQuestIDs[userId] : null;

    return Boolean(resumeState && !isResumeStateExpired(resumeState.timestamp) && resumeState.questIDs.includes(questId));
}

function getQueuedAutoCompletePosition(questId: string): number | null {
    const queuedQuestIds = Array.from(activeAutoCompletes.values())
        .filter(entry => entry.status === "queued")
        .map(entry => entry.questId);
    const queuedIndex = queuedQuestIds.indexOf(questId);

    return queuedIndex === -1 ? null : queuedIndex + 1;
}

export function getQuestCompletionState(quest: Quest, options: QuestButtonTextOptions = {}): QuestCompletionStateTuple {
    quest = refreshQuest(quest);

    const activeEntry = activeAutoCompletes.get(quest.id);
    const resolvedQuest = activeEntry ?? resolveAutoCompleteQuest(quest);

    if (!resolvedQuest) {
        return [null, QuestCompletionState.Unenrolled];
    }

    const { task, kind } = resolvedQuest;
    const target = getAutoCompleteQuestTarget(task).adjusted;
    const enrolledAt = quest.userStatus?.enrolledAt ? new Date(quest.userStatus.enrolledAt) : null;
    const storedProgress = activeEntry?.progress ?? getQuestStoredProgress(quest, task) ?? 0;
    const elapsedProgress = !activeEntry && enrolledAt && isVideoQuestTask(task.type) && getQuestifySettings().completeVideoQuestsQuicker
        ? Math.max(0, (Date.now() - enrolledAt.getTime()) / 1000)
        : 0;
    const progress = Math.min(target, Math.max(storedProgress, elapsedProgress));
    const timeRemaining = Math.max(0, target - progress);
    const formattedTime = formatQuestTime(timeRemaining, options.prepositional);
    const immediate = kind === "achievement" || timeRemaining <= 1;

    if (activeEntry?.status === "running") {
        const text = immediate
            ? "Completing..."
            : `Completing ${options.prepositional ? `in ${formattedTime}` : `(${formattedTime})`}`;

        return [text, QuestCompletionState.Completing];
    }

    if (activeEntry?.status === "queued") {
        return [`Queued (${getQueuedAutoCompletePosition(quest.id) ?? "?"})`, QuestCompletionState.Queued];
    }

    if (enrolledAt) {
        if (isQuestQueuedForResume(quest.id)) {
            return ["Resuming...", QuestCompletionState.Queued];
        }

        const meaningfulProgress = progress >= 1;

        return [
            immediate ? "Complete Now" : `${meaningfulProgress ? "Resume" : "Complete"} (${formatQuestTime(timeRemaining)})`,
            QuestCompletionState.Accepted,
        ];
    }

    return [
        immediate ? "Complete Now" : `Complete (${formatQuestTime(target)})`,
        QuestCompletionState.Unenrolled,
    ];
}

export function getQuestButtonProps(args: QuestButtonPropsArgs): QuestButtonPatchProps | null {
    if (!canAutoCompleteQuest(args.quest)) {
        return null;
    }

    const [label, completionState] = getQuestCompletionState(args.quest);

    if (!label) {
        return null;
    }

    return {
        icon: undefined,
        text: label,
        onClick: async () => {
            if (completionState === QuestCompletionState.Unenrolled) {
                args.preClickCallback?.();

                if (await enrollAndStartQuestAutoComplete(args.quest, args)) {
                    rerenderQuests();
                }
            } else if (completionState === QuestCompletionState.Completing) {
                stopQuestAutoComplete(args.quest, { manual: true, preserveResume: false, terminalHeartbeat: true });
                rerenderQuests();
            } else if (completionState === QuestCompletionState.Queued) {
                stopQuestAutoComplete(args.quest, { manual: true, preserveResume: false, terminalHeartbeat: true });
                rerenderQuests();
            } else if (completionState === QuestCompletionState.Accepted) {
                processQuestForAutoComplete(refreshQuest(args.quest), { force: true, source: "manual" });
                rerenderQuests();
            }
        }
    };
}

export function getQuestPanelSubtitleText(quest: Quest): string | null {
    quest = refreshQuest(quest);

    const questCompleted = Boolean(quest.userStatus?.completedAt)
        && getQuestStatus(quest, getIgnoredQuestIDs()) === QuestStatus.Unclaimed;
    const [completingText] = getQuestCompletionState(quest, { prepositional: true });
    const completedText = questCompleted ? "Completed" : null;
    const statusText = completedText ?? completingText;

    if (!statusText) {
        return null;
    }

    const rewardItem = (quest.config.rewardsConfig.rewards[0] ?? null) as QuestRewardItem | null;
    const orbsReward = getQuestOrbQuantity(quest.config, UserStore.getCurrentUser()) ?? 0;

    if (orbsReward > 0) {
        return `${statusText} for ${orbsReward} Orbs.`;
    }

    if (rewardItem?.messages?.nameWithArticle) {
        return `${statusText} for ${rewardItem.messages.nameWithArticle}.`;
    }

    return `${statusText} for an unrecognized reward.`;
}

export function isQuestEnrollmentCompatible(quest: Quest): boolean {
    const tasks = Object.values(quest.config.taskConfigV2?.tasks ?? {});

    return tasks.length > 0 && (quest.config.taskConfigV2?.joinOperator === QuestTaskJoinOperator.AND
        ? tasks.every(task => isEnrollmentCompatible(task.type))
        : tasks.some(task => isEnrollmentCompatible(task.type)));
}

export function hasEnabledAutoCompleteQuestTask(quest: Quest): boolean {
    return resolveAutoCompleteQuest(quest) != null;
}

export function canAutoCompleteQuest(quest: Quest): boolean {
    if (!isAutoCompleteRuntimeReady()) {
        return false;
    }

    if (quest.userStatus?.completedAt) {
        return false;
    }

    if (getQuestStatus(quest, getIgnoredQuestIDs()) !== QuestStatus.Unclaimed) {
        return false;
    }

    return hasEnabledAutoCompleteQuestTask(quest);
}

function getEnrollmentRetryAfter(error: unknown): number | null {
    if (typeof error !== "object" || error === null) {
        return null;
    }

    const response = error as { body?: { retry_after?: unknown; retryAfter?: unknown; }; retry_after?: unknown; retryAfter?: unknown; };
    const retryAfter = response.body?.retry_after ?? response.body?.retryAfter ?? response.retry_after ?? response.retryAfter;

    return typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter
        : null;
}

function getEnrollmentErrorStatus(error: unknown): number | null {
    if (typeof error !== "object" || error === null) {
        return null;
    }

    const { status } = error as { status?: unknown; };

    return typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599
        ? status
        : null;
}

function getEnrollmentRateLimitRemainingSeconds(): number | null {
    const userId = getCurrentUserId();
    const blockedUntilByUser = getQuestifySettings().enrollmentRateLimitBlockedUntil;

    if (!userId || !blockedUntilByUser) {
        return null;
    }

    const blockedUntil = blockedUntilByUser[userId];

    if (blockedUntil === undefined) {
        return null;
    }

    if (typeof blockedUntil !== "number" || !Number.isFinite(blockedUntil) || blockedUntil <= Date.now()) {
        delete blockedUntilByUser[userId];
        return null;
    }

    return (blockedUntil - Date.now()) / 1000;
}

export function isQuestEnrollmentRateLimited(): boolean {
    return getEnrollmentRateLimitRemainingSeconds() !== null;
}

function blockQuestEnrollmentForRetryAfter(retryAfter: number | null): void {
    const userId = getCurrentUserId();

    if (!userId || retryAfter === null) {
        return;
    }

    const blockedUntil = Date.now() + retryAfter * 1000;

    if (!Number.isFinite(blockedUntil)) {
        return;
    }

    const settings = getQuestifySettings();

    settings.enrollmentRateLimitBlockedUntil ??= {};

    const blockedUntilByUser = settings.enrollmentRateLimitBlockedUntil;
    const previous = blockedUntilByUser[userId];

    blockedUntilByUser[userId] = typeof previous === "number" && Number.isFinite(previous)
        ? Math.max(previous, blockedUntil)
        : blockedUntil;
}

function showQuestEnrollmentFailureToast(quest: Quest, result: Exclude<QuestEnrollmentResult, { type: "success"; }>): void {
    const rateLimitSuffix = result.type === "rate_limited" ? " due to rate limits" : "";

    showToast({ text: `Enrollment in ${normalizeQuestName(quest)} Quest failed${rateLimitSuffix}.`, variant: "critical" });
}

export async function ensureQuestEnrolled(quest: Quest, analytics: QuestButtonAnalyticsArgs = {}): Promise<QuestEnrollmentResult> {
    quest = refreshQuest(quest);
    const userId = getCurrentUserId();

    if (!userId) {
        return { type: "cancelled" };
    }

    if (quest.userStatus?.enrolledAt) {
        return { type: "success" };
    }

    if (!isQuestEnrollmentCompatible(quest)) {
        QL.info("QUEST_ENROLLMENT_SKIPPED", { questId: quest.id, reason: "unavailable" });
        return { type: "unavailable" };
    }

    const blockedFor = getEnrollmentRateLimitRemainingSeconds();

    if (blockedFor !== null) {
        const failure = { type: "rate_limited", retryAfter: blockedFor } as const;

        showQuestEnrollmentFailureToast(quest, failure);

        return failure;
    }

    let result: QuestEnrollResult;

    try {
        result = await enrollInQuestNative(quest.id, makeEnrollmentData(quest, analytics));
    } catch (error) {
        QL.error("QUEST_ENROLLMENT_ERROR", { questId: quest.id, error });
        result = { type: "unknown_error", error };
    }

    await new Promise<void>(resolve => FluxDispatcher.wait(resolve));

    if (result.type === "cancelled" || getCurrentUserId() !== userId) {
        return { type: "cancelled" };
    }

    if ((result.type === "success" || result.type === "previous_in_flight_request") && refreshQuest(quest).userStatus?.enrolledAt) {
        return { type: "success" };
    }

    if (result.type === "previous_in_flight_request") {
        return result;
    }

    const error = result.type === "unknown_error" ? result.error : undefined;
    const status = getEnrollmentErrorStatus(error);
    const retryAfter = getEnrollmentRetryAfter(error);
    const failure = status === 429 || (status === null && retryAfter !== null)
        ? { type: "rate_limited", retryAfter } as const
        : { type: "unknown_error", status } as const;

    if (failure.type === "rate_limited") {
        blockQuestEnrollmentForRetryAfter(failure.retryAfter);
    }

    showQuestEnrollmentFailureToast(quest, failure);

    return failure;
}

export async function enrollAndStartQuestAutoComplete(quest: Quest, analytics: QuestButtonAnalyticsArgs = {}): Promise<boolean> {
    quest = refreshQuest(quest);

    if (!canAutoCompleteQuest(quest)) {
        return false;
    }

    const generation = autoCompleteStartGeneration;
    const enrollment = await ensureQuestEnrolled(quest, analytics);

    if (enrollment.type !== "success" || generation !== autoCompleteStartGeneration) {
        return false;
    }

    return processQuestForAutoComplete(refreshQuest(quest), { force: true, source: "manual" });
}

function getQuestExpiryTime(quest: Quest): number {
    const time = new Date(quest.config.expiresAt).getTime();

    return Number.isFinite(time) ? time : Infinity;
}

export function getQueueableAutoCompleteQuests(): Quest[] {
    const settings = getQuestifySettings();
    const includedTypes = settings.questButtonIncludedTypes as QuestIncludedTypes;

    return Array.from(QuestStore.quests.values())
        .filter(quest => !activeAutoCompletes.has(quest.id))
        .filter(quest => questMatchesIncludedTypes(quest, includedTypes))
        .filter(canAutoCompleteQuest);
}

export function setQuestAutoCompleteProgress(questOrId: Quest | string, progress: number | null): boolean {
    const questId = typeof questOrId === "string" ? questOrId : questOrId.id;
    const entry = activeAutoCompletes.get(questId);

    if (!entry) {
        return false;
    }

    entry.progress = progress == null ? null : Math.max(0, progress);

    return true;
}

async function waitUntilEnrolled(quest: Quest, entry: AutoCompleteEntry, timeout: number = 60000, interval: number = 500): Promise<Quest | null> {
    const startedAt = Date.now();

    quest = refreshQuest(quest);

    if (quest.userStatus?.enrolledAt) {
        return quest;
    }

    if (quest.userStatus?.completedAt) {
        return null;
    }

    while (isEntryActive(entry) && !quest.userStatus?.enrolledAt && (Date.now() - startedAt) < timeout) {
        await sleep(interval, entry.abortController.signal);
        quest = refreshQuest(quest);
    }

    if (quest.userStatus?.enrolledAt) {
        return quest;
    }

    QL.warn("AUTO_COMPLETE_ENROLL_TIMEOUT", { questId: quest.id, questName: entry.questName, timeout });
    return null;
}

async function reportVideoQuestProgress(quest: Quest, entry: AutoCompleteEntry, progress: number, options: VideoProgressReportOptions = {}): Promise<boolean> {
    quest = refreshQuest(quest);

    const attempts = options.attempts ?? 1;
    const delay = options.delay ?? 2500;
    const displayProgress = options.displayProgress ?? progress;

    if (!quest.userStatus?.enrolledAt) {
        QL.warn("AUTO_COMPLETE_VIDEO_UNENROLLED", { questId: quest.id, questName: entry.questName });
        return false;
    }

    if (quest.userStatus?.completedAt) {
        return true;
    }

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            await reportVideoProgress(quest.id, progress);
            setQuestAutoCompleteProgress(quest, displayProgress);

            QL.info("AUTO_COMPLETE_VIDEO_PROGRESS_REPORTED", { questId: quest.id, questName: entry.questName, progress, displayProgress, attempt, attempts });
            return true;
        } catch (error) {
            QL.error("AUTO_COMPLETE_VIDEO_PROGRESS_FAILED", { questId: quest.id, questName: entry.questName, progress, attempt, attempts, error });

            if (attempt < attempts) {
                await sleep(delay, entry.abortController.signal);
            }
        }
    }

    return false;
}

function waitForHeartbeatDispatchResult(questId: string, timeoutMs: number): HeartbeatDispatchWaiter {
    let settled = false;
    let cleanup = () => { };
    const promise = new Promise<HeartbeatDispatchResult>(resolve => {
        const successEvent = "QUESTS_SEND_HEARTBEAT_SUCCESS";
        const failureEvent = "QUESTS_SEND_HEARTBEAT_FAILURE";
        const timeoutId = setTimeout(() => {
            cleanup();
            resolve({ type: "timeout" });
        }, timeoutMs);

        cleanup = () => {
            if (settled) {
                return;
            }

            settled = true;
            clearTimeout(timeoutId);
            FluxDispatcher.unsubscribe(successEvent, onSuccess);
            FluxDispatcher.unsubscribe(failureEvent, onFailure);
        };

        function onSuccess(data: { questId?: string; userStatus?: Quest["userStatus"]; }) {
            if (data.questId !== questId) {
                return;
            }

            cleanup();
            resolve({ type: "success", userStatus: data.userStatus ?? null });
        }

        function onFailure(data: { questId?: string; error?: unknown; }) {
            if (data.questId !== questId) {
                return;
            }

            cleanup();
            resolve({ type: "failure", error: data.error });
        }

        FluxDispatcher.subscribe(successEvent, onSuccess);
        FluxDispatcher.subscribe(failureEvent, onFailure);
    });

    return { promise, cancel: cleanup };
}

function getPlayProgressValue(userStatus: Quest["userStatus"], task: QuestTask): number | null {
    return userStatus?.progress?.[task.type]?.value ?? null;
}

async function reportPlayQuestProgress(
    quest: Quest,
    entry: AutoCompleteEntry,
    terminal: boolean,
    options: { attempts?: number; delay?: number; timeout?: number; applicationId?: string; streamKey?: string; } = {},
): Promise<PlayHeartbeatResult> {
    quest = refreshQuest(quest);

    if (!quest.userStatus?.enrolledAt) {
        QL.warn("AUTO_COMPLETE_PLAY_UNENROLLED", { questId: quest.id, questName: entry.questName });
        return { progress: null, completed: false };
    }

    if (quest.userStatus?.completedAt && !terminal) {
        return { progress: getQuestStoredProgress(quest, entry.task), completed: true };
    }

    const attempts = options.attempts ?? 1;
    const delay = options.delay ?? 2500;
    const timeout = options.timeout ?? 10000;
    const applicationId = options.applicationId ?? entry.task.applications?.[0]?.id;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const dispatchWaiter = waitForHeartbeatDispatchResult(quest.id, timeout);

            try {
                await sendHeartbeat({
                    questId: quest.id,
                    streamKey: options.streamKey,
                    applicationId,
                    terminal,
                });
            } catch (error) {
                dispatchWaiter.cancel();
                throw error;
            }

            const dispatchResult = await dispatchWaiter.promise;

            if (dispatchResult.type === "failure") {
                QL.error("AUTO_COMPLETE_PLAY_HEARTBEAT_FAILURE", { questId: quest.id, questName: entry.questName, attempt, attempts, error: dispatchResult.error });
            } else if (dispatchResult.type === "timeout") {
                QL.warn("AUTO_COMPLETE_PLAY_HEARTBEAT_TIMEOUT", { questId: quest.id, questName: entry.questName, attempt, attempts, timeout });
            } else {
                const updatedQuest = refreshQuest(quest);
                const progress = getPlayProgressValue(dispatchResult.userStatus, entry.task)
                    ?? getQuestStoredProgress(updatedQuest, entry.task)
                    ?? 0;
                const completed = !!dispatchResult.userStatus?.completedAt || !!updatedQuest.userStatus?.completedAt;

                setQuestAutoCompleteProgress(quest, terminal ? progress : Math.max(progress, entry.progress ?? 0));
                QL.info("AUTO_COMPLETE_PLAY_HEARTBEAT_SENT", { questId: quest.id, questName: entry.questName, progress, target: entry.task.target, terminal });

                return { progress, completed };
            }
        } catch (error) {
            QL.error("AUTO_COMPLETE_PLAY_HEARTBEAT_ERROR", { questId: quest.id, questName: entry.questName, attempt, attempts, error });
        }

        if (attempt < attempts) {
            await sleep(delay, entry.abortController.signal);
        }
    }

    return { progress: null, completed: false };
}

function startRerenderInterval(entry: AutoCompleteEntry): void {
    clearEntryTimers(entry);

    entry.rerenderInterval = setInterval(() => {
        if (!isEntryActive(entry)) {
            clearEntryTimers(entry);
            return;
        }

        rerenderQuests();
    }, 1000);
}

async function runVideoQuest(quest: Quest, entry: AutoCompleteEntry, target: AutoCompleteQuestTarget): Promise<boolean> {
    quest = await waitUntilEnrolled(quest, entry, 60000, 500) ?? quest;

    if (!isEntryActive(entry) || !quest.userStatus?.enrolledAt) {
        return false;
    }

    const reportTarget = target.raw;
    const completionTarget = target.adjusted;
    const enrolledAt = new Date(quest.userStatus.enrolledAt);
    const initialStoredProgress = getQuestStoredProgress(quest, entry.task) ?? 0;
    const initialProgress = getQuestifySettings().completeVideoQuestsQuicker
        ? clampFloat(Math.max(1, (Date.now() - enrolledAt.getTime()) / 1000))
        : Math.max(0, initialStoredProgress);
    let displayedProgress = clampFloat(Math.min(completionTarget, initialProgress));
    let reportedProgress = clampFloat(Math.min(reportTarget, initialProgress));
    let maximumPlaybackTimestamp = Math.floor(reportedProgress);
    let nextReportThreshold = 0;
    let hasReportedInitialProgress = reportedProgress <= 0;
    let lastTickAt = performance.now();

    setQuestAutoCompleteProgress(quest, displayedProgress);
    startRerenderInterval(entry);

    const timeRemaining = Math.max(0, completionTarget - displayedProgress);
    const progressToCover = Math.max(0, reportTarget - reportedProgress);
    const speedFactor = timeRemaining > 0 ? progressToCover / timeRemaining : 0;

    QL.info("AUTO_COMPLETE_VIDEO_STARTED", { questId: quest.id, questName: entry.questName, timeRemaining, target });

    if (timeRemaining <= 0) {
        return reportVideoQuestProgress(quest, entry, Math.min(reportTarget, maximumPlaybackTimestamp), { attempts: 3, displayProgress: completionTarget });
    }

    if (reportedProgress > 0) {
        const initialReport = clampFloat(Math.min(reportTarget, reportedProgress));
        const reported = await reportVideoQuestProgress(quest, entry, initialReport, { attempts: 3, displayProgress: displayedProgress });

        if (!reported || !isEntryActive(entry)) {
            return false;
        }

        hasReportedInitialProgress = true;
        nextReportThreshold = clampFloat(initialReport + randomBetween(6, 8));
    }

    while (isEntryActive(entry) && displayedProgress < completionTarget) {
        await sleep(250, entry.abortController.signal);

        const now = performance.now();
        const elapsedSeconds = clampFloat((now - lastTickAt) / 1000);
        lastTickAt = now;

        displayedProgress = clampFloat(Math.min(completionTarget, displayedProgress + elapsedSeconds));
        reportedProgress = clampFloat(Math.min(reportTarget, reportedProgress + elapsedSeconds * speedFactor));
        maximumPlaybackTimestamp = Math.max(maximumPlaybackTimestamp, Math.floor(reportedProgress));
        setQuestAutoCompleteProgress(quest, displayedProgress);

        if (hasReportedInitialProgress && reportedProgress >= nextReportThreshold && displayedProgress < completionTarget) {
            const progressToReport = clampFloat(Math.min(reportTarget, nextReportThreshold + randomBetween(0, Math.max(0, reportedProgress - nextReportThreshold))));
            const reported = await reportVideoQuestProgress(quest, entry, progressToReport, { displayProgress: displayedProgress });

            if (!reported) {
                return false;
            }

            nextReportThreshold = clampFloat(progressToReport + randomBetween(6, 8));
        }
    }

    return isEntryActive(entry) && reportVideoQuestProgress(quest, entry, Math.min(reportTarget, maximumPlaybackTimestamp), { attempts: 3, displayProgress: completionTarget });
}

async function runPlayQuest(quest: Quest, entry: AutoCompleteEntry, target: AutoCompleteQuestTarget): Promise<boolean> {
    quest = await waitUntilEnrolled(quest, entry, 60000, 500) ?? quest;

    if (!isEntryActive(entry) || !quest.userStatus?.enrolledAt) {
        return false;
    }

    const questTarget = target.adjusted;
    const initialProgress = getQuestStoredProgress(quest, entry.task) ?? 0;
    const maximumHeartbeatDurationMs = 60 * 1000;
    const heartbeatBufferMs = 1000;

    setQuestAutoCompleteProgress(quest, initialProgress);
    startRerenderInterval(entry);

    entry.progressInterval = setInterval(() => {
        if (!isEntryActive(entry) || entry.progress == null) {
            return;
        }

        setQuestAutoCompleteProgress(entry.questId, Math.min(questTarget, entry.progress + 1));
    }, 1000);

    QL.info("AUTO_COMPLETE_PLAY_STARTED", { questId: quest.id, questName: entry.questName, remaining: Math.max(0, questTarget - initialProgress), target });

    let heartbeat = await reportPlayQuestProgress(quest, entry, false, { attempts: 3, delay: 2500 });

    if (heartbeat.progress === null) {
        return false;
    }

    while (isEntryActive(entry)) {
        if (heartbeat.completed || heartbeat.progress >= questTarget) {
            await reportPlayQuestProgress(refreshQuest(quest), entry, true, { attempts: 3, delay: 2500 });
            return true;
        }

        const remainingMs = Math.max(0, (questTarget - heartbeat.progress) * 1000);
        await sleep(remainingMs <= maximumHeartbeatDurationMs ? remainingMs + heartbeatBufferMs : maximumHeartbeatDurationMs, entry.abortController.signal);
        heartbeat = await reportPlayQuestProgress(quest, entry, false, { attempts: 3, delay: 2500 });

        if (heartbeat.progress === null) {
            return false;
        }
    }

    return false;
}

async function runAchievementQuest(quest: Quest, entry: AutoCompleteEntry, target: AutoCompleteQuestTarget): Promise<boolean> {
    const userId = getCurrentUserId();
    const isCurrentSession = createQuestEnrollmentGuard();
    const appId = entry.task.applications?.[0]?.id;

    if (!userId || !appId || !SnowflakeUtils.isProbablyAValidSnowflake(appId)) {
        QL.warn("AUTO_COMPLETE_ACHIEVEMENT_INVALID_IDS", { questId: quest.id });
        return false;
    }

    quest = await waitUntilEnrolled(quest, entry, 60000, 500) ?? quest;

    if (!isCurrentSession() || !isEntryActive(entry) || !quest.userStatus?.enrolledAt) {
        return false;
    }

    if (!QuestifyNative?.complete) {
        QL.error("AUTO_COMPLETE_ACHIEVEMENT_NATIVE_MISSING", { questId: quest.id, questName: entry.questName });
        return false;
    }

    const applicationKey = `${userId}:${appId}`;

    while (activeAchievementApplications.has(applicationKey) && isCurrentSession() && isEntryActive(entry)) {
        await sleep(250, entry.abortController.signal);
    }

    if (!isCurrentSession() || !isEntryActive(entry)) {
        return false;
    }

    quest = refreshQuest(quest);

    if (quest.userStatus?.completedAt) {
        return true;
    }

    activeAchievementApplications.add(applicationKey);
    setQuestAutoCompleteProgress(quest, 0);

    let hadAuthorization = true;
    let authorizationSucceeded = false;

    try {
        hadAuthorization = await getApplicationGrantId(appId) !== null;

        if (!isCurrentSession() || !isEntryActive(entry)) {
            return false;
        }

        const query = new URLSearchParams({ client_id: appId, response_type: "code", scope: "identify applications.entitlements", state: "" });
        const response = await RestAPI.post({ url: `/oauth2/authorize?${query}`, body: { authorize: true } });

        const location = response?.body?.location;
        const authCode = location ? new URL(location).searchParams.get("code") : null;
        authorizationSucceeded = !!authCode;

        if (!isCurrentSession() || !isEntryActive(entry)) {
            return false;
        }

        if (!authCode) {
            QL.warn("AUTO_COMPLETE_ACHIEVEMENT_AUTH_CODE_MISSING", { questId: quest.id, questName: entry.questName });
            return false;
        }

        const proxyTicket = await getActivityProxyTicket(appId);

        if (!isCurrentSession() || !isEntryActive(entry)) {
            return false;
        }

        const result = await QuestifyNative.complete(appId, authCode, target.adjusted, quest.id, proxyTicket);

        if (!isCurrentSession() || !isEntryActive(entry)) {
            return false;
        }

        const success = result.success === true;
        setQuestAutoCompleteProgress(quest, success ? target.adjusted : 0);

        if (!success) {
            QL.error("AUTO_COMPLETE_ACHIEVEMENT_FAILED", { questId: quest.id, questName: entry.questName, error: result.error });
        }

        return success;
    } catch {
        QL.error("AUTO_COMPLETE_ACHIEVEMENT_FAILED", { questId: quest.id, questName: entry.questName });
        return false;
    } finally {
        try {
            // Cleanup remains valid after cancellation, but only in the initiating account session.
            if (authorizationSucceeded && !hadAuthorization && isCurrentSession()) {
                const grantId = await getApplicationGrantId(appId);

                if (grantId && isCurrentSession()) {
                    await RestAPI.del({ url: `/oauth2/tokens/${encodeURIComponent(grantId)}` });
                    QL.info("AUTO_COMPLETE_ACHIEVEMENT_DEAUTH_SUCCESS", { questId: quest.id, questName: entry.questName, appId });
                }
            }
        } catch {
            QL.error("AUTO_COMPLETE_ACHIEVEMENT_DEAUTH_FAILED", { questId: quest.id, questName: entry.questName, appId });
        } finally {
            activeAchievementApplications.delete(applicationKey);
        }
    }
}

async function runAutoCompleteQuest(quest: Quest, entry: AutoCompleteEntry): Promise<boolean> {
    const target = getAutoCompleteQuestTarget(entry.task);

    QL.info("AUTO_COMPLETE_RUN_START", {
        questId: quest.id,
        questName: entry.questName,
        kind: entry.kind,
        taskType: entry.task.type,
        target,
    });

    switch (entry.kind) {
        case "watch":
            return runVideoQuest(quest, entry, target);
        case "play":
            return runPlayQuest(quest, entry, target);
        case "achievement":
            return runAchievementQuest(quest, entry, target);
    }
}

function hasRunningQueuedAutoComplete(): boolean {
    return Array.from(activeAutoCompletes.values()).some(entry => entry.status === "running");
}

async function runEntry(quest: Quest, entry: AutoCompleteEntry): Promise<void> {
    entry.status = "running";
    updateResumeState();

    try {
        const completed = await runAutoCompleteQuest(quest, entry);

        if (!isEntryActive(entry)) {
            return;
        }

        if (completed) {
            QL.info("AUTO_COMPLETE_COMPLETED", { questId: entry.questId, questName: entry.questName });
        } else {
            QL.warn("AUTO_COMPLETE_FAILED", { questId: entry.questId, questName: entry.questName });
        }
    } catch (error) {
        if (entry.abortController.signal.aborted) {
            QL.warn("AUTO_COMPLETE_RUN_ABORTED", { questId: entry.questId, questName: entry.questName });
        } else {
            QL.error("AUTO_COMPLETE_RUN_ERROR", { questId: entry.questId, questName: entry.questName, error });
        }
    } finally {
        clearEntryTimers(entry);

        if (activeAutoCompletes.get(entry.questId) !== entry) {
            return;
        }

        activeAutoCompletes.delete(entry.questId);
        resetQuestsToResume(quest);
        updateResumeState();

        if (!getQuestifySettings().autoCompleteQuestsSimultaneously && !suppressQueueDrain) {
            runNextQueuedQuest();
        }
    }
}

function runNextQueuedQuest(): void {
    if (suppressQueueDrain || getQuestifySettings().autoCompleteQuestsSimultaneously || hasRunningQueuedAutoComplete()) {
        return;
    }

    const nextEntry = Array.from(activeAutoCompletes.values()).find(entry => entry.status === "queued");

    if (!nextEntry) {
        return;
    }

    const nextQuest = QuestStore.getQuest(nextEntry.questId);

    if (!nextQuest) {
        activeAutoCompletes.delete(nextEntry.questId);
        updateResumeState();
        runNextQueuedQuest();
        return;
    }

    void runEntry(nextQuest, nextEntry);
}

export function processQuestForAutoComplete(quest: Quest, options: AutoCompleteStartOptions = {}): boolean {
    const { force = false, source = "manual" } = options;
    const questName = normalizeQuestName(quest);
    const existingEntry = activeAutoCompletes.get(quest.id);
    const settings = getQuestifySettings();

    if (source === "auto" && (settings.usedKonamiCode !== true || !settings.allowChangingDangerousSettings || settings.autoCompleteQuestsUnpaused === false)) {
        return false;
    }

    if (!isAutoCompleteRuntimeReady(true)) {
        return false;
    }

    if (existingEntry) {
        return true;
    }

    const manualStopKey = `${getCurrentUserId()}:${quest.id}`;

    if (force) {
        manuallyStoppedQuests.delete(manualStopKey);
    } else if (manuallyStoppedQuests.has(manualStopKey)) {
        QL.warn("AUTO_COMPLETE_MANUALLY_STOPPED", { questId: quest.id, questName });
        return false;
    }

    if (quest.userStatus?.completedAt || getQuestStatus(quest, getIgnoredQuestIDs()) !== QuestStatus.Unclaimed) {
        QL.warn("AUTO_COMPLETE_INCOMPATIBLE_STATUS", { questId: quest.id, questName });
        return false;
    }

    const resolvedQuest = resolveAutoCompleteQuest(quest);

    if (!resolvedQuest) {
        QL.warn("AUTO_COMPLETE_INCOMPATIBLE_TASKS", { questId: quest.id, questName });
        return false;
    }

    const entry = createAutoCompleteEntry(quest, resolvedQuest.task, resolvedQuest.kind, source);

    activeAutoCompletes.set(quest.id, entry);

    if (getQuestifySettings().autoCompleteQuestsSimultaneously) {
        void runEntry(quest, entry);
    } else {
        updateResumeState();
        runNextQueuedQuest();
    }

    QL.info("AUTO_COMPLETE_STARTED", {
        questId: quest.id,
        questName,
        source,
        mode: getQuestifySettings().autoCompleteQuestsSimultaneously ? "simultaneous" : "queue",
        taskType: entry.task.type,
    });

    return true;
}

export function isProcessingQuests(): boolean {
    return questProcessingControllers.size > 0;
}

export function getQuestProcessingBatches(): Readonly<QuestProcessingBatch & { cancelled: boolean; }>[] {
    return Array.from(questProcessingControllers, ([controller, batch]) => ({ ...batch, cancelled: controller.signal.aborted }));
}

export function stopQuestProcessing(source?: "manual" | "auto"): void {
    for (const [controller, batch] of questProcessingControllers) {
        if ((!source || batch.source === source) && !controller.signal.aborted) {
            QL.info("QUEST_PROCESSING_CANCEL_REQUESTED", { ...batch });
            controller.abort();
        }
    }
}

function getQuestProcessingAction(quest: Quest, { autoComplete, source = "manual" }: ProcessQuestsOptions): { enroll: boolean; complete: boolean; } {
    const settings = getQuestifySettings();
    const ignoredQuestIds = getIgnoredQuestIDs();

    if (
        settings.disableQuestsEverything ||
        quest.userStatus?.completedAt ||
        getQuestStatus(quest, ignoredQuestIds) !== QuestStatus.Unclaimed ||
        new Date(quest.config.startsAt).getTime() > Date.now() ||
        (!quest.userStatus?.enrolledAt && !isQuestEnrollmentCompatible(quest)) ||
        !questMatchesIncludedTypes(quest, settings.questButtonIncludedTypes as QuestIncludedTypes)
    ) {
        return { enroll: false, complete: false };
    }

    if (source === "auto" && (settings.usedKonamiCode !== true || !settings.allowChangingDangerousSettings || isQuestHidden(quest, ignoredQuestIds))) {
        return { enroll: false, complete: false };
    }

    const complete = autoComplete
        && (source === "manual" || (settings.autoCompleteQuests && settings.autoCompleteQuestsUnpaused !== false))
        && !activeAutoCompletes.has(quest.id)
        && (source === "manual" || !manuallyStoppedQuests.has(`${getCurrentUserId()}:${quest.id}`))
        && canAutoCompleteQuest(quest);
    const autoEnroll = settings.autoEnrollQuests && settings.autoEnrollQuestsUnpaused !== false;
    const enroll = !quest.userStatus?.enrolledAt && (complete || (source === "auto" ? autoEnroll : !autoComplete));

    return { enroll, complete };
}

export function processQuests(quests: readonly Quest[], options: ProcessQuestsOptions): Promise<number> {
    const userId = getCurrentUserId();
    const { source = "manual", autoComplete } = options;
    const uniqueQuests = new Map(quests.map(quest => [quest.id, quest]));
    const context = { batchId: ++nextQuestProcessingBatchId, source, autoComplete, questCount: uniqueQuests.size };

    if (!userId) {
        QL.info("QUEST_PROCESSING_SKIPPED", { ...context, reason: "no_user" });
        return Promise.resolve(0);
    }

    // Cancelled batches retain their slots until they settle to keep the promise chain bounded.
    if (questProcessingControllers.size >= maxQuestProcessingBatches) {
        QL.warn("QUEST_PROCESSING_REJECTED", { ...context, reason: "batch_limit", batchCount: questProcessingControllers.size, maxBatches: maxQuestProcessingBatches });
        return Promise.reject(new Error(`Quest processing limit reached (${maxQuestProcessingBatches} batches).`));
    }

    const controller = new AbortController();
    const batch: QuestProcessingBatch = {
        ...context,
        status: "waiting",
        remainingQuestCount: uniqueQuests.size,
    };

    questProcessingControllers.set(controller, batch);
    QL.info("QUEST_PROCESSING_QUEUED", { ...batch, batchCount: questProcessingControllers.size });
    rerenderQuests();

    const processing = questProcessingTail.then(async () => {
        batch.status = "running";
        let processed = 0;
        let enrollmentFailures = 0;
        let stopReason = "finished";
        let loggedCooldownUntil: number | undefined;
        const { signal } = controller;
        const cancelled = () => signal.aborted || getCurrentUserId() !== userId;

        if (!cancelled()) {
            QL.info("QUEST_PROCESSING_STARTED", { ...batch });
        }

        try {
            await new Promise<void>(resolve => FluxDispatcher.wait(resolve));

            const sortedQuests = Array.from(uniqueQuests.values())
                .map(refreshQuest)
                .filter(quest => {
                    const action = getQuestProcessingAction(quest, options);

                    return action.enroll || action.complete;
                })
                .sort((a, b) => getQuestExpiryTime(a) - getQuestExpiryTime(b));

            batch.remainingQuestCount = sortedQuests.length;

            quests: for (const queuedQuest of sortedQuests) {
                const questId = queuedQuest.id;

                while (!cancelled()) {
                    await sleep(minBatchEnrollmentDelayMs, signal);

                    if (cancelled()) {
                        break quests;
                    }

                    const quest = refreshQuest(queuedQuest);
                    const action = getQuestProcessingAction(quest, options);

                    if (!action.enroll && !action.complete) {
                        break;
                    }

                    const wasEnrolled = Boolean(quest.userStatus?.enrolledAt);
                    const failureKey = `${userId}:${questId}`;

                    if (!wasEnrolled) {
                        if (failedBatchEnrollments.has(failureKey)) {
                            QL.info("QUEST_PROCESSING_QUEST_SKIPPED", { ...context, questId, reason: "previous_enrollment_failure" });
                            break;
                        }

                        const cooldown = getEnrollmentRateLimitRemainingSeconds();
                        const blockedUntil = getQuestifySettings().enrollmentRateLimitBlockedUntil?.[userId];

                        if (cooldown !== null && blockedUntil !== loggedCooldownUntil) {
                            QL.info("QUEST_PROCESSING_COOLDOWN", { ...context, questId, retryAfter: cooldown, blockedUntil, remainingQuestCount: batch.remainingQuestCount });
                        }

                        loggedCooldownUntil = blockedUntil;

                        if (cooldown !== null) {
                            await sleep(Math.min(cooldown * 1000, 60000), signal);
                            continue;
                        }
                    }

                    const enrollment = await ensureQuestEnrolled(quest);

                    if (cancelled()) {
                        break quests;
                    }

                    if (enrollment.type === "rate_limited" && enrollment.retryAfter !== null) {
                        continue;
                    }

                    if (enrollment.type === "previous_in_flight_request" || enrollment.type === "unavailable") {
                        QL.info("QUEST_PROCESSING_QUEST_SKIPPED", { ...context, questId, reason: enrollment.type });
                        break;
                    }

                    if (enrollment.type !== "success") {
                        enrollmentFailures++;
                        QL.warn("QUEST_PROCESSING_ENROLLMENT_FAILED", { ...context, questId, ...enrollment });
                        failedBatchEnrollments.add(failureKey);

                        if (
                            enrollment.type === "rate_limited" ||
                            enrollment.type === "cancelled" ||
                            enrollment.status === null
                        ) {
                            stopReason = enrollment.type === "rate_limited" ? "rate_limit_without_retry"
                                : enrollment.type === "cancelled" ? "enrollment_cancelled" : "unknown_enrollment_error";
                            stopQuestProcessing("auto");
                            break quests;
                        }

                        if (enrollmentFailures >= maxBatchNonRateLimitEnrollmentFailures) {
                            stopReason = "enrollment_failure_limit";
                            stopQuestProcessing("auto");
                            break quests;
                        }

                        break;
                    }

                    const refreshedQuest = refreshQuest(quest);
                    let changed = !wasEnrolled;

                    if (getQuestProcessingAction(refreshedQuest, options).complete) {
                        changed = processQuestForAutoComplete(refreshedQuest, { force: source === "manual", source }) || changed;
                    }

                    if (changed) {
                        processed++;
                    }

                    break;
                }

                if (cancelled()) {
                    break;
                }

                batch.remainingQuestCount--;
            }

            return processed;
        } catch (error) {
            if (cancelled()) {
                return processed;
            }

            stopReason = "error";
            QL.error("QUEST_PROCESSING_BATCH_FAILED", { ...context, error });
            stopQuestProcessing("auto");
            throw error;
        } finally {
            if (stopReason === "finished" && cancelled()) {
                stopReason = getCurrentUserId() !== userId ? "account_changed" : "cancelled";
            }

            QL.info("QUEST_PROCESSING_FINISHED", {
                ...context,
                processedQuestCount: processed,
                remainingQuestCount: batch.remainingQuestCount,
                enrollmentFailures,
                reason: stopReason,
            });
        }
    }).finally(() => {
        questProcessingControllers.delete(controller);

        if (questProcessingControllers.size === 0) {
            failedBatchEnrollments.clear();
        }

        rerenderQuests();
    });

    questProcessingTail = processing.then(() => { }, () => { });

    return processing;
}

export function stopQuestAutoComplete(questOrId: Quest | string, options: AutoCompleteStopOptions = {}): boolean {
    const { manual = true, preserveResume = false, terminalHeartbeat = false, userId = getCurrentUserId() } = options;
    const questId = typeof questOrId === "string" ? questOrId : questOrId.id;
    const entry = activeAutoCompletes.get(questId);
    const resumeQuestIds = preserveResume ? getResumeQuestIds() : undefined;
    const automaticQuestIds = preserveResume ? getAutomaticResumeQuestIds() : undefined;

    if (manual && userId) {
        manuallyStoppedQuests.add(`${userId}:${questId}`);
    }

    if (!entry) {
        if (userId) {
            updateResumeState(resumeQuestIds, userId, automaticQuestIds);
        }

        return false;
    }

    clearEntryTimers(entry);
    entry.abortController.abort();
    activeAutoCompletes.delete(questId);

    const quest = typeof questOrId === "string" ? QuestStore.getQuest(questId) : questOrId;

    if (terminalHeartbeat && userId && userId === getCurrentUserId() && quest && entry.kind === "play" && entry.status === "running") {
        void reportPlayQuestProgress(refreshQuest(quest), entry, true, { attempts: 1 });
    }

    if (userId) {
        if (!preserveResume) {
            resetQuestsToResume(quest, userId);
        }

        updateResumeState(resumeQuestIds, userId, automaticQuestIds);
    }

    if (!getQuestifySettings().autoCompleteQuestsSimultaneously && !suppressQueueDrain) {
        runNextQueuedQuest();
    }

    QL.info("AUTO_COMPLETE_STOPPED", { questId, manual, preserveResume, terminalHeartbeat });
    return true;
}

export function stopAllAutoCompletes(options: AutoCompleteStopOptions = {}): void {
    autoCompleteStartGeneration++;
    stopQuestProcessing();

    const resumeQuestIds = options.preserveResume ? getResumeQuestIds() : undefined;
    const automaticQuestIds = options.preserveResume ? getAutomaticResumeQuestIds() : undefined;
    const userId = options.userId === undefined ? getCurrentUserId() : options.userId;

    suppressQueueDrain = true;

    try {
        for (const questId of Array.from(activeAutoCompletes.keys())) {
            stopQuestAutoComplete(questId, { ...options, userId });
        }

        // An empty runtime queue may not have restored the saved queue yet.
        if (userId && (!options.preserveResume || resumeQuestIds?.length || !getQuestifySettings().resumeInterruptedQuests)) {
            updateResumeState(resumeQuestIds, userId, automaticQuestIds);
        }
    } finally {
        suppressQueueDrain = false;
    }
}

export function stopAutomaticAutoCompletes(): void {
    suppressQueueDrain = true;

    try {
        for (const entry of Array.from(activeAutoCompletes.values())) {
            if (entry.source === "auto") {
                stopQuestAutoComplete(entry.questId, { manual: false });
            }
        }
    } finally {
        suppressQueueDrain = false;
    }

    runNextQueuedQuest();
}

export function stopAutoCompletesForRunningGames(gameIds: string[]): boolean {
    let stoppedAny = false;

    for (const entry of Array.from(activeAutoCompletes.values())) {
        const quest = QuestStore.getQuest(entry.questId);

        if (entry.kind === "play" && quest && entry.task.applications?.some(({ id }) => gameIds.includes(id))) {
            stopQuestAutoComplete(quest, { manual: false, preserveResume: false });
            stoppedAny = true;
        }
    }

    if (stoppedAny) {
        rerenderQuests();
    }

    return stoppedAny;
}

export function resumeInterruptedAutoCompletes(): void {
    if (!getQuestifySettings().resumeInterruptedQuests) {
        return;
    }

    const userId = getCurrentUserId();
    const resumeState = userId ? getQuestifySettings().resumeQuestIDs[userId] : null;

    if (!userId || !resumeState?.questIDs.length) {
        return;
    }

    if (isResumeStateExpired(resumeState.timestamp)) {
        delete getQuestifySettings().resumeQuestIDs[userId];
        QL.info("AUTO_COMPLETE_RESUME_EXPIRED", { userId, timestamp: resumeState.timestamp, maxAge: resumeExpiryMs });
        return;
    }

    const resumeQuestIds = Array.from(new Set(resumeState.questIDs));
    const resumableQuests = resumeQuestIds
        .map(questId => QuestStore.getQuest(questId))
        .filter((quest): quest is Quest => quest != null);

    if (resumableQuests.length === 0) {
        updateResumeState();
        return;
    }

    QL.info("AUTO_COMPLETE_RESUME_INTERRUPTED", {
        userId,
        timestamp: resumeState.timestamp,
        questIDs: resumeQuestIds,
    });

    const resumedQuestIds = new Set<string>();

    for (const quest of resumableQuests) {
        const source = resumeState.automaticQuestIDs?.includes(quest.id) ? "auto" : "resume";

        if (processQuestForAutoComplete(quest, { force: true, source })) {
            resumedQuestIds.add(quest.id);
        }
    }

    updateResumeState();

    const droppedQuestIds = resumeQuestIds.filter(questId => !resumedQuestIds.has(questId));

    if (droppedQuestIds.length > 0) {
        QL.warn("AUTO_COMPLETE_RESUME_DROPPED_QUESTS", {
            userId,
            questIDs: droppedQuestIds,
        });
    }
}

export function getActiveAutoCompletes(): readonly Readonly<AutoCompleteEntry>[] {
    return Array.from(activeAutoCompletes.values());
}
