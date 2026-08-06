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

        try {
            // Wyłapujemy natywne dźwięki Discorda i mutujemy je
            const srcStr = typeof this.src === "string" ? this.src : "";
            if (srcStr && (srcStr.includes("/assets/") || srcStr.includes(".mp3") || srcStr.includes(".wav") || srcStr.includes(".ogg"))) {
                this.volume = 0;
                this.muted = true;
                
                // Zagraj uniwersalny dźwięk UwU w zamian (zabezpieczone flagą startową)
                if (typeof isStartingUp !== "undefined" && !isStartingUp) {
                    playUwU("generic", true);
                }
                
                return Promise.resolve();
            }
        } catch(e) {
            logger.error("Audio Interceptor Error:", e);
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
            // Powiadomienie (klasyczny czysty dźwięk SINE)
            playTone(880, "sine", now, 0.2, 0.8);
            playTone(1108.73, "sine", now + 0.1, 0.2, 0.8);
        } else if (category === "send") {
            playTone(600, "sine", now, 0.1, 0.5);
            playTone(800, "sine", now + 0.08, 0.15, 0.5);
        } else if (category === "mute") {
            playTone(300, "square", now, 0.05, 0.3);
            playTone(200, "square", now + 0.05, 0.05, 0.3);
        } else if (category === "unmute") {
            playTone(200, "square", now, 0.05, 0.3);
            playTone(300, "square", now + 0.05, 0.05, 0.3);
        } else if (category === "deafen") {
            playTone(200, "sawtooth", now, 0.04, 0.2);
            playTone(150, "sawtooth", now + 0.04, 0.04, 0.2);
            playTone(100, "sawtooth", now + 0.08, 0.06, 0.2);
        } else if (category === "undeafen") {
            playTone(100, "sawtooth", now, 0.04, 0.2);
            playTone(150, "sawtooth", now + 0.04, 0.04, 0.2);
            playTone(200, "sawtooth", now + 0.08, 0.06, 0.2);
        } else if (category === "stream_start") {
            // Rozpoczęcie streama (technologiczne arpeggio SINE)
            playTone(400, "sine", now, 0.1, 0.4);
            playTone(600, "sine", now + 0.1, 0.1, 0.4);
            playTone(800, "sine", now + 0.2, 0.2, 0.4);
        } else if (category === "stream_stop") {
            // Zakończenie streama (technologiczne arpeggio SINE w dół)
            playTone(800, "sine", now, 0.1, 0.4);
            playTone(600, "sine", now + 0.1, 0.1, 0.4);
            playTone(400, "sine", now + 0.2, 0.2, 0.4);
        } else if (category === "activity") {
            // Aktywność aplikacyjna (gra, rich presence) - energiczny blip trójkątny
            playTone(500, "triangle", now, 0.1, 0.4);
            playTone(750, "triangle", now + 0.1, 0.2, 0.4);
        } else if (category === "call") {
            playTone(300, "triangle", now, 0.5, 0.5);
            playTone(350, "triangle", now + 0.5, 0.5, 0.5);
        } else if (category === "join") {
            playTone(300, "square", now, 0.05, 0.3);
            playTone(400, "square", now + 0.05, 0.05, 0.3);
            playTone(500, "square", now + 0.10, 0.05, 0.3);
            playTone(600, "square", now + 0.15, 0.10, 0.3);
        } else if (category === "leave") {
            playTone(600, "square", now, 0.05, 0.3);
            playTone(500, "square", now + 0.05, 0.05, 0.3);
            playTone(400, "square", now + 0.10, 0.05, 0.3);
            playTone(300, "square", now + 0.15, 0.10, 0.3);
        } else if (category === "pingword") {
            playTone(1200, "sine", now, 0.1, 1.0);
            playTone(1400, "sine", now + 0.1, 0.3, 1.0);
        } else if (category === "generic") {
            playTone(800, "sawtooth", now, 0.02, 0.1);
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
    try {
        if (settings.store.Playtyping && e && e.key && e.key.length === 1) { // tylko znaki
            playUwU("typing");
        }
    } catch(err) {}
}

function handleMessageCreate(event: any) {
    try {
        if (isStartingUp || !settings.store.Enabled) return;
        const message = event?.message;
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
            // ALBO gdy wiadomość jest wysłana na tekstowym kanale wewnątrz kanału głosowego (text-in-voice)
            const channel = ChannelStore?.getChannel(message.channel_id);
            const isDM = channel?.isPrivate();
            const isMentioned = message.mentions?.some((m: any) => m.id === currentUser.id);
            const isTextInVoice = channel?.type === 2 || channel?.isGuildVoice?.();

            if ((isDM || isMentioned || isTextInVoice) && settings.store.Playmsgdnd) {
                // Zawsze natychmiast graj dla Prywatnych Wiadomości, Wzmianek i Kanałów Głosowych
                playUwU("message");
            } else if (settings.store.Playmsgdnd) {
                // Pozostałe wiadomości serwerowe - "w umiarze" (maksymalnie raz na 60 sekund)
                const timeNow = Date.now();
                if (timeNow - lastServerMessageSoundTime >= 60000) {
                    lastServerMessageSoundTime = timeNow;
                    playUwU("message");
                    if (settings.store.AdminConsole) logger.info(`[Admin Console] Odtworzono powiadomienie serwerowe (kolejne za min. 60s)`);
                }
            }
        }
    } catch(err) {
        logger.error("Message handling failed", err);
    }
}

let isMutedState = false;
let isStartingUp = true; // Flaga zapobiegająca spamowi przy starcie

function handleMuteToggle() {
    try {
        if (isStartingUp || !settings.store.MuteSync) return;
        isMutedState = !isMutedState;
        if (settings.store.AdminConsole) logger.info(`[Admin Console] Wykryto użycie MuteSync`);
        if (isMutedState) playUwU("mute");
        else playUwU("unmute");
    } catch(e) {}
}

let isDeafenedState = false;
function handleDeafenToggle() {
    try {
        if (isStartingUp || !settings.store.MuteSync) return;
        isDeafenedState = !isDeafenedState;
        if (isDeafenedState) playUwU("deafen");
        else playUwU("undeafen");
    } catch(e) {}
}

function handleStreamCreate(event: any) {
    try {
        if (isStartingUp) return;
        const currentUser = UserStore?.getCurrentUser();
        if (event?.streamKey && currentUser?.id && !event.streamKey.endsWith(currentUser.id)) return;
        playUwU("stream_start");
    } catch(e) {}
}

function handleStreamDelete(event: any) {
    try {
        if (isStartingUp) return;
        const currentUser = UserStore?.getCurrentUser();
        if (event?.streamKey && currentUser?.id && !event.streamKey.endsWith(currentUser.id)) return;
        playUwU("stream_stop");
    } catch(e) {}
}

function handleActivityUpdate(event: any) {
    try {
        if (isStartingUp) return;
        playUwU("activity");
    } catch(e) {}
}

function handleCallCreate() {
    try {
        if (isStartingUp) return;
        playUwU("call");
    } catch(e) {}
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
    authors: [{ id: 1302034381648695357n, name: "Ulux" }],
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
        FluxDispatcher.subscribe("STREAM_CREATE", handleStreamCreate);
        FluxDispatcher.subscribe("STREAM_DELETE", handleStreamDelete);
        FluxDispatcher.subscribe("LOCAL_ACTIVITY_UPDATE", handleActivityUpdate);
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
        FluxDispatcher.unsubscribe("STREAM_CREATE", handleStreamCreate);
        FluxDispatcher.unsubscribe("STREAM_DELETE", handleStreamDelete);
        FluxDispatcher.unsubscribe("LOCAL_ACTIVITY_UPDATE", handleActivityUpdate);
        FluxDispatcher.unsubscribe("CALL_CREATE", handleCallCreate);
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", handleVoiceState);
        if (exportWatcherInterval) clearInterval(exportWatcherInterval);
        restoreAudioInterceptor();
    }
});
