/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, UserStore, Toasts, ChannelStore } from "@webpack/common";

const logger = new Logger("UwUSounds");

const originalPlay = HTMLAudioElement.prototype.play;
let audioInterceptorActive = false;

function setupAudioInterceptor() {
    if (audioInterceptorActive) return;
    audioInterceptorActive = true;
    HTMLAudioElement.prototype.play = function() {
        if (!settings.store.Enabled) return originalPlay.call(this);

        // Wyłapujemy natywne dźwięki Discorda i mutujemy je
        if (this.src && (this.src.includes("/assets/") || this.src.includes(".mp3") || this.src.includes(".wav") || this.src.includes(".ogg"))) {
            this.volume = 0;
            this.muted = true;
            
            // Zagraj uniwersalny dźwięk UwU w zamian (zabezpieczone flagą startową)
            if (typeof isStartingUp !== "undefined" && !isStartingUp) {
                playUwU("generic", true);
            }
            
            return Promise.resolve();
        }
        return originalPlay.call(this);
    };
}

function restoreAudioInterceptor() {
    if (!audioInterceptorActive) return;
    HTMLAudioElement.prototype.play = originalPlay;
    audioInterceptorActive = false;
}

let sharedAudioCtx: AudioContext | null = null;
function getAudioContext() {
    if (!sharedAudioCtx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        sharedAudioCtx = new AudioContext();
    }
    if (sharedAudioCtx.state === "suspended") {
        sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
}

let lastSpecificSoundTime = 0;

function playUwU(category: string, isGeneric = false) {
    if (!settings.store.Enabled) return;

    const timeNow = Date.now();
    if (isGeneric) {
        // Jeśli w ciągu ostatnich 200ms zagrał jakiś dedykowany dźwięk (np. message), 
        // nie odtwarzaj dźwięku generic, by zapobiec nałożeniu się na siebie!
        if (timeNow - lastSpecificSoundTime < 200) return;
    } else {
        lastSpecificSoundTime = timeNow;
    }

    if (settings.store.AdminConsole && !isGeneric) {
        logger.info(`[Admin Console] Odtwarzanie dźwięku z kategorii: ${category}`);
        console.log(`%c[UwUSounds Admin]%c Żądanie dźwięku: ${category}`, "color: #ffb6c1; font-weight: bold;", "color: inherit;");
    }

    let vol = settings.store.Volume / 100;
    
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        let pitchMod = 1.0;
        if (settings.store.RandomPitch) {
            if (category === "typing") {
                pitchMod = 0.85 + (Math.random() * 0.3);
            }
            // Całkowicie wyłączony pitch randomizer dla melodii, by były w 100% czyste
        }

        const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, volMultiplier = 1) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq * pitchMod, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(vol * volMultiplier, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        if (category === "startup") {
            // Dźwięk ładowania w stylu Discordoo (wesoły, z szybkim wejściem)
            playTone(523.25, "sine", now, 0.15, 0.5);
            playTone(659.25, "sine", now + 0.15, 0.15, 0.5);
            playTone(783.99, "sine", now + 0.30, 0.2, 0.6);
            playTone(1046.50, "sine", now + 0.50, 0.4, 0.8);
        } else if (category === "message") {
            playTone(880, "sine", now, 0.2, 0.8);
            playTone(1108.73, "sine", now + 0.1, 0.2, 0.8);
        } else if (category === "send") {
            playTone(600, "sine", now, 0.1, 0.5);
            playTone(800, "sine", now + 0.08, 0.15, 0.5);
        } else if (category === "mute" || category === "toggle_off") {
            // Zbliżające się wyciszenie, wyłączenie kamery/ekranu
            playTone(800, "sine", now, 0.1, 0.6);
            playTone(600, "sine", now + 0.1, 0.2, 0.6);
        } else if (category === "unmute" || category === "toggle_on") {
            // Odmutowanie, udostępnienie ekranu
            playTone(600, "sine", now, 0.1, 0.6);
            playTone(800, "sine", now + 0.1, 0.2, 0.6);
        } else if (category === "call") {
            // Dzwonienie
            playTone(400, "triangle", now, 0.5, 0.6);
            playTone(800, "triangle", now + 0.5, 0.5, 0.6);
        } else if (category === "join") {
            playTone(523.25, "sine", now, 0.3);
            playTone(1046.50, "sine", now + 0.3, 0.6);
        } else if (category === "leave") {
            playTone(1046.50, "sine", now, 0.3);
            playTone(523.25, "sine", now + 0.3, 0.6);
        } else if (category === "pingword") {
            playTone(1200, "sine", now, 0.1, 1.0);
            playTone(1400, "sine", now + 0.1, 0.3, 1.0);
        } else if (category === "generic") {
            // Uniwersalny, słodki i cichy blip na KAŻDY inny dźwięk Discorda
            playTone(900, "sine", now, 0.1, 0.4);
            playTone(1200, "sine", now + 0.1, 0.15, 0.4);
        } else if (category === "typing") {
            // Typing has its own heavy randomization inside
            playTone((400 + Math.random() * 50) * pitchMod, "triangle", now, 0.05, 0.2);
        }
    } catch (e) {
        logger.error("Audio synth failed", e);
    }
}

// Interceptor na klawiaturę do dźwięku pisania
function handleKeyDown(e: KeyboardEvent) {
    if (settings.store.Playtyping && e.key.length === 1) { // tylko znaki
        playUwU("typing");
    }
}

function handleMessageCreate(event: any) {
    if (isStartingUp || !settings.store.Enabled) return;
    const message = event.message;
    if (!message) return;
    
    const currentUser = UserStore?.getCurrentUser();
    
    // ZABEZPIECZENIE PRZED CRASHEM (Wiadomości systemowe nie mają autora!)
    if (!currentUser || !message.author) return;
    
    if (message.author.id === currentUser.id) {
        if (settings.store.Playsend) {
            playUwU("send");
        }
    } else {
        // Ping words detection
        if (settings.store.PingWords && settings.store.PingWords.trim() !== "") {
            const words = settings.store.PingWords.split(",").map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
            const content = (message.content || "").toLowerCase();
            const hasPingWord = words.some(w => content.includes(w));
            if (hasPingWord) {
                if (settings.store.AdminConsole) logger.info(`[Admin Console] Znaleziono Słowo Kluczowe (Ping Word)!`);
                playUwU("pingword");
                return;
            }
        }

        // Filtrujemy, żeby dźwięk powiadomienia grał TYLKO przy DM lub Mentions, 
        // a nie przy każdej wiadomości na serwerze!
        const channel = ChannelStore?.getChannel(message.channel_id);
        const isDM = channel?.isPrivate();
        const isMentioned = message.mentions?.some((m: any) => m.id === currentUser.id);

        if ((isDM || isMentioned) && settings.store.Playmsgdnd) {
            // Zawsze natychmiast graj dla Prywatnych Wiadomości i Wzmianek
            playUwU("message");
        } else if (settings.store.Playmsgdnd) {
            // Wiadomości serwerowe - "w umiarze" (maksymalnie raz na 60 sekund)
            const timeNow = Date.now();
            if (timeNow - lastServerMessageSoundTime >= 60000) {
                lastServerMessageSoundTime = timeNow;
                playUwU("message");
                if (settings.store.AdminConsole) logger.info(`[Admin Console] Odtworzono powiadomienie serwerowe (kolejne za min. 60s)`);
            }
        }
    }
}

let isMutedState = false;
let isStartingUp = true; // Flaga zapobiegająca spamowi przy starcie

function handleMuteToggle() {
    if (isStartingUp || !settings.store.MuteSync) return;
    isMutedState = !isMutedState;
    if (settings.store.AdminConsole) logger.info(`[Admin Console] Wykryto użycie MuteSync`);
    if (isMutedState) playUwU("toggle_off");
    else playUwU("toggle_on");
}

let isDeafenedState = false;
function handleDeafenToggle() {
    if (isStartingUp || !settings.store.MuteSync) return;
    isDeafenedState = !isDeafenedState;
    if (isDeafenedState) playUwU("toggle_off");
    else playUwU("toggle_on");
}

function handleStreamToggle(event: any) {
    if (isStartingUp) return;
    if (event.type === "STREAM_START" || event.type === "MEDIA_ENGINE_SET_GO_LIVE_SOURCE") {
        playUwU("toggle_on");
    } else {
        playUwU("toggle_off");
    }
}

function handleCallCreate() {
    if (isStartingUp) return;
    playUwU("call");
}

function handleVoiceState(event: any) {
    if (isStartingUp || !settings.store.Enabled) return;
    const currentUser = UserStore?.getCurrentUser();
    if (!currentUser) return;
    
    // ZABEZPIECZENIE PRZED CRASHEM (Brak tablicy states)
    if (!event || !event.voiceStates || !Array.isArray(event.voiceStates)) return;
    
    try {
        const update = event.voiceStates.find((vs: any) => vs.userId === currentUser.id);
        if (update) {
            if (update.channelId) {
                playUwU("join");
            } else {
                playUwU("leave");
            }
        }
    } catch(e) {}
}

let exportWatcherInterval: any = null;

export const settings = definePluginSettings({
    Enabled: {
        description: "Włącz UwU dźwięki",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    Volume: {
        description: "Głośność (0-100)",
        type: OptionType.SLIDER,
        default: 75,
        markers: [0, 25, 50, 75, 100],
        stickToMarkers: false,
        restartNeeded: false
    },
    Playstartup: {
        description: "🌸 Dźwięk startowy (jak Discord się włącza)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    Playtyping: {
        description: "⌨️ Cichy dźwięczek gdy piszesz (typing)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    Playsend: {
        description: "✉️ Dźwięk gdy WYSYŁASZ wiadomość",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    Playmsgdnd: {
        description: "🔔 Dźwięk przy nowej DM / wzmiance nawet na statusie Nie przeszkadzać",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    RandomPitch: {
        description: "🎵 Randomizacja Pitch (Naturalniejsze, zróżnicowane brzmienie dźwięków)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    MuteSync: {
        description: "🎙️ Mute/Deafen Sync (Zagraj dźwięk gdy się wyciszysz)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    PingWords: {
        description: "🔍 Słowa Kluczowe (Ping Words) (po przecinku, np: admin,pomoc,uwu)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false
    },
    AdminConsole: {
        description: "💻 Dostęp do Konsoli Wtyczki (Admin Console)",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    ExportConfig: {
        description: "📥 EKSPORTUJ KONFIGURACJĘ (Zaznacz aby skopiować ustawienia!)",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    }
});

export default definePlugin({
    name: "UwUSounds",
    description: "Zastępuje wszystkie dźwięki Discorda słodkimi UwU melodyjkami 🐹 (Web Audio API) + Super Funkcje Admina",
    authors: [],
    settings,
    patches: [], 

    start() {
        logger.info("Starting UwUSounds on old system with new Admin features...");
        
        isStartingUp = true;
        setupAudioInterceptor();

        if (settings.store.Playstartup) {
            setTimeout(() => playUwU("startup"), 1500);
        }

        // Odblokowujemy dźwięki systemowe po 4 sekundach od uruchomienia, 
        // aby Discord zdążył pobrać wiadomości z cache bez spamu dźwięków
        setTimeout(() => {
            isStartingUp = false;
        }, 4000);

        document.addEventListener("keydown", handleKeyDown);
        FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageCreate);
        FluxDispatcher.subscribe("AUDIO_TOGGLE_LOCAL_MUTE", handleMuteToggle);
        FluxDispatcher.subscribe("AUDIO_TOGGLE_LOCAL_DEAF", handleDeafenToggle);
        FluxDispatcher.subscribe("MEDIA_ENGINE_SET_GO_LIVE_SOURCE", handleStreamToggle);
        FluxDispatcher.subscribe("STREAM_STOP", handleStreamToggle);
        FluxDispatcher.subscribe("CALL_CREATE", handleCallCreate);
        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", handleVoiceState);

        // Hack for Export Config since Vencord settings don't have OptionType.BUTTON easily available
        exportWatcherInterval = setInterval(() => {
            if (settings.store.ExportConfig) {
                try {
                    const exportStr = btoa(JSON.stringify(settings.store));
                    DiscordNative.clipboard.copy(`UwU_Config::${exportStr}`);
                    Toasts?.show({ message: "Konfiguracja skopiowana do schowka!", type: Toasts.Type.SUCCESS, id: Toasts.genId() });
                    if (settings.store.AdminConsole) logger.info(`[Admin Console] Konfiguracja wyeksportowana pomyślnie.`);
                } catch(e) { }
                settings.store.ExportConfig = false; // untoggle automatically
            }
        }, 500);
    },

    stop() {
        document.removeEventListener("keydown", handleKeyDown);
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageCreate);
        FluxDispatcher.unsubscribe("AUDIO_TOGGLE_LOCAL_MUTE", handleMuteToggle);
        FluxDispatcher.unsubscribe("AUDIO_TOGGLE_LOCAL_DEAF", handleDeafenToggle);
        FluxDispatcher.unsubscribe("MEDIA_ENGINE_SET_GO_LIVE_SOURCE", handleStreamToggle);
        FluxDispatcher.unsubscribe("STREAM_STOP", handleStreamToggle);
        FluxDispatcher.unsubscribe("CALL_CREATE", handleCallCreate);
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", handleVoiceState);
        if (exportWatcherInterval) clearInterval(exportWatcherInterval);
        restoreAudioInterceptor();
    }
});
