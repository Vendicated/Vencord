/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, UserStore, Toasts } from "@webpack/common";

const logger = new Logger("UwUSounds");

// ─────────────────────────────────────────────────────────────────────────────
//  Lazy module lookup – działa zanim webpack jest gotowy
// ─────────────────────────────────────────────────────────────────────────────

const SoundUtils = findByPropsLazy("playSound");
const VoiceStateStore = findByPropsLazy("getVoiceStateForUser", "getVoiceStates");

// ─────────────────────────────────────────────────────────────────────────────
//  Web Audio Engine
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx || audioCtx.state === "closed") audioCtx = new AC();
    return audioCtx;
}

async function resumeCtx(ctx: AudioContext) {
    if (ctx.state === "suspended") await ctx.resume();
}

// nuty (Hz)
const C4=261.6,E4=329.6,G4=392.0,A4=440.0;
const C5=523.3,D5=587.3,E5=659.3,F5=698.5,G5=784.0,A5=880.0,B5=987.8;
const C6=1046.5,E6=1318.5,G6=1568.0,B6=1975.5;

interface Note { f: number; d: number; v?: number; t?: OscillatorType; vib?: number; glide?: number; }

async function playNotes(notes: Note[], echo = 0.12) {
    if (!settings.store.enabled) return;
    const vol = settings.store.volume / 100;
    const ctx = getCtx();
    await resumeCtx(ctx);

    const master = ctx.createGain();
    master.gain.value = vol;
    master.connect(ctx.destination);

    // echo
    const dly = ctx.createDelay(0.12);
    const eg = ctx.createGain();
    dly.delayTime.value = 0.06;
    eg.gain.value = echo;
    dly.connect(eg);
    eg.connect(master);

    let t = ctx.currentTime + 0.01;
    for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const atk = 0.008;
        const rel = Math.min(n.d * 0.35, 0.08);
        const nv = (n.v ?? 0.5);

        osc.type = n.t ?? "sine";

        if (n.glide) {
            osc.frequency.setValueAtTime(n.glide, t);
            osc.frequency.exponentialRampToValueAtTime(n.f, t + n.d * 0.55);
        } else {
            osc.frequency.setValueAtTime(n.f, t);
        }

        if (n.vib) {
            const vLFO = ctx.createOscillator();
            const vG = ctx.createGain();
            vLFO.frequency.value = 5.8;
            vG.gain.value = n.vib;
            vLFO.connect(vG); vG.connect(osc.frequency);
            vLFO.start(t + n.d * 0.4);
            vLFO.stop(t + n.d + 0.01);
        }

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(nv, t + atk);
        gain.gain.setValueAtTime(nv, t + n.d - rel);
        gain.gain.linearRampToValueAtTime(0, t + n.d);

        osc.connect(gain);
        gain.connect(master);
        gain.connect(dly);
        osc.start(t);
        osc.stop(t + n.d + 0.01);

        t += n.d * 0.88;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dźwięki UwU – jeden na każde zdarzenie Discorda
// ─────────────────────────────────────────────────────────────────────────────

const S = {
    startup:       () => playNotes([{ f:C5,d:.11,v:.40 },{ f:E5,d:.11,v:.42 },{ f:G5,d:.11,v:.44 },{ f:C6,d:.22,v:.55,vib:C6*.012 },{ f:E6,d:.11,v:.45,t:"triangle" },{ f:G6,d:.38,v:.55,vib:G6*.014 }],.16),
    user_join:     () => playNotes([{ f:G4,d:.09,v:.32,t:"triangle" },{ f:C5,d:.09,v:.38,t:"triangle" },{ f:E5,d:.10,v:.44 },{ f:G5,d:.28,v:.52,vib:G5*.010 }],.13),
    user_leave:    () => playNotes([{ f:G5,d:.09,v:.44,t:"triangle" },{ f:E5,d:.09,v:.38 },{ f:C5,d:.10,v:.32 },{ f:G4,d:.30,v:.22 }],.10),
    user_moved:    () => playNotes([{ f:E5,d:.07,v:.32,glide:C5 },{ f:B5,d:.10,v:.40,glide:G5 },{ f:G5,d:.20,v:.35 }],.10),
    disconnect:    () => playNotes([{ f:C5,d:.10,v:.40 },{ f:A4,d:.10,v:.34 },{ f:F5,d:.10,v:.28 },{ f:C4,d:.35,v:.18,t:"triangle" }],.08),
    mute:          () => playNotes([{ f:G5,d:.05,v:.22,t:"sawtooth" },{ f:C5,d:.12,v:.15,t:"sawtooth" }],.05),
    unmute:        () => playNotes([{ f:C5,d:.05,v:.30,t:"triangle" },{ f:G5,d:.15,v:.42 }],.06),
    deafen:        () => playNotes([{ f:A4,d:.08,v:.30,t:"triangle" },{ f:E4,d:.22,v:.20,t:"triangle" }],.06),
    undeafen:      () => playNotes([{ f:E5,d:.06,v:.30 },{ f:C6,d:.20,v:.45,vib:C6*.010 }],.08),
    camera_on:     () => playNotes([{ f:C5,d:.04,v:.20,t:"square" },{ f:E6,d:.18,v:.40 }],.07),
    camera_off:    () => playNotes([{ f:E6,d:.04,v:.18,t:"square" },{ f:C4,d:.18,v:.22,t:"triangle" }],.05),
    ptt_start:     () => playNotes([{ f:G5,d:.06,v:.28 }],.04),
    ptt_stop:      () => playNotes([{ f:E5,d:.06,v:.22 }],.04),
    message:       () => playNotes([{ f:C6,d:.07,v:.36 },{ f:E6,d:.08,v:.42 },{ f:C6,d:.05,v:.30 },{ f:G6,d:.20,v:.48,vib:G6*.010 }],.09),
    mention:       () => playNotes([{ f:E6,d:.07,v:.38 },{ f:E6,d:.07,v:.40 },{ f:E6,d:.07,v:.42 },{ f:G6,d:.25,v:.52,vib:G6*.012 }],.10),
    stream_start:  () => playNotes([{ f:C5,d:.10,v:.36 },{ f:E5,d:.10,v:.40 },{ f:G5,d:.10,v:.44 },{ f:C6,d:.14,v:.50 },{ f:E6,d:.32,v:.55,vib:E6*.012 }],.14),
    stream_end:    () => playNotes([{ f:E6,d:.10,v:.44,t:"triangle" },{ f:C6,d:.10,v:.38 },{ f:G5,d:.10,v:.32 },{ f:E5,d:.10,v:.26 },{ f:C5,d:.30,v:.18 }],.09),
    sv_join:       () => playNotes([{ f:G5,d:.08,v:.32 },{ f:C6,d:.22,v:.45,vib:C6*.009 }],.09),
    sv_leave:      () => playNotes([{ f:C6,d:.08,v:.35 },{ f:G5,d:.22,v:.25,t:"triangle" }],.07),
    act_start:     () => playNotes([{ f:C5,d:.09,v:.34,t:"triangle" },{ f:G5,d:.09,v:.40,t:"triangle" },{ f:C6,d:.09,v:.46 },{ f:G6,d:.28,v:.54,vib:G6*.011 }],.12),
    act_end:       () => playNotes([{ f:G6,d:.09,v:.44 },{ f:C6,d:.09,v:.36 },{ f:G5,d:.09,v:.28,t:"triangle" },{ f:C5,d:.28,v:.18,t:"triangle" }],.09),
    act_join:      () => playNotes([{ f:E5,d:.07,v:.30 },{ f:G6,d:.20,v:.44,vib:G6*.009 }],.09),
    act_leave:     () => playNotes([{ f:G6,d:.07,v:.32 },{ f:E5,d:.20,v:.22,t:"triangle" }],.07),
    call_conn:     () => playNotes([{ f:A4,d:.10,v:.30 },{ f:A4,d:.10,v:.30 },{ f:E5,d:.25,v:.42,vib:E5*.010 }],.08),
    call_end:      () => playNotes([{ f:E6,d:.06,v:.25,t:"square" },{ f:G4,d:.12,v:.20,t:"triangle" },{ f:C4,d:.28,v:.14,t:"triangle" }],.06),
    speak_req:     () => playNotes([{ f:C6,d:.09,v:.38 },{ f:E6,d:.09,v:.44 },{ f:G6,d:.28,v:.52,vib:G6*.012 }],.11),
};

// ─────────────────────────────────────────────────────────────────────────────
//  Ringtone – zapętlona melodyjka
// ─────────────────────────────────────────────────────────────────────────────

const RING = [C5,E5,G5,E5,B5,G5,C6,G5];
let ringCtx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let ringing = false;

function ringCycle(ctx: AudioContext) {
    const v = (settings.store.volume / 100) * 0.65;
    let t = ctx.currentTime + 0.01;
    RING.forEach(f => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(v,t+.01);
        g.gain.setValueAtTime(v,t+.095);
        g.gain.linearRampToValueAtTime(0,t+.115);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t+.12);
        t+=.115;
    });
}

function startRing() {
    if (ringing) return;
    ringing = true;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ringCtx = new AC();
    ringCycle(ringCtx);
    ringTimer = setInterval(() => { if (ringCtx && ringing) ringCycle(ringCtx); }, 1350);
}

function stopRing() {
    if (!ringing) return;
    ringing = false;
    if (ringTimer) { clearInterval(ringTimer); ringTimer = null; }
    ringCtx?.close().catch(() => {});
    ringCtx = null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Mapowanie nazw Discord → UwU
// ─────────────────────────────────────────────────────────────────────────────

const RING_NAMES = new Set(["outgoing_ring","incoming_ring","call_ringing","dm_ringing"]);
const RING_STOP = new Set(["call_end","call_unavailable","user_join","disconnect"]);

const MAP: Record<string, () => void> = {
    user_join:                        S.user_join,
    user_leave:                       S.user_leave,
    user_moved:                       S.user_moved,
    disconnect:                       S.disconnect,
    deafen:                           S.deafen,
    undeafen:                         S.undeafen,
    mute:                             S.mute,
    unmute:                           S.unmute,
    camera_on:                        S.camera_on,
    camera_off:                       S.camera_off,
    ptt_start:                        S.ptt_start,
    ptt_stop:                         S.ptt_stop,
    stream_started:                   S.stream_start,
    stream_ended:                     S.stream_end,
    stream_start_failed:              S.stream_end,
    stream_user_joined:               S.sv_join,
    stream_user_left:                 S.sv_leave,
    embedded_activities_launch:       S.act_start,
    embedded_activities_end:          S.act_end,
    embedded_activities_user_join:    S.act_join,
    embedded_activities_user_leave:   S.act_leave,
    call_connecting:                  S.call_conn,
    call_end:                         S.call_end,
    call_unavailable:                 S.call_end,
    speak_requested:                  S.speak_req,
    stage_speaker_join:               S.user_join,
    stage_speaker_leave:              S.user_leave,
};

function handleDiscordSound(name: string) {
    Toasts.show({
        message: `SOUND: ${name}`,
        id: Toasts.genId(),
        type: Toasts.Type.SUCCESS
    });
    if (RING_NAMES.has(name)) { startRing(); return; }
    if (RING_STOP.has(name)) { stopRing(); }
    if (MAP[name]) {
        MAP[name]();
    } else if (name.includes("stream")) {
        // Fallback dla dowolnego dźwięku streamu (jak wchodzenie na streama kogoś)
        if (name.includes("end") || name.includes("stop") || name.includes("leave") || name.includes("left")) {
            S.sv_leave();
        } else {
            S.sv_join();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Patch Discord playSound
// ─────────────────────────────────────────────────────────────────────────────

let origPlaySound: ((...a: any[]) => any) | null = null;
let origCreateSound: ((...a: any[]) => any) | null = null;

function patchSounds() {
    try {
        if (typeof SoundUtils?.playSound === "function") {
            origPlaySound = SoundUtils.playSound;
            SoundUtils.playSound = function uwuSound(name: string, vol?: number) {
                if (!settings.store.enabled) {
                    return origPlaySound?.call(SoundUtils, name, vol);
                }
                logger.debug(`[UwUSounds] playSound intercepted: ${name}`);
                handleDiscordSound(name);
            };
            logger.info("[UwUSounds] ✅ playSound patch zastosowany!");
        } else {
            logger.warn("[UwUSounds] ⚠️ playSound nie znaleziony w SoundUtils!");
        }

        if (typeof SoundUtils?.createSound === "function") {
            origCreateSound = SoundUtils.createSound;
            SoundUtils.createSound = function uwuCreateSound(name: string, vol?: number) {
                if (!settings.store.enabled) {
                    return origCreateSound?.call(SoundUtils, name, vol);
                }
                logger.debug(`[UwUSounds] createSound intercepted: ${name}`);
                handleDiscordSound(name);
                // createSound normally returns an audio object with a play() and stop() method
                return {
                    play() {},
                    stop() {},
                    pause() {},
                    volume: vol ?? 1
                };
            };
            logger.info("[UwUSounds] ✅ createSound patch zastosowany!");
        }

    } catch (e) {
        logger.error("[UwUSounds] Błąd patchowania:", e);
    }
}

function unpatchSounds() {
    if (origPlaySound && SoundUtils?.playSound) {
        SoundUtils.playSound = origPlaySound;
        origPlaySound = null;
    }
    if (origCreateSound && SoundUtils?.createSound) {
        SoundUtils.createSound = origCreateSound;
        origCreateSound = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Nuke all Discord native sounds via HTMLAudioElement
// ─────────────────────────────────────────────────────────────────────────────

let origHTMLAudioPlay: (() => Promise<void>) | null = null;
let origHTMLAudioPause: (() => void) | null = null;

function patchHTMLAudio() {
    try {
        origHTMLAudioPlay = window.HTMLAudioElement.prototype.play;
        window.HTMLAudioElement.prototype.play = function (this: HTMLAudioElement) {
            if (settings.store.enabled && this.src) {
                if (this.src.includes(".mp3") || this.src.includes(".ogg") || this.src.includes(".wav")) {
                    logger.debug(`[UwUSounds] Blocked native audio: ${this.src} (loop: ${this.loop})`);
                    // Dzwonki (ringtone) są zapętlane - jeśli Discord próbuje puścić zapętlony dźwięk, odpalamy nasz!
                    if (this.loop) {
                        startRing();
                    }
                    return Promise.resolve();
                }
            }
            return origHTMLAudioPlay!.apply(this, arguments as any);
        };

        origHTMLAudioPause = window.HTMLAudioElement.prototype.pause;
        window.HTMLAudioElement.prototype.pause = function (this: HTMLAudioElement) {
            if (settings.store.enabled && this.src) {
                if (this.src.endsWith(".mp3") || this.src.endsWith(".ogg")) {
                    if (this.loop) {
                        stopRing();
                    }
                }
            }
            return origHTMLAudioPause!.apply(this, arguments as any);
        };
        logger.info("[UwUSounds] ✅ HTMLAudioElement patch zastosowany!");
    } catch (e) {
        logger.error("[UwUSounds] Błąd patchowania HTMLAudioElement:", e);
    }
}

function unpatchHTMLAudio() {
    if (origHTMLAudioPlay) {
        window.HTMLAudioElement.prototype.play = origHTMLAudioPlay;
        origHTMLAudioPlay = null;
    }
    if (origHTMLAudioPause) {
        window.HTMLAudioElement.prototype.pause = origHTMLAudioPause;
        origHTMLAudioPause = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Startup (CONNECTION_OPEN = ten sam trigger co Discord)
// ─────────────────────────────────────────────────────────────────────────────

let startupPlayed = false;

function handleConnectionOpen() {
    if (!settings.store.enabled || !settings.store.playstartup) return;
    if (startupPlayed) return;
    startupPlayed = true;
    setTimeout(() => S.startup(), 500);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Typing (Ty piszesz)
// ─────────────────────────────────────────────────────────────────────────────

let lastTypingAt = 0;

function handleTypingStart(data: any) {
    if (!settings.store.enabled || !settings.store.playtyping) return;
    const me = UserStore.getCurrentUser();
    if (!me || data?.userId !== me.id) return;
    const now = Date.now();
    if (now - lastTypingAt < 1200) return;
    lastTypingAt = now;
    S.ptt_start();
}

// ─────────────────────────────────────────────────────────────────────────────
//  MESSAGE_CREATE – ominęcie DND + dźwięk wysyłania
//  Discord blokuje playSound gdy status = Nie przeszkadzać
//  – te handlery działają NIEZALEŻNIE od statusu!
// ─────────────────────────────────────────────────────────────────────────────

let lastMsgSoundAt = 0;
let lastSendSoundAt = 0;

function handleMessageCreate(data: any) {
    if (!settings.store.enabled) return;

    const msg = data?.message ?? data;
    if (!msg?.author) return;

    const me = UserStore.getCurrentUser();
    if (!me) return;

    const isMe = msg.author.id === me.id;

    if (isMe) {
        // ─ Ty wysłałeś wiadomość ─
        if (!settings.store.playsend) return;
        const now = Date.now();
        if (now - lastSendSoundAt < 800) return;
        lastSendSoundAt = now;
        // dźwięczek "puff" – krótki miękki wysyłanie
        S.ptt_stop();
        return;
    }

    // ─ Ktoś pisał do Ciebie – DM lub wzmianka ─
    if (!settings.store.playmsgdnd) return;

    const isDM = !msg.guild_id;
    const mentionsMe = Array.isArray(msg.mentions) && msg.mentions.some((u: any) => u.id === me.id);
    if (!isDM && !mentionsMe) return;

    const now = Date.now();
    if (now - lastMsgSoundAt < 700) return;
    lastMsgSoundAt = now;

    // Wzmianka gra wyższy dźwięk niż zwykła DM
    if (mentionsMe && !isDM) {
        S.mention();
    } else {
        S.message();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Call cleanup
// ─────────────────────────────────────────────────────────────────────────────

let debugInterceptor: ((event: any) => void) | null = null;

function handleCallDelete() { stopRing(); }

function handleCallUpdate(d: any) {
    // Fallback gdyby dzwonek nie zniknął (ale HTMLAudio pause powinno to załatwić)
    if (d?.ringing === false || d?.channelId) stopRing();
}

function handleStreamWatch(data: any) {
    if (!settings.store.enabled) return;
    if (data.streamKey) {
        S.sv_join();
    } else {
        S.sv_leave();
    }
}

function handleStreamStop(data: any) {
    if (!settings.store.enabled) return;
    S.sv_leave();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ustawienia
// ─────────────────────────────────────────────────────────────────────────────

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Włącz UwU dźwięki",
        default: true,
        restartNeeded: false,
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Głośność (0–100)",
        default: 70,
        markers: [0, 25, 50, 75, 100],
        restartNeeded: false,
    },
    playstartup: {
        type: OptionType.BOOLEAN,
        description: "🌸 Dźwięk startowy (jak Discord się włącza)",
        default: true,
        restartNeeded: false,
    },
    playtyping: {
        type: OptionType.BOOLEAN,
        description: "⌨️ Cichy dźwięczek gdy piszesz (typing)",
        default: true,
        restartNeeded: false,
    },
    playsend: {
        type: OptionType.BOOLEAN,
        description: "📨 Dźwięk gdy WYSYŁASZ wiadomość",
        default: true,
        restartNeeded: false,
    },
    playmsgdnd: {
        type: OptionType.BOOLEAN,
        description: "🔕 Dźwięk przy nowej DM / wzmiance nawet na statusie Nie przeszkadzać",
        default: true,
        restartNeeded: false,
    },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Plugin
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  Video Stream Detection (DOM Polling)
// ─────────────────────────────────────────────────────────────────────────────

let activeStreams = 0;
let streamPoller: ReturnType<typeof setInterval> | null = null;

function startVideoPoller() {
    if (streamPoller) return;
    streamPoller = setInterval(() => {
        if (!settings.store.enabled) return;
        
        const videos = document.querySelectorAll("video");
        let count = 0;
        videos.forEach(v => {
            if (v.srcObject instanceof MediaStream) {
                count++;
            }
        });

        if (count > activeStreams) {
            for (let i = 0; i < count - activeStreams; i++) S.sv_join();
            activeStreams = count;
        } else if (count < activeStreams) {
            for (let i = 0; i < activeStreams - count; i++) S.sv_leave();
            activeStreams = count;
        }
    }, 500);
}

function stopVideoPoller() {
    if (streamPoller) {
        clearInterval(streamPoller);
        streamPoller = null;
    }
    activeStreams = 0;
}

export default definePlugin({
    name: "UwUSounds",
    description: "Zastępuje wszystkie dźwięki Discorda słodkimi UwU melodyjkami 🐱 (Web Audio API)",
    authors: [{ id: 0n, name: "Ulux" }],
    settings,

    // Wstrzykujemy nasz kod bezpośrednio do wewnętrznej klasy AudioPlayer Discorda,
    // ponieważ Discord omija SoundUtils.playSound.
    patches: [
        {
            find: "could not play audio:",
            replacement: [
                {
                    match: /(\i\.src=)(\i\(\d+\))\(`\.\/\$\{this\.name\}\.mp3`\)/,
                    replace: "$1$self.onDiscordSound(this.name, $2)"
                }
            ]
        }
    ],

    onDiscordSound(name: string, req: any) {
        if (settings.store.enabled && typeof name === "string") {
            // Używamy setTimeout żeby zapobiec problemom z kontekstem
            setTimeout(() => {
                logger.debug(`[UwUSounds] Webpack AudioPlayer intercepted: ${name}`);
                handleDiscordSound(name);
            }, 0);
        }
        return req(`./${name}.mp3`);
    },

    start() {
        startupPlayed = false;
        lastTypingAt = 0;
        lastMsgSoundAt = 0;
        lastSendSoundAt = 0;

        // (Usunięto inicjalizację VC, ponieważ polegamy na natywnych dźwiękach Discorda)

        patchSounds();
        patchHTMLAudio();
        startVideoPoller();

        FluxDispatcher.subscribe("CONNECTION_OPEN", handleConnectionOpen);
        FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageCreate);
        FluxDispatcher.subscribe("TYPING_START", handleTypingStart);
        FluxDispatcher.subscribe("CALL_DELETE", handleCallDelete);
        FluxDispatcher.subscribe("CALL_UPDATE", handleCallUpdate);
    },

    stop() {
        unpatchSounds();
        unpatchHTMLAudio();
        stopRing();
        audioCtx?.close().catch(() => {});
        audioCtx = null;
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", handleConnectionOpen);
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageCreate);
        FluxDispatcher.unsubscribe("TYPING_START", handleTypingStart);
        FluxDispatcher.unsubscribe("CALL_DELETE", handleCallDelete);
        FluxDispatcher.unsubscribe("CALL_UPDATE", handleCallUpdate);
        stopVideoPoller();
    },
});
