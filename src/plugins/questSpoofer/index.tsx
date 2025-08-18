import "./style.css";


import ErrorBoundary from "@components/ErrorBoundary";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Button, ChannelStore, FluxDispatcher, GuildChannelStore, React, RestAPI, showToast, Toasts, TooltipContainer } from "@webpack/common";
import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";

const RunningGameStore: any = findStoreLazy("RunningGameStore");
const ApplicationStreamingStore: any = findStoreLazy("ApplicationStreamingStore");
const QuestsStore: any = findStoreLazy("QuestsStore");

function isDesktopApp() {
    return typeof (window as any).DiscordNative !== "undefined";
}

function getActiveQuest() {
    const questsIter: Iterable<any> | undefined = QuestsStore?.quests?.values?.();
    const quests = questsIter ? Array.from(questsIter) : [];
    const now = Date.now();
    const notEnded = (q: any) => new Date(q?.config?.expiresAt).getTime() > now;
    const notCompleted = (q: any) => !(q?.userStatus?.completedAt);
    const notBlacklisted = (q: any) => q?.id !== "1248385850622869556";
    let quest: any = quests.find((q: any) => notBlacklisted(q) && q?.userStatus?.enrolledAt && notCompleted(q) && notEnded(q));
    if (!quest) quest = quests.find((q: any) => notBlacklisted(q) && notCompleted(q) && notEnded(q));
    return quest ?? null;
}

function getQuestById(id: string | number) {
    const map: Map<string, any> | undefined = QuestsStore?.quests;
    if (!map) return null;
    return (map.get(String(id)) ?? null) as any;
}

function canSpoofQuest(quest: any) {
    if (!quest) return false;
    const now = Date.now();
    const expires = new Date(quest?.config?.expiresAt).getTime();
    const notExpired = expires > now;
    const notCompleted = !quest?.userStatus?.completedAt;
    return notExpired && notCompleted;
}

function markQuestCompletedUI(questId: string | number) {
    try {
        const tile = document.getElementById(`quest-tile-${questId}`) as HTMLElement | null;
        if (!tile) return;
        if (getComputedStyle(tile).position === "static") tile.style.position = "relative";
        tile.querySelector<HTMLElement>(".vc-qs-spoof-btn")?.remove();
        tile.querySelectorAll<HTMLElement>(".vc-qs-banner").forEach(n => n.remove());
        const done = document.createElement("div");
        done.className = "vc-qs-banner vc-qs-success vc-qs-floating";
        done.textContent = "Quest spoofed!";
        tile.appendChild(done);
    } catch { }
}

async function spoofQuest(quest: any) {
    try {
        if (!quest) {
            showToast("You don't have any uncompleted quests!", Toasts.Type.MESSAGE);
            return;
        }

        const pid = Math.floor(Math.random() * 30000) + 1000;
        const applicationId = quest.config?.application?.id;
        const applicationName = quest.config?.application?.name;
        const questName = quest.config?.messages?.questName ?? "Quest";
        const taskConfig = quest.config?.taskConfig ?? quest.config?.taskConfigV2 ?? {};
        const taskName = [
            "WATCH_VIDEO",
            "PLAY_ON_DESKTOP",
            "STREAM_ON_DESKTOP",
            "PLAY_ACTIVITY",
            "WATCH_VIDEO_ON_MOBILE"
        ].find(k => taskConfig?.tasks?.[k] != null);

        if (!taskName) {
            showToast("Unsupported quest type.", Toasts.Type.FAILURE);
            return;
        }

        const secondsNeeded: number = taskConfig.tasks[taskName].target;
        let secondsDone: number = quest.userStatus?.progress?.[taskName]?.value ?? 0;

        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            const maxFuture = 10, speed = 7, interval = 1;
            const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
            let completed = false;

            (async () => {
                while (true) {
                    const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
                    const diff = maxAllowed - secondsDone;
                    const timestamp = secondsDone + speed;
                    if (diff >= speed) {
                        const res = await RestAPI.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) } });
                        completed = res?.body?.completed_at != null;
                        secondsDone = Math.min(secondsNeeded, timestamp);
                    }
                    if (timestamp >= secondsNeeded) break;
                    await new Promise(r => setTimeout(r, interval * 1000));
                }
                if (!completed) {
                    await RestAPI.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
                }
                showToast("Quest completed!", Toasts.Type.SUCCESS);
                markQuestCompletedUI(quest.id);
            })();

            showToast(`Spoofing video progress for "${questName}".`, Toasts.Type.MESSAGE);
            return;
        }

        if (taskName === "PLAY_ON_DESKTOP") {
            if (!isDesktopApp()) {
                showToast(`Use the desktop app to complete the ${questName} quest.`, Toasts.Type.FAILURE);
                return;
            }

            const appDataRes = await RestAPI.get({ url: `/applications/public?application_ids=${applicationId}` });
            const appData = appDataRes?.body?.[0];
            const exeName: string = appData?.executables?.find((x: any) => x.os === "win32")?.name?.replace?.(">", "") ?? `${applicationName}.exe`;
            const fakeGame = {
                cmdLine: `C:\\Program Files\\${appData?.name ?? applicationName}\\${exeName}`,
                exeName,
                exePath: `c:/program files/${(appData?.name ?? applicationName).toLowerCase()}/${exeName}`,
                hidden: false,
                isLauncher: false,
                id: applicationId,
                name: appData?.name ?? applicationName,
                pid: pid,
                pidPath: [pid],
                processName: appData?.name ?? applicationName,
                start: Date.now()
            };

            const realGames = RunningGameStore.getRunningGames();
            const fakeGames = [fakeGame];
            const realGetRunningGames = RunningGameStore.getRunningGames;
            const realGetGameForPID = RunningGameStore.getGameForPID;

            RunningGameStore.getRunningGames = () => fakeGames;
            RunningGameStore.getGameForPID = (p: number) => fakeGames.find((x: any) => x.pid === p);
            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

            const onHeartbeat = (data: any) => {
                const progress = quest.config?.configVersion === 1 ? data?.userStatus?.streamProgressSeconds : Math.floor(data?.userStatus?.progress?.PLAY_ON_DESKTOP?.value ?? 0);
                if (progress >= secondsNeeded) {
                    showToast("Quest completed!", Toasts.Type.SUCCESS);
                    markQuestCompletedUI(quest.id);
                    RunningGameStore.getRunningGames = realGetRunningGames;
                    RunningGameStore.getGameForPID = realGetGameForPID;
                    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS" as any, onHeartbeat as any);
                }
            };
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS" as any, onHeartbeat as any);
            showToast(`Spoofed your game to ${applicationName}. Wait ~${Math.max(0, Math.ceil((secondsNeeded - secondsDone) / 60))} minutes.`, Toasts.Type.MESSAGE);
            return;
        }

        if (taskName === "STREAM_ON_DESKTOP") {
            if (!isDesktopApp()) {
                showToast(`Use the desktop app to complete the ${questName} quest.`, Toasts.Type.FAILURE);
                return;
            }

            const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({ id: applicationId, pid, sourceName: null });

            const onHeartbeat = (data: any) => {
                const progress = quest.config?.configVersion === 1 ? data?.userStatus?.streamProgressSeconds : Math.floor(data?.userStatus?.progress?.STREAM_ON_DESKTOP?.value ?? 0);
                if (progress >= secondsNeeded) {
                    showToast("Quest completed!", Toasts.Type.SUCCESS);
                    markQuestCompletedUI(quest.id);
                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS" as any, onHeartbeat as any);
                }
            };
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS" as any, onHeartbeat as any);
            showToast(`Spoofed your stream to ${applicationName}. Stream any window with at least one viewer for ~${Math.max(0, Math.ceil((secondsNeeded - secondsDone) / 60))} minutes.`, Toasts.Type.MESSAGE);
            return;
        }

        if (taskName === "PLAY_ACTIVITY") {
            const dm = ChannelStore.getSortedPrivateChannels?.()?.[0]?.id;
            const guilds = GuildChannelStore.getAllGuilds?.();
            const firstVocal = guilds && Object.values<any>(guilds).find((x: any) => x != null && x.VOCAL?.length > 0)?.VOCAL?.[0]?.channel?.id;
            const channelId = dm ?? firstVocal;
            if (!channelId) {
                showToast("No suitable channel found for activity quest.", Toasts.Type.FAILURE);
                return;
            }
            const streamKey = `call:${channelId}:1`;
            (async () => {
                while (true) {
                    const res = await RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                    const progress = res?.body?.progress?.PLAY_ACTIVITY?.value ?? 0;
                    if (progress >= secondsNeeded) {
                        await RestAPI.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                        showToast("Quest completed!", Toasts.Type.SUCCESS);
                        markQuestCompletedUI(quest.id);
                        break;
                    }
                    await new Promise(r => setTimeout(r, 20 * 1000));
                }
            })();
            showToast(`Completing quest "${questName}"...`, Toasts.Type.MESSAGE);
            return;
        }

        showToast("Unhandled quest type.", Toasts.Type.FAILURE);
    } catch (e) {
        console.error("QuestSpoofer error", e);
        showToast("Failed to spoof quest. See console for details.", Toasts.Type.FAILURE);
    }
}

async function spoofCurrentQuest() {
    const quest: any = getActiveQuest();
    await spoofQuest(quest);
}

const QuestSpoofButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;
    return (
        <ChatBarButton
            tooltip="Spoof current quest"
            onClick={() => {
                void spoofCurrentQuest();
            }}
        >
            <span style={{ fontWeight: 700 }}>Q</span>
        </ChatBarButton>
    );
};

const settings = definePluginSettings({});

export default definePlugin({
    name: "Quest Spoofer",
    description: "A simple plugin to spoof quests easily with one button click. Credits: Amia (@aamiaa) on GitHub",
    authors: [{ name: "n1ghtm", id: 795258371326083103n }],
    dependencies: ["ChatInputButtonAPI"],
    settings,

    patches: [
        {
            find: ".promotedLabelWrapperNonBanner,children",
            replacement: {
                match: /\.appDetailsHeaderContainer.+?children:\i.*?}\),(?<=application:(\i).+?)/,
                replace: (m: string, props: string) => `${m}$self.renderQuestCardButton(${props}),`
            }
        }
    ],

    renderChatBarButton: QuestSpoofButton,

    renderQuestCardButton: ErrorBoundary.wrap((props: { id: string; name: string; }) => {
        const quest = getActiveQuest();
        if (!quest) return null;
        const activeAppId = quest.config?.application?.id;
        if (String(props.id) !== String(activeAppId)) return null;
        return (
            <TooltipContainer text="Spoof current quest">
                <Button
                    size={Button.Sizes.NONE}
                    look={Button.Looks.FILLED}
                    color={Button.Colors.CUSTOM}
                    className="vc-qs-spoof-btn vc-qs-active"
                    onClick={() => void spoofCurrentQuest()}
                >
                    Spoof Quest
                </Button>
            </TooltipContainer>
        );
    }, { noop: true }),

    start() {
        const processTile = (tile: HTMLElement) => {
            if (tile.dataset.vcQsInjected === "1") return;
            tile.dataset.vcQsInjected = "1";
            try {
                const idAttr = tile.id?.startsWith("quest-tile-") ? tile.id.slice("quest-tile-".length) : null;
                const quest = idAttr ? getQuestById(idAttr) : null;
                if (getComputedStyle(tile).position === "static") tile.style.position = "relative";

                const existing = tile.querySelector<HTMLElement>(".vc-qs-spoof-btn, .vc-qs-banner");
                if (existing) return;

                if (canSpoofQuest(quest)) {
                    const btn = document.createElement("button");
                    btn.className = "vc-qs-spoof-btn vc-qs-active vc-qs-floating";
                    btn.textContent = "Spoof Quest";
                    btn.onclick = () => void spoofQuest(quest);
                    tile.appendChild(btn);
                } else {
                    const banner = document.createElement("div");
                    banner.className = "vc-qs-banner vc-qs-floating";
                    banner.textContent = "This quest is not spoofable";
                    tile.appendChild(banner);
                }
            } catch { }
        };

        const scan = () => {
            const tiles = document.querySelectorAll<HTMLElement>('div[id^="quest-tile-"]');
            tiles.forEach(processTile);
        };

        scan();
        const obs = new MutationObserver(muts => {
            for (const m of muts) {
                const nodes = Array.from(m.addedNodes) as Element[];
                for (const n of nodes) {
                    if (!(n instanceof HTMLElement)) continue;
                    if (n.id?.startsWith?.("quest-tile-")) processTile(n);
                    n.querySelectorAll?.('div[id^="quest-tile-"]')?.forEach(el => processTile(el as HTMLElement));
                }
            }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        (this as any)._qsObserver = obs;
    },

    stop() {
        const obs: MutationObserver | undefined = (this as any)._qsObserver;
        obs?.disconnect();
    }
});


