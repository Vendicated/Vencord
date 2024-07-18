/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const soundFileMapping: { [key: string]: string[]; } = {
    discodoDetuneURL: ["c9bfe03395cf2616891f.mp3", "9b8b7e8c94287d5491a8.mp3"],
    activitiesRocketTimeURL: ["cd402df20cddf4d85b4b.mp3"],
    activityEndURL: ["37530244cdcd5141095b.mp3"],
    activityLaunchURL: ["267f72c6f838aac3be94.mp3"],
    activityUserJoinURL: ["74c606872cea9803e310.mp3"],
    activityUserLeftURL: ["99bd2585703114d2df64.mp3"],
    asmrMessage1URL: ["d04d1ee13ab2d7d04e97.mp3"],
    bitMessage1URL: ["fd9f21c60424f7bbe603.mp3"],
    bopMessage1URL: ["f9b3c218d2bac00a50a5.mp3"],
    callCallingURL: ["11b68eb8f243b5f6c8d7.mp3", "ec09898a0bd65dfaa768.mp3"],
    callRingingURL: ["986703daecf955ce3ce3.mp3", "6345bccfecdfa67fdb97.mp3"],
    callRingingBeatURL: ["3b3a2f5f29b9cb656efb.mp3"],
    callRingingHalloweenURL: ["feb12b25f1200b97c4eb.mp3"],
    callRingingSnowHalationURL: ["99b1d8a6fe0b95e99827.mp3"],
    callRingingSnowsgivingURL: ["54527e70cf0ddaeff76f.mp3"],
    clipErrorURL: ["4185e05ac87668c95db7.mp3"],
    clipSaveURL: ["f96b272b4140be6ce8a9.mp3"],
    ddrDownURL: ["60b2fa578027733f07b2.mp3"],
    ddrLeftURL: ["6a2283291b8468b5dcbc.mp3"],
    ddrRightURL: ["ede3b86253bb4aa1615b.mp3"],
    ddrUpURL: ["89547833e1e1ebb138a4.mp3"],
    deafenURL: ["763976e8bc7c745f1bbb.mp3", "1e63dc2f54bef5c5003c.mp3"],
    disconnectDetuneURL: ["752b32be8f41b5ef55c4.mp3"],
    duckyMessage1URL: ["7732a4c7760789c64269.mp3"],
    hangStatusSelectURL: ["6f82a1ced41ffba7e474.mp3"],
    highfiveClapURL: ["b6765c41e5305ed3ccbf.mp3"],
    highfiveWhistleURL: ["ea499ca7cb948b4e89f3.mp3"],
    humanManURL: ["ba335c8e058cf0edef0c.mp3"],
    lofiMessage1URL: ["8fd01840800c5b8d5d40.mp3"],
    mention1URL: ["72d6195de7af6f6c522f.mp3"],
    mention2URL: ["5746c97822ddd998ecaa.mp3"],
    mention3URL: ["90268f54ea2962dd9a9d.mp3"],
    message1DetuneURL: ["70ae9d5bc54e4e0954f9.mp3", "ed256a76f3fe748177de.mp3"],
    message2URL: ["94d97da9d3ca65ca5c48.mp3"],
    message3URL: ["647a0cfe7a004fa8b20d.mp3"],
    muteDetuneURL: ["ad1365b07daf20cf62d5.mp3", "e8ffe6892e47d655e796.mp3"],
    overlayunlockURL: ["cf5424f20c2a9c65b6bc.mp3"],
    poggermodeAchievementUnlockURL: ["156fff4a60f8bd215dd9.mp3"],
    poggermodeApplauseURL: ["07ff9c560f9ba1c99cc8.mp3"],
    poggermodeEnabledURL: ["73eaa6460d4bdb9dcd4d.mp3"],
    poggermodeMessageSendURL: ["7e01b5cb50d9d1941f16.mp3"],
    pttStartDetuneURL: ["369f4aaf35687b9f986d.mp3", "3d1f7316482d3b37e947.mp3"],
    pttStopDetuneURL: ["b843a42563e5f3144483.mp3", "1e1af3535e94d2143b69.mp3"],
    reconnectURL: ["da2dc3239ecd9ab74be1.mp3"],
    robotManURL: ["76ff191944dd58f4835f.mp3"],
    stageWaitingURL: ["e23b4d3cf753989097f4.mp3"],
    streamEndedDetuneURL: ["9b12ba39365fff66dd95.mp3", "8f4bc39481c815b02e4c.mp3"],
    streamStartedDetuneURL: ["d954d7bfa51d58a25610.mp3", "7868133f107297d09719.mp3"],
    streamUserJoinedDetuneURL: ["e9fa25653b507623acbd.mp3", "5320b9eae726f7c7b3f5.mp3"],
    streamUserLeftDetuneURL: ["0fdb31ebfdaf7e86e7ff.mp3", "b45e91a78a4377b853b8.mp3"],
    successURL: ["1cc608397adb2bb151de.mp3"],
    undeafenDetuneURL: ["2f7089b0d3e66e7d6d67.mp3", "c87a93fd4b6918f21b8d.mp3"],
    unmuteDetuneURL: ["80f50a0752b5cd6028ac.mp3", "1bf3e7ad8588f290f1d8.mp3"],
    userJoinDetuneURL: ["93034ac8d9eba50e3354.mp3", "376a8b2b79947dabac6d.mp3"],
    userLeaveDetuneURL: ["fea7a918aecf33a04116.mp3", "9ea3b5ecbcad19a243e6.mp3"],
    userMovedDetuneURL: ["e490f52f12a18334ae94.mp3", "af380400eb22d2fa80dc.mp3"],
    vibingWumpusURL: ["38b1c58d275e828aa9b6.mp3"]
};

const settings = definePluginSettings({
    discodoDetuneURL: {
        description: "Audio URL for discodo sound",
        type: OptionType.STRING,
        default: "https://www.myinstants.com/media/sounds/explosion-m.mp3",
        restartNeeded: true
    },
    activitiesRocketTimeURL: {
        description: "Audio URL for activities rocket time sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    activityEndURL: {
        description: "Audio URL for activity end sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    activityLaunchURL: {
        description: "Audio URL for activity launch sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    activityUserJoinURL: {
        description: "Audio URL for activity user join sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    activityUserLeftURL: {
        description: "Audio URL for activity user left sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    asmrMessage1URL: {
        description: "Audio URL for asmr message1 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    bitMessage1URL: {
        description: "Audio URL for bit message1 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    bopMessage1URL: {
        description: "Audio URL for bop message1 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    callCallingURL: {
        description: "Audio URL for call calling sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    callRingingURL: {
        description: "Audio URL for call ringing sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    callRingingBeatURL: {
        description: "Audio URL for call ringing beat sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    callRingingHalloweenURL: {
        description: "Audio URL for call ringing halloween sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    callRingingSnowHalationURL: {
        description: "Audio URL for call ringing snow halation sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    callRingingSnowsgivingURL: {
        description: "Audio URL for call ringing snowsgiving sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    clipErrorURL: {
        description: "Audio URL for clip error sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    clipSaveURL: {
        description: "Audio URL for clip save sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    ddrDownURL: {
        description: "Audio URL for ddr down sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    ddrLeftURL: {
        description: "Audio URL for ddr left sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    ddrRightURL: {
        description: "Audio URL for ddr right sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    ddrUpURL: {
        description: "Audio URL for ddr up sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    deafenURL: {
        description: "Audio URL for deafen sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    disconnectDetuneURL: {
        description: "Audio URL for disconnect sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    duckyMessage1URL: {
        description: "Audio URL for ducky message1 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    hangStatusSelectURL: {
        description: "Audio URL for hang status select sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    highfiveClapURL: {
        description: "Audio URL for highfive clap sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    highfiveWhistleURL: {
        description: "Audio URL for highfive whistle sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    humanManURL: {
        description: "Audio URL for human man sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    lofiMessage1URL: {
        description: "Audio URL for lofi message1 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    mention1URL: {
        description: "Audio URL for mention1 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    mention2URL: {
        description: "Audio URL for mention2 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    mention3URL: {
        description: "Audio URL for mention3 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    message2URL: {
        description: "Audio URL for message2 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    message3URL: {
        description: "Audio URL for message3 sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    muteDetuneURL: {
        description: "Audio URL for mute sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    overlayunlockURL: {
        description: "Audio URL for overlay unlock sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    poggermodeAchievementUnlockURL: {
        description: "Audio URL for poggermode achievement unlock sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    poggermodeApplauseURL: {
        description: "Audio URL for poggermode applause sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    poggermodeEnabledURL: {
        description: "Audio URL for poggermode enabled sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    poggermodeMessageSendURL: {
        description: "Audio URL for poggermode message send sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    pttStartDetuneURL: {
        description: "Audio URL for ptt start sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    pttStopDetuneURL: {
        description: "Audio URL for ptt stop sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    reconnectURL: {
        description: "Audio URL for reconnect sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    robotManURL: {
        description: "Audio URL for robot man sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    stageWaitingURL: {
        description: "Audio URL for stage waiting sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    successURL: {
        description: "Audio URL for success sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    vibingWumpusURL: {
        description: "Audio URL for vibing wumpus sound",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    }
});

function getSoundURL(settingKey: string) {
    const url = settings.store[settingKey];
    const knownAudioExtensions = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"];

    const isValidURL = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch (_) {
            return false;
        }
    };

    const hasValidExtension = (url: string) => {
        return knownAudioExtensions.some(ext => url.toLowerCase().endsWith(ext));
    };

    const addHttpsIfMissing = (url: string) => {
        if (!/^https?:\/\//i.test(url)) {
            return `https://${url}`;
        }
        return url;
    };

    const correctedURL = addHttpsIfMissing(url);

    if (correctedURL && isValidURL(correctedURL) && hasValidExtension(correctedURL)) {
        return correctedURL;
    }
    return url;
}

export default definePlugin({
    name: "CustomSounds",
    description: "Replace Discord sounds with a custom ones",
    authors: [Devs.ScattrdBlade],
    settings,
    patches: Object.keys(soundFileMapping).flatMap(settingKey =>
        soundFileMapping[settingKey].map(file => ({
            find: file,
            replacement: {
                match: /e\.exports\s*=\s*n\.p\s*\+\s*"[a-zA-Z0-9]+\.(mp3|wav|ogg|flac|aac|m4a)"/,
                replace: () => `e.exports="${getSoundURL(settingKey)}"`
            }
        }))
    )
});
