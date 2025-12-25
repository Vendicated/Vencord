/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Activity } from "@vencord/discord-types";
import { ActivityType } from "@vencord/discord-types/enums";
import { ApplicationAssetUtils, FluxDispatcher } from "@webpack/common";

import { BanchoStatusEnum, GameState, Modes, TosuApi, UserLoginStatus } from "./type";

const socketId = "tosu";
const OSU_APP_ID = "367827983903490050";
const OSU_LARGE_IMAGE = "373344233077211136";
const OSU_STARDARD_SMALL_IMAGE = "373370493127884800";
const OSU_MANIA_SMALL_IMAGE = "373370588703621136";
const OSU_TAIKO_SMALL_IMAGE = "373370519891738624";
const OSU_CATCH_SMALL_IMAGE = "373370543161999361";

const throttledOnMessage = throttle(onMessage, 3000, () => FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null, socketId: "tosu" }));

let ws: WebSocket;
let wsReconnect: NodeJS.Timeout;
let shouldReconnect = false;

export default definePlugin({
    name: "TosuRPC",
    description: "osu! RPC with data from tosu",
    authors: [Devs.AutumnVN],
    start() {
        shouldReconnect = true;
        (function connect() {
            ws = new WebSocket("ws://127.0.0.1:24050/websocket/v2");
            ws.addEventListener("error", () => ws.close());
            ws.addEventListener("close", () => {
                if (!shouldReconnect) return;
                wsReconnect = setTimeout(connect, 5000);
            });
            ws.addEventListener("message", ({ data }) => throttledOnMessage(data));
        })();
    },
    stop() {
        shouldReconnect = false;
        if (wsReconnect) clearTimeout(wsReconnect);
        if (ws) ws.close();
        FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null, socketId: "tosu" });
    }
});

async function onMessage(data: string) {
    const json: TosuApi = JSON.parse(data);
    // @ts-ignore
    if (json.error) return FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null, socketId: "tosu" });

    const { state, session, profile, beatmap, play, resultsScreen } = json;

    const activity: Activity = {
        application_id: OSU_APP_ID,
        name: "osu!",
        type: ActivityType.PLAYING,
        assets: {
            large_image: OSU_LARGE_IMAGE,
            large_text: profile.userStatus.number === UserLoginStatus.Connected ? `${profile.name} | #${profile.globalRank} | ${Math.round(profile.pp)}pp` : undefined,
        },
        timestamps: {
            start: Date.now() - session.playTime
        },
        flags: 1 << 0,
    };

    activity.assets = {};

    switch (profile.mode.number) {
        case Modes.Osu:
            activity.assets.small_image = OSU_STARDARD_SMALL_IMAGE;
            activity.assets.small_text = "osu!";
            break;
        case Modes.Mania:
            activity.assets.small_image = OSU_MANIA_SMALL_IMAGE;
            activity.assets.small_text = "osu!mania";
            break;
        case Modes.Taiko:
            activity.assets.small_image = OSU_TAIKO_SMALL_IMAGE;
            activity.assets.small_text = "osu!taiko";
            break;
        case Modes.Fruits:
            activity.assets.small_image = OSU_CATCH_SMALL_IMAGE;
            activity.assets.small_text = "osu!catch";
            break;
    }

    let player = "";
    let mods = "";
    let fc = "";
    let combo = "";
    let h100 = "";
    let h50 = "";
    let h0 = "";
    let sb = "";
    let pp = "";
    switch (state.number) {
        case GameState.Play:
            activity.type = profile.banchoStatus.number === BanchoStatusEnum.Playing ? ActivityType.PLAYING : ActivityType.WATCHING;

            player = profile.banchoStatus.number === BanchoStatusEnum.Playing ? "" : `${play.playerName} | `;
            mods = play.mods.name ? `+${play.mods.name} ` : "";
            activity.name = `${player}${beatmap.artist} - ${beatmap.title} [${beatmap.version}] ${mods}(${beatmap.mapper}, ${beatmap.stats.stars.total.toFixed(2)}*)`;

            combo = play.hits[0] === 0 && play.hits.sliderBreaks === 0
                ? `${play.combo.current}x`
                : `${play.combo.current}x/${play.combo.max}x`;
            pp = play.hits[0] === 0 && play.hits.sliderBreaks === 0
                ? `${Math.round(play.pp.current)}pp`
                : `${Math.round(play.pp.current)}pp/${Math.round(play.pp.fc)}pp`;
            activity.details = `${play.accuracy.toFixed(2)}% | ${combo} | ${pp}`;

            h100 = play.hits[100] > 0 ? `${play.hits[100]}x100` : "";
            h50 = play.hits[50] > 0 ? `${play.hits[50]}x50` : "";
            h0 = play.hits[0] > 0 ? `${play.hits[0]}xMiss` : "";
            sb = play.hits.sliderBreaks > 0 ? `${play.hits.sliderBreaks}xSB` : "";
            activity.state = [h100, h50, h0, sb].filter(Boolean).join(" | ");

            const playRank = await getAsset(`https://raw.githubusercontent.com/AutumnVN/gosu-rich-presence/main/grade/${play.rank.current.toLowerCase().replace("x", "ss")}.png`);
            activity.assets.small_image = playRank;
            activity.assets.small_text = undefined;
            break;
        case GameState.ResultScreen:
            activity.type = ActivityType.WATCHING;

            mods = resultsScreen.mods.name ? `+${resultsScreen.mods.name} ` : "";
            activity.name = `${resultsScreen.playerName} | ${beatmap.artist} - ${beatmap.title} [${beatmap.version}] ${mods}(${beatmap.mapper}, ${beatmap.stats.stars.total.toFixed(2)}*)`;

            fc = resultsScreen.maxCombo === beatmap.stats.maxCombo ? "FC" : `| ${resultsScreen.maxCombo}x/${beatmap.stats.maxCombo}x`;
            pp = !resultsScreen.pp.current ? ""
                : Math.round(resultsScreen.pp.current) === Math.round(resultsScreen.pp.fc)
                    ? `| ${Math.round(resultsScreen.pp.current)}pp`
                    : `| ${Math.round(resultsScreen.pp.current)}pp/${Math.round(resultsScreen.pp.fc)}pp`;
            activity.details = `${resultsScreen.accuracy.toFixed(2)}% ${fc} ${pp}`;

            h100 = resultsScreen.hits[100] > 0 ? `${resultsScreen.hits[100]}x100` : "";
            h50 = resultsScreen.hits[50] > 0 ? `${resultsScreen.hits[50]}x50` : "";
            h0 = resultsScreen.hits[0] > 0 ? `${resultsScreen.hits[0]}xMiss` : "";
            sb = play.hits.sliderBreaks > 0 ? `${play.hits.sliderBreaks}xSB` : "";
            activity.state = [h100, h50, h0].filter(Boolean).join(" | ");

            const resultRank = await getAsset(`https://raw.githubusercontent.com/AutumnVN/gosu-rich-presence/main/grade/${resultsScreen.rank.toLowerCase().replace("x", "ss")}.png`);
            activity.assets.small_image = resultRank;
            activity.assets.small_text = undefined;
            break;
        default:
            activity.type = ActivityType.LISTENING;
            mods = play.mods.name ? `+${play.mods.name} ` : "";
            activity.name = `${beatmap.artist} - ${beatmap.title} [${beatmap.version}] ${mods}(${beatmap.mapper}, ${beatmap.stats.stars.total.toFixed(2)}*)`;

            switch (state.number) {
                case GameState.Menu: activity.details = "Main Menu"; break;
                case GameState.Edit: activity.details = "Edit"; break;
                case GameState.SelectEdit: activity.details = "Song Select (Edit)"; break;
                case GameState.SelectPlay: activity.details = "Song Select (Play)"; break;
                case GameState.SelectDrawings: activity.details = "Select Drawings"; break;
                case GameState.Update: activity.details = "Update"; break;
                case GameState.Busy: activity.details = "Busy"; break;
                case GameState.Lobby: activity.details = "Lobby"; break;
                case GameState.MatchSetup: activity.details = "Match Setup"; break;
                case GameState.SelectMulti: activity.details = "Select Multi"; break;
                case GameState.RankingVs: activity.details = "Ranking Vs"; break;
                case GameState.OnlineSelection: activity.details = "Online Selection"; break;
                case GameState.OptionsOffsetWizard: activity.details = "Options Offset Wizard"; break;
                case GameState.RankingTagCoop: activity.details = "Ranking Tag Coop"; break;
                case GameState.RankingTeam: activity.details = "Ranking Team"; break;
                case GameState.BeatmapImport: activity.details = "Beatmap Import"; break;
                case GameState.PackageUpdater: activity.details = "Package Updater"; break;
                case GameState.Benchmark: activity.details = "Benchmark"; break;
                case GameState.Tourney: activity.details = "Tourney"; break;
                case GameState.Charts: activity.details = "Charts"; break;
            }

            switch (profile.banchoStatus.number) {
                case BanchoStatusEnum.Idle: activity.state = "Idle"; break;
                case BanchoStatusEnum.Afk: activity.state = "AFK"; break;
                case BanchoStatusEnum.Playing: activity.state = "Playing"; break;
                case BanchoStatusEnum.Editing: activity.state = "Editing"; break;
                case BanchoStatusEnum.Modding: activity.state = "Modding"; break;
                case BanchoStatusEnum.Multiplayer: activity.state = "Multiplayer"; break;
                case BanchoStatusEnum.Watching: activity.state = "Watching"; break;
                case BanchoStatusEnum.Testing: activity.state = "Testing"; break;
                case BanchoStatusEnum.Submitting: activity.state = "Submitting"; break;
                case BanchoStatusEnum.Paused: activity.state = "Paused"; break;
                case BanchoStatusEnum.Lobby: activity.state = "Lobby"; break;
                case BanchoStatusEnum.Multiplaying: activity.state = "Multiplaying"; break;
                case BanchoStatusEnum.OsuDirect: activity.state = "osu!direct"; break;
            }

            break;
    }

    if (beatmap.set > 0) {
        const mapBg = await getAsset(`https://assets.ppy.sh/beatmaps/${beatmap.set}/covers/list@2x.jpg`);
        const res = await fetch(mapBg.replace(/^mp:/, "https://media.discordapp.net/"), { method: "HEAD" });
        if (res.ok) activity.assets.large_image = mapBg;
    }

    FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: "tosu" });
}

function throttle<T extends Function>(func: T, limit: number, timedOutCallback?: () => void): T {
    let inThrottle: boolean;
    let callbackTimeout: NodeJS.Timeout;
    return function (this: any, ...args: any[]) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
            if (timedOutCallback) {
                clearTimeout(callbackTimeout);
                callbackTimeout = setTimeout(timedOutCallback, limit * 2);
            }
        }
    } as any;
}

async function getAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds(OSU_APP_ID, [key]))[0];
}
