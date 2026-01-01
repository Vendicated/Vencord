import definePlugin from "@utils/types";
import { showNotification } from "@api/Notifications";

function addSpoofButton() {
    const headingControls = document.querySelector('div[class*="headingControls"]');
    const videoQ = document.querySelector('div[class*="contentFooterButtonCont"]');


    if (headingControls && !headingControls.querySelector("#spoof-button")) {
        createAndInsertButton(headingControls, "sm_a22cb0");
    }

    if (videoQ && !videoQ.querySelector("#spoof-button")) {
        createAndInsertButton(videoQ, "md_a22cb0");
    }
}

function createAndInsertButton(container: Element, sizeClass: string) {
    const myButton = document.createElement("button");
    myButton.id = "spoof-button";
    myButton.className = `button_a22cb0 ${sizeClass} secondary_a22cb0 hasText_a22cb0`;
    myButton.type = "button";
    myButton.style.border = "1px solid purple";

    myButton.innerHTML = `
        <div class="buttonChildrenWrapper_a22cb0">
            <div class="buttonChildren_a22cb0">
                <span class="lineClamp1__4bd52 text-sm/medium_cf4812" data-text-variant="text-sm/medium">Spoof</span>
                <svg class="icon_a22cb0" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/>
                </svg>
            </div>
        </div>
    `;

    myButton.addEventListener("click", executeQuestSpoofing);
    container.insertBefore(myButton, container.firstChild);
}

// Spoof Code From https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb by https://gist.github.com/aamiaa
function executeQuestSpoofing() {
    // Inject spoofing functionality
    delete window.$;
    const wpRequire = (window as any).webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
    (window as any).webpackChunkdiscord_app.pop();

    const wpModules = Object.values(wpRequire.c) as any[];

    let ApplicationStreamingStore = wpModules.find(x => (x as any)?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.exports.Z;
    let RunningGameStore = wpModules.find(x => (x as any)?.exports?.ZP?.getRunningGames)?.exports.ZP;
    let QuestsStore = wpModules.find(x => (x as any)?.exports?.Z?.__proto__?.getQuest)?.exports.Z;
    let ChannelStore = wpModules.find(x => (x as any)?.exports?.Z?.__proto__?.getAllThreadsForParent)?.exports.Z;
    let GuildChannelStore = wpModules.find(x => (x as any)?.exports?.ZP?.getSFWDefaultChannel)?.exports.ZP;
    let FluxDispatcher = wpModules.find(x => (x as any)?.exports?.Z?.__proto__?.flushWaitQueue)?.exports.Z;
    let api = wpModules.find(x => (x as any)?.exports?.tn?.get)?.exports.tn;

    let quest = [...QuestsStore.quests.values()].find(x => x.id !== "1412491570820812933" && x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now())
    let isApp = typeof DiscordNative !== "undefined"

    if(!quest) {
        console.log("You don't have any uncompleted quests!");
        showNotification({
            title: "No Quest Found",
            body: "You don't have any uncompleted quests!",
            color: "#ed4245"
        });
        return;
    }

    const pid = Math.floor(Math.random() * 30000) + 1000

    const applicationId = quest.config.application.id
    const applicationName = quest.config.application.name
    const questName = quest.config.messages.questName
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2
    const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null)
    if (!taskName) {
        console.log("No valid task found for this quest!");
        showNotification({
            title: "Invalid Quest",
            body: "No valid task found for this quest!",
            color: "#ed4245"
        });
        return;
    }
    const secondsNeeded = taskConfig.tasks[taskName].target
    let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0

    if(taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
        const maxFuture = 10, speed = 7, interval = 1
        const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime()
        let completed = false
        let fn = async () => {
            while(true) {
                const maxAllowed = Math.floor((Date.now() - enrolledAt)/1000) + maxFuture
                const diff = maxAllowed - secondsDone
                const timestamp = secondsDone + speed
                if(diff >= speed) {
                    const res = await api.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}})
                    completed = res.body.completed_at != null
                    secondsDone = Math.min(secondsNeeded, timestamp)
                }

                if(timestamp >= secondsNeeded) {
                    break
                }
                await new Promise(resolve => setTimeout(resolve, interval * 1000))
            }
            if(!completed) {
                await api.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: secondsNeeded}})
            }
            console.log("Quest completed!")
            showNotification({
                title: "Quest Completed!",
                body: `Successfully completed ${questName} quest!`,
                color: "#3ba55c"
            });
        }
        fn()
        console.log(`Spoofing video for ${questName}.`)
        showNotification({
            title: "Video Spoofing Started",
            body: `Spoofing video for ${questName}.`,
            color: "#5865f2"
        });
    } else if(taskName === "PLAY_ON_DESKTOP") {
        if(!isApp) {
            console.log("This no longer works in browser for non-video quests. Use the discord desktop app to complete the", questName, "quest!")
            showNotification({
                title: "Desktop App Required",
                body: `This no longer works in browser. Use Discord desktop app to complete ${questName} quest!`,
                color: "#faa81a"
            });
        } else {
            api.get({url: `/applications/public?application_ids=${applicationId}`}).then(res => {
                const appData = res.body[0]
                const exeName = appData.executables.find(x => x.os === "win32").name.replace(">","")

                const fakeGame = {
                    cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                    exeName,
                    exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                    hidden: false,
                    isLauncher: false,
                    id: applicationId,
                    name: appData.name,
                    pid: pid,
                    pidPath: [pid],
                    processName: appData.name,
                    start: Date.now(),
                }
                const realGames = RunningGameStore.getRunningGames()
                const fakeGames = [fakeGame]
                const realGetRunningGames = RunningGameStore.getRunningGames
                const realGetGameForPID = RunningGameStore.getGameForPID
                RunningGameStore.getRunningGames = () => fakeGames
                RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid)
                FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames})

                let fn = data => {
                    let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value)
                    console.log(`Quest progress: ${progress}/${secondsNeeded}`)

                    if(progress >= secondsNeeded) {
                        console.log("Quest completed!")
                        showNotification({
                            title: "Quest Completed!",
                            body: `Successfully completed ${questName} quest!`,
                            color: "#3ba55c"
                        });

                        RunningGameStore.getRunningGames = realGetRunningGames
                        RunningGameStore.getGameForPID = realGetGameForPID
                        FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: []})
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)
                    }
                }
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)

                showNotification({
                    title: `${applicationName} Spoofed!`,
                    body: `Spoofed your game to ${applicationName}. Wait for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`,
                    color: "#5865f2"
                });
                console.log(`Spoofed your game to ${applicationName}. Wait for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`)
            }).catch(err => {
                console.log("Failed to fetch application data:", err);
                showNotification({
                    title: "Application Error",
                    body: "Failed to fetch application data for spoofing.",
                    color: "#ed4245"
                });
            })
        }
    } else if(taskName === "STREAM_ON_DESKTOP") {
        if(!isApp) {
            console.log("This no longer works in browser for non-video quests. Use the discord desktop app to complete the", questName, "quest!")
            showNotification({
                title: "Desktop App Required",
                body: `This no longer works in browser. Use Discord desktop app to complete ${questName} quest!`,
                color: "#faa81a"
            });
        } else {
            let realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                id: applicationId,
                pid,
                sourceName: null
            })

            let fn = data => {
                let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value)
                console.log(`Quest progress: ${progress}/${secondsNeeded}`)

                if(progress >= secondsNeeded) {
                    console.log("Quest completed!")
                    showNotification({
                        title: "Quest Completed!",
                        body: `Successfully completed ${questName} quest!`,
                        color: "#3ba55c"
                    });

                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)
                }
            }
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)

            console.log(`Spoofed your stream to ${applicationName}. Stream any window in vc for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`)
            showNotification({
                title: "Stream Spoofing Started",
                body: `Spoofed stream to ${applicationName}. Stream any window in VC for ${Math.ceil((secondsNeeded - secondsDone) / 60)} minutes. Remember: Need at least 1 other person in VC!`,
                color: "#5865f2"
            });
            console.log("Remember that you need at least 1 other person to be in the vc!")
        }
    } else if(taskName === "PLAY_ACTIVITY") {
        const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id
    ?? (Object.values(GuildChannelStore.getAllGuilds()) as any[]).find(x => x?.VOCAL?.length > 0)?.VOCAL[0].channel.id;

        const streamKey = `call:${channelId}:1`

        let fn = async () => {
            console.log("Completing quest", questName, "-", quest.config.messages.questName)
            showNotification({
                title: "Activity Quest Started",
                body: `Completing ${questName} quest. Progress will be updated automatically.`,
                color: "#5865f2"
            });

            while(true) {
                const res = await api.post({url: `/quests/${quest.id}/heartbeat`, body: {stream_key: streamKey, terminal: false}})
                const progress = res.body.progress.PLAY_ACTIVITY.value
                console.log(`Quest progress: ${progress}/${secondsNeeded}`)

                await new Promise(resolve => setTimeout(resolve, 20 * 1000))

                if(progress >= secondsNeeded) {
                    await api.post({url: `/quests/${quest.id}/heartbeat`, body: {stream_key: streamKey, terminal: true}})
                    break
                }
            }

            console.log("Quest completed!")
            showNotification({
                title: "Quest Completed!",
                body: `Successfully completed ${questName} quest!`,
                color: "#3ba55c"
            });
        }
        fn()
    }
}

export default definePlugin({
    name: "اجمع لك اوربيز ؟",
    description: "الاوربيز هذي تقدر تشتري فيها نيترو او افكت للافتار او حتى للبروفايل",
    authors:[{
        name: "rz30",
        id: 786315593963536415n
    }],

    start() {
        this.observer = new MutationObserver(() => {
            if (!document.title.toLowerCase().includes("quests")) return;

            addSpoofButton();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    stop() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
});
