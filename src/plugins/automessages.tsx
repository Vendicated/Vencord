/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelStore, GuildStore, Menu, NavigationRouter, showToast, Toasts, UserStore } from "@webpack/common";

const MessageActions = findByPropsLazy("sendMessage");

let intervalId: NodeJS.Timeout | null = null;
let countdownId: NodeJS.Timeout | null = null;
let channelRotationId: NodeJS.Timeout | null = null;
let isRunning = false;
let remainingTime: number = 0;
let timerElement: HTMLElement | null = null;
let currentChannelIndex: number = 0;
let channelRotationTimer: number = 0;
let channelRotationCountdownId: NodeJS.Timeout | null = null;

// Alert system variables
let alertAudio: { stop: () => void } | null = null;
let alertButton: HTMLElement | null = null;
let isAlertActive = false;
let isPaused = false;
let alertDetectedUserId: string = "";
let alertSoundStopped = false; // tracks whether sound was already stopped (1st click done)

function generateNonce(): string {
    return (Date.now() * 4194304).toString();
}

function getRandomInterval(): number {
    const min = settings.store.minIntervalSeconds;
    const max = settings.store.maxIntervalSeconds;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomChannelRotationInterval(): number {
    const min = settings.store.minChannelRotationMinutes * 60;
    const max = settings.store.maxChannelRotationMinutes * 60;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getActiveChannels(): string[] {
    const channels = [
        { id: settings.store.channelId1,  enabled: settings.store.channel1Enabled  },
        { id: settings.store.channelId2,  enabled: settings.store.channel2Enabled  },
        { id: settings.store.channelId3,  enabled: settings.store.channel3Enabled  },
        { id: settings.store.channelId4,  enabled: settings.store.channel4Enabled  },
        { id: settings.store.channelId5,  enabled: settings.store.channel5Enabled  },
        { id: settings.store.channelId6,  enabled: settings.store.channel6Enabled  },
        { id: settings.store.channelId7,  enabled: settings.store.channel7Enabled  },
        { id: settings.store.channelId8,  enabled: settings.store.channel8Enabled  },
        { id: settings.store.channelId9,  enabled: settings.store.channel9Enabled  },
        { id: settings.store.channelId10, enabled: settings.store.channel10Enabled }
    ];

    return channels
        .filter(ch => ch.enabled && ch.id && ch.id.trim() !== "")
        .map(ch => ch.id);
}

function getChannelDisplayName(channelId: string): string {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return channelId;

    const channelName = channel.name || "DM";
    const guildId = channel.guild_id;

    if (guildId) {
        const guild = GuildStore.getGuild(guildId);
        const guildName = guild ? guild.name : "Unknown Server";
        return `${channelName} (${guildName})`;
    }

    return channelName;
}

function getCurrentChannelId(): string {
    const channels = getActiveChannels();
    if (channels.length === 0) return "";
    return channels[currentChannelIndex % channels.length];
}

function rotateChannel() {
    const channels = getActiveChannels();
    if (channels.length <= 1) return; // No rotation needed for 0 or 1 channel

    currentChannelIndex = (currentChannelIndex + 1) % channels.length;
    const newChannelId = getCurrentChannelId();
    const displayName = getChannelDisplayName(newChannelId);

    console.log(`[AutoMessageSender] 🔄 Rotated to channel ${currentChannelIndex + 1}/${channels.length}: ${displayName}`);
    showToast(`🔄 Switched to: ${displayName}`, Toasts.Type.MESSAGE);

    // Schedule next rotation
    scheduleChannelRotation();
}

function scheduleChannelRotation() {
    if (channelRotationId) {
        clearTimeout(channelRotationId);
    }

    if (channelRotationCountdownId) {
        clearInterval(channelRotationCountdownId);
    }

    const channels = getActiveChannels();
    if (channels.length <= 1) return; // No rotation needed

    const rotationSeconds = getRandomChannelRotationInterval();
    channelRotationTimer = rotationSeconds;

    console.log(`[AutoMessageSender] Next channel rotation in ${Math.floor(rotationSeconds / 60)} minutes ${rotationSeconds % 60} seconds`);

    // Start countdown for channel rotation
    channelRotationCountdownId = setInterval(() => {
        if (channelRotationTimer > 0) {
            channelRotationTimer--;
        }
    }, 1000);

    channelRotationId = setTimeout(() => {
        rotateChannel();
    }, rotationSeconds * 1000);
}

function createTimerDisplay() {
    if (timerElement) return timerElement;

    const div = document.createElement("div");
    div.id = "auto-message-timer";
    div.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 16px;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.3);
        display: none;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    document.body.appendChild(div);
    timerElement = div;
    return div;
}

function removeTimerDisplay() {
    if (timerElement) {
        timerElement.remove();
        timerElement = null;
    }
}

function createAlertButton() {
    if (alertButton) return alertButton;

    const button = document.createElement("div");
    button.id = "verification-alert-button";
    button.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
        color: white;
        padding: 30px 50px;
        border-radius: 15px;
        font-weight: bold;
        font-size: 24px;
        z-index: 99999;
        box-shadow: 0 8px 30px rgba(255, 0, 0, 0.5);
        border: 3px solid rgba(255, 255, 255, 0.5);
        cursor: pointer;
        display: none;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        text-align: center;
        animation: pulse 1s infinite;
        user-select: none;
    `;

    button.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
        <div style="margin-bottom: 10px;">VERIFICATION ALERT!</div>
        <div style="font-size: 18px; margin-bottom: 5px;" id="alert-user-line">Someone received a verification message!</div>
        <div style="font-size: 16px; opacity: 0.9; margin-bottom: 8px;" id="alert-action-line">🔊 Click once to stop sound</div>
        <div style="font-size: 13px; opacity: 0.7;" id="alert-hint-line">Then click again to dismiss & resume</div>
    `;

    // Add pulsing animation
    const style = document.createElement("style");
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes pulse-muted {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.02); }
        }
    `;
    document.head.appendChild(style);

    // Two-stage click handler
    button.addEventListener("click", () => {
        if (!alertSoundStopped) {
            // ── FIRST CLICK: stop sound only ──────────────────────────────
            alertSoundStopped = true;

            // Stop the beep loop and audio
            isAlertActive = false; // prevents playBeep from scheduling more beeps
            if (alertAudio && typeof alertAudio.stop === "function") {
                alertAudio.stop();
                alertAudio = null;
            }

            // Update button visuals to show sound is off, waiting for 2nd click
            button.style.background = "linear-gradient(135deg, #e67e22 0%, #b35c00 100%)";
            button.style.boxShadow = "0 8px 30px rgba(230, 126, 34, 0.5)";
            button.style.animation = "pulse-muted 1.5s infinite";

            const iconDiv = button.querySelector("div:first-child") as HTMLElement;
            if (iconDiv) iconDiv.textContent = "🔕";

            const actionLine = button.querySelector("#alert-action-line") as HTMLElement;
            if (actionLine) actionLine.textContent = "✅ Sound stopped — click again to resume";

            const hintLine = button.querySelector("#alert-hint-line") as HTMLElement;
            if (hintLine) hintLine.style.opacity = "0";

            showToast("🔕 Sound stopped. Click the button again to dismiss & resume.", Toasts.Type.MESSAGE);
            console.log("[AutoMessageSender] Alert sound stopped (1st click). Waiting for 2nd click to resume.");
        } else {
            // ── SECOND CLICK: dismiss and resume ─────────────────────────
            stopAlert();
        }
    });

    document.body.appendChild(button);
    alertButton = button;
    return button;
}

function removeAlertButton() {
    if (alertButton) {
        alertButton.remove();
        alertButton = null;
    }
}

function playAlertSound() {
    // Create an alert sound using Web Audio API that loops continuously
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    let currentOscillator: OscillatorNode | null = null;

    const playBeep = () => {
        if (!isAlertActive) return;

        // Create new oscillator for each beep
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // High-pitched alert
        oscillator.type = "sine";

        const now = audioContext.currentTime;
        const beepDuration = 0.2;

        // Fade in and out for smoother sound
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + beepDuration);

        oscillator.start(now);
        oscillator.stop(now + beepDuration);

        currentOscillator = oscillator;

        // Schedule next beep - will continue indefinitely until manually stopped
        if (isAlertActive) {
            setTimeout(playBeep, 400); // 200ms beep + 200ms pause = 400ms total
        }
    };

    // Start the beeping loop
    playBeep();

    // Return a stop function
    return {
        stop: () => {
            isAlertActive = false;
            if (currentOscillator) {
                try {
                    currentOscillator.stop();
                } catch (e) {
                    // Already stopped
                }
            }
        }
    };
}

function triggerAlert(detectedUserId: string = "", detectedUsername: string = "", reason: "verification" | "neon-catchlist" | "other-user" | "bot" = "verification") {
    if (isAlertActive) return; // Don't trigger multiple alerts

    if (reason === "neon-catchlist") {
        console.log("[AutoMessageSender] 🎣 NEON CATCHLIST MESSAGE DETECTED IN CHANNEL! 🎣");
        console.log("[AutoMessageSender] A rare catch was detected — pausing auto-messages!");
    } else if (reason === "other-user") {
        console.log("[AutoMessageSender] 👤 OTHER USER MESSAGE DETECTED IN CHANNEL!");
        if (detectedUsername) console.log(`[AutoMessageSender] From: ${detectedUsername}`);
    } else if (reason === "bot") {
        console.log("[AutoMessageSender] 🤖 BOT MESSAGE DETECTED IN CHANNEL!");
        if (detectedUsername) console.log(`[AutoMessageSender] Bot: ${detectedUsername}`);
        if (detectedUserId) console.log(`[AutoMessageSender] Bot ID: ${detectedUserId}`);
    } else {
        console.log("[AutoMessageSender] 🚨 VERIFICATION MESSAGE DETECTED IN CHANNEL! 🚨");
        console.log("[AutoMessageSender] Someone in the channel received a verification warning!");
    }
    if (detectedUserId) {
        console.log(`[AutoMessageSender] Detected user ID: ${detectedUserId}`);
    }

    isAlertActive = true;
    alertDetectedUserId = detectedUserId;
    alertSoundStopped = false; // reset for new alert

    // PAUSE auto message sender (don't fully stop — we'll resume after dismissal)
    if (isRunning) {
        isPaused = true;
        if (intervalId) {
            clearTimeout(intervalId);
            intervalId = null;
        }
        if (countdownId) {
            clearInterval(countdownId);
            countdownId = null;
        }
        if (channelRotationId) {
            clearTimeout(channelRotationId);
            channelRotationId = null;
        }
        if (channelRotationCountdownId) {
            clearInterval(channelRotationCountdownId);
            channelRotationCountdownId = null;
        }
        if (timerElement) {
            timerElement.style.background = "linear-gradient(135deg, #ff6b35 0%, #cc0000 100%)";
            const pauseLabel = reason === "neon-catchlist"
                ? "🎣 PAUSED — Rare catch detected!"
                : reason === "other-user"
                    ? "👤 PAUSED — Other user active!"
                    : reason === "bot"
                        ? "🤖 PAUSED — Bot message detected!"
                        : "⏸️ PAUSED — Verification detected!";
            timerElement.innerHTML = `${pauseLabel}<br><span style="font-size: 12px; opacity: 0.8;">Dismiss the alert to resume</span>`;
        }
        const pauseReason = reason === "neon-catchlist" ? "neon catchlist detection" : reason === "other-user" ? "other user activity" : reason === "bot" ? "bot message detection" : "verification alert";
        console.log(`[AutoMessageSender] Auto-messages PAUSED due to ${pauseReason}`);
    }

    // Play alert sound (loops continuously until manually stopped)
    alertAudio = playAlertSound();

    // Show alert button with detected user info
    const button = createAlertButton();

    // Update button icon/title for neon-catchlist vs verification vs other-user
    const iconDiv2 = button.querySelector("div:first-child") as HTMLElement;
    if (iconDiv2) iconDiv2.textContent = reason === "neon-catchlist" ? "🎣" : reason === "other-user" ? "👤" : reason === "bot" ? "🤖" : "⚠️";
    const titleDiv = button.querySelector("div:nth-child(2)") as HTMLElement;
    if (titleDiv) titleDiv.textContent = reason === "neon-catchlist" ? "NEON CATCHLIST ALERT!" : reason === "other-user" ? "OTHER USER DETECTED!" : reason === "bot" ? "BOT MESSAGE DETECTED!" : "VERIFICATION ALERT!";
    if (reason === "neon-catchlist") {
        button.style.background = "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)";
        button.style.boxShadow = "0 8px 30px rgba(0, 180, 216, 0.5)";
    } else if (reason === "other-user") {
        button.style.background = "linear-gradient(135deg, #f39c12 0%, #d68910 100%)";
        button.style.boxShadow = "0 8px 30px rgba(243, 156, 18, 0.5)";
    } else if (reason === "bot") {
        button.style.background = "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)";
        button.style.boxShadow = "0 8px 30px rgba(124, 58, 237, 0.5)";
    } else {
        button.style.background = "linear-gradient(135deg, #ff0000 0%, #cc0000 100%)";
        button.style.boxShadow = "0 8px 30px rgba(255, 0, 0, 0.5)";
    }

    const userLine = button.querySelector("#alert-user-line") as HTMLElement;
    if (userLine) {
        if (reason === "neon-catchlist") {
            userLine.textContent = "🐟 A rare catch was listed — check it out!";
        } else if (reason === "other-user") {
            if (detectedUsername && detectedUsername !== "Unknown") {
                userLine.textContent = `👤 ${detectedUsername} sent a message in the channel!`;
            } else {
                userLine.textContent = "👤 Someone else sent a message in the channel!";
            }
        } else if (reason === "bot") {
            if (detectedUsername && detectedUsername !== "Unknown") {
                userLine.textContent = `🤖 Bot "${detectedUsername}" sent a message in the channel!`;
            } else {
                userLine.textContent = "🤖 An unignored bot sent a message in the channel!";
            }
        } else if (detectedUserId && detectedUsername && detectedUsername !== "Unknown") {
            userLine.textContent = `⚠️ ${detectedUsername} (${detectedUserId}) received a verification!`;
        } else if (detectedUserId) {
            userLine.textContent = `⚠️ User ${detectedUserId} received a verification!`;
        } else if (detectedUsername && detectedUsername !== "Unknown") {
            userLine.textContent = `⚠️ ${detectedUsername} received a verification!`;
        } else {
            userLine.textContent = "Someone received a verification message!";
        }
    }
    button.style.display = "block";

    // Build toast text
    if (reason === "neon-catchlist") {
        showToast(
            `🎣 NEON CATCHLIST DETECTED! Rare catch incoming — Auto-messages PAUSED. Dismiss to resume.`,
            Toasts.Type.FAILURE
        );
    } else if (reason === "other-user") {
        const who = detectedUsername && detectedUsername !== "Unknown" ? detectedUsername : "Someone";
        showToast(
            `👤 OTHER USER DETECTED! ${who} sent a message — Auto-messages PAUSED. Dismiss to resume.`,
            Toasts.Type.FAILURE
        );
    } else if (reason === "bot") {
        const who = detectedUsername && detectedUsername !== "Unknown" ? detectedUsername : "A bot";
        showToast(
            `🤖 BOT DETECTED! ${who} sent a message — Auto-messages PAUSED. Dismiss to resume.`,
            Toasts.Type.FAILURE
        );
    } else {
        const who = detectedUsername && detectedUsername !== "Unknown"
            ? `${detectedUsername}${detectedUserId ? ` (${detectedUserId})` : ""}`
            : detectedUserId || "Unknown user";
        showToast(
            `⚠️ VERIFICATION DETECTED! ${who} — Auto-messages PAUSED. Dismiss alert to resume.`,
            Toasts.Type.FAILURE
        );
    }
}

function stopAlert() {
    // Can be called directly (test alert, plugin stop) or via 2nd click after sound already stopped
    const wasActive = isAlertActive || alertSoundStopped;
    if (!wasActive && !isPaused) return;

    console.log("[AutoMessageSender] Alert dismissed (2nd click / direct call)");

    isAlertActive = false;
    alertSoundStopped = false;
    alertDetectedUserId = "";

    // Stop sound if somehow still playing (e.g. called directly from test alert)
    if (alertAudio && typeof alertAudio.stop === "function") {
        alertAudio.stop();
        alertAudio = null;
    }

    // Hide alert button and reset its visuals for next time
    if (alertButton) {
        alertButton.style.display = "none";
        // Reset button to red for next alert
        alertButton.style.background = "linear-gradient(135deg, #ff0000 0%, #cc0000 100%)";
        alertButton.style.boxShadow = "0 8px 30px rgba(255, 0, 0, 0.5)";
        alertButton.style.animation = "pulse 1s infinite";
        const iconDiv = alertButton.querySelector("div:first-child") as HTMLElement;
        if (iconDiv) iconDiv.textContent = "⚠️";
        const actionLine = alertButton.querySelector("#alert-action-line") as HTMLElement;
        if (actionLine) actionLine.textContent = "🔊 Click once to stop sound";
        const hintLine = alertButton.querySelector("#alert-hint-line") as HTMLElement;
        if (hintLine) hintLine.style.opacity = "0.7";
    }

    // Resume auto-messages if they were paused
    if (isPaused && isRunning) {
        isPaused = false;

        // Restore timer display color
        if (timerElement) {
            timerElement.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
        }

        // Resume the message loop scheduling
        const resumeLoop = () => {
            const randomDelay = getRandomInterval();
            console.log(`[AutoMessageSender] Resuming — next message in ${randomDelay} seconds...`);
            startCountdown(randomDelay);
            intervalId = setTimeout(() => {
                sendMessages();
                resumeLoop();
            }, randomDelay * 1000);
        };

        // Reschedule channel rotation if needed
        const channels = getActiveChannels();
        if (channels.length > 1) {
            scheduleChannelRotation();
        }

        resumeLoop();
        showToast("✅ Alert dismissed — auto-messages RESUMED!", Toasts.Type.SUCCESS);
        console.log("[AutoMessageSender] Auto-messages resumed after alert dismissal");
    } else {
        isPaused = false;
        showToast("Alert dismissed.", Toasts.Type.MESSAGE);
    }
}

function checkForVerificationMessage(message: any): { detected: boolean; userId: string } {
    if (!message.content) return { detected: false, userId: "" };

    const raw = message.content;
    // Strip zero-width chars, then collapse whitespace for clean matching
    const clean = raw.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "").replace(/\s+/g, " ").toLowerCase();

    let userId = "";

    // Try to extract mentioned user ID from the message (<@USERID> or <@!USERID>)
    const mentionMatch = raw.match(/<@!?(\d+)>/);
    if (mentionMatch) {
        userId = mentionMatch[1];
    }

    // ─── Pattern 1 ──────────────────────────────────────────────────────────
    // "⚠️ | <@USER>, are you a real human? Please use the link below so I can check!
    //  | Please complete this within 10 minutes or it may result in a ban!"
    const isHumanCheck =
        (raw.includes("⚠️") || raw.includes("⚠")) &&
        clean.includes("are you a real human") &&
        clean.includes("please use the link below") &&
        (clean.includes("complete this within") || clean.includes("may result in a ban"));

    // ─── Pattern 2 ──────────────────────────────────────────────────────────
    // "| @Roster! Please complete your captcha to verify that you are human! (1/5)" ... "(5/5)"
    const isCaptchaCheck =
        clean.includes("please complete your captcha") &&
        clean.includes("verify that you are human") &&
        /\(\d\/\d\)/.test(clean); // matches (1/5) through (5/5)

    // ─── Fallback broad patterns ─────────────────────────────────────────────
    const isBroadMatch =
        ((raw.includes("⚠️") || raw.includes("⚠")) &&
            (clean.includes("are you a real human") ||
                (clean.includes("complete this within") && clean.includes("minutes"))));

    const detected = isHumanCheck || isCaptchaCheck || isBroadMatch;

    // For captcha pattern, try to extract user from @mention text if no <@ID> found
    if (detected && !userId) {
        // Try numeric ID anywhere in message as fallback
        const numericMatch = raw.match(/\b(\d{17,20})\b/);
        if (numericMatch) userId = numericMatch[1];
    }

    return { detected, userId };
}

function checkForNeonCatchlist(message: any): boolean {
    const TRIGGER = 'Use "neon catchlist" to see a list of your rare catches';

    // Check plain text content
    if (message.content && message.content.includes(TRIGGER)) return true;

    // Check embeds (description, fields, footer, title)
    if (Array.isArray(message.embeds)) {
        for (const embed of message.embeds) {
            if (embed.description && embed.description.includes(TRIGGER)) return true;
            if (embed.title && embed.title.includes(TRIGGER)) return true;
            if (embed.footer?.text && embed.footer.text.includes(TRIGGER)) return true;
            if (Array.isArray(embed.fields)) {
                for (const field of embed.fields) {
                    if ((field.value && field.value.includes(TRIGGER)) ||
                        (field.name && field.name.includes(TRIGGER))) return true;
                }
            }
        }
    }

    return false;
}

function checkForOtherUserMessage(message: any, myUserId: string): boolean {
    // Ignore messages from ourselves
    if (!message.author || message.author.id === myUserId) return false;
    // Ignore bots
    if (message.author.bot) return false;

    // Ignore specifically listed user IDs
    const ignoreIdsRaw = settings.store.otherUserIgnoreUserIds || "";
    const ignoreIds = ignoreIdsRaw
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    if (ignoreIds.includes(message.author.id)) return false;

    const raw: string = (message.content || "").trim();

    // Build ignore list from settings (comma-separated, case-insensitive, trimmed)
    const ignoreRaw = settings.store.otherUserIgnoreList || "";
    const ignoreList = ignoreRaw
        .split(",")
        .map((s: string) => s.trim().toLowerCase())
        .filter((s: string) => s.length > 0);

    const rawLower = raw.toLowerCase();

    // If the full message exactly matches an ignored phrase → skip
    if (ignoreList.includes(rawLower)) return false;

    // If the message STARTS with an ignored phrase followed by nothing or just spaces → skip
    for (const ignored of ignoreList) {
        if (rawLower === ignored) return false;
        // also allow slight variations like "owoh " with trailing space
        if (rawLower.startsWith(ignored) && rawLower.slice(ignored.length).trim() === "") return false;
    }

    return true; // Someone else sent a non-ignored message → alert!
}

function checkForBotMessage(message: any): boolean {
    // Only care about actual bots
    if (!message.author || !message.author.bot) return false;

    // Parse the ignore list from settings
    const ignoreIdsRaw = settings.store.botIgnoreIds || "";
    const ignoreIds = ignoreIdsRaw
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

    // Skip bots whose IDs are in the ignore list
    if (ignoreIds.includes(message.author.id)) return false;

    return true; // An unignored bot sent a message → alert!
}

function startCountdown(totalSeconds: number) {
    if (countdownId) clearInterval(countdownId);

    remainingTime = totalSeconds;
    const timerDiv = createTimerDisplay();
    timerDiv.style.display = "block";

    const updateTimer = () => {
        if (timerDiv) {
            const channels = getActiveChannels();
            const currentChannelId = getCurrentChannelId();
            const displayName = getChannelDisplayName(currentChannelId);

            // Format channel rotation time
            const rotationMinutes = Math.floor(channelRotationTimer / 60);
            const rotationSeconds = channelRotationTimer % 60;
            const rotationTime = channels.length > 1
                ? `${rotationMinutes}:${rotationSeconds.toString().padStart(2, '0')}`
                : "N/A";

            timerDiv.innerHTML = `
                ⏱️ Next message in: ${remainingTime}s<br>
                <span style="font-size: 12px; opacity: 0.8;">${displayName}</span><br>
                <span style="font-size: 11px; opacity: 0.7;">Channel ${currentChannelIndex + 1}/${channels.length} | Switch in: ${rotationTime}</span>
            `;
            timerDiv.style.opacity = remainingTime <= 5 ? "1" : "0.8";
        }

        if (remainingTime <= 0) {
            clearInterval(countdownId!);
            countdownId = null;
        } else {
            remainingTime--;
        }
    };

    updateTimer();
    countdownId = setInterval(updateTimer, 1000);
}

const settings = definePluginSettings({
    channelId1: {
        type: OptionType.STRING,
        description: "Channel ID 1 (use ➕ Add in right-click menu)",
        default: ""
    },
    channel1Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 1",
        default: true
    },
    channelId2: {
        type: OptionType.STRING,
        description: "Channel ID 2 (Optional)",
        default: ""
    },
    channel2Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 2",
        default: true
    },
    channelId3: {
        type: OptionType.STRING,
        description: "Channel ID 3 (Optional)",
        default: ""
    },
    channel3Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 3",
        default: true
    },
    channelId4: {
        type: OptionType.STRING,
        description: "Channel ID 4 (Optional)",
        default: ""
    },
    channel4Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 4",
        default: true
    },
    channelId5: {
        type: OptionType.STRING,
        description: "Channel ID 5 (Optional)",
        default: ""
    },
    channel5Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 5",
        default: true
    },
    channelId6: {
        type: OptionType.STRING,
        description: "Channel ID 6 (Optional)",
        default: ""
    },
    channel6Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 6",
        default: true
    },
    channelId7: {
        type: OptionType.STRING,
        description: "Channel ID 7 (Optional)",
        default: ""
    },
    channel7Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 7",
        default: true
    },
    channelId8: {
        type: OptionType.STRING,
        description: "Channel ID 8 (Optional)",
        default: ""
    },
    channel8Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 8",
        default: true
    },
    channelId9: {
        type: OptionType.STRING,
        description: "Channel ID 9 (Optional)",
        default: ""
    },
    channel9Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 9",
        default: true
    },
    channelId10: {
        type: OptionType.STRING,
        description: "Channel ID 10 (Optional)",
        default: ""
    },
    channel10Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 10",
        default: true
    },
    minChannelRotationMinutes: {
        type: OptionType.NUMBER,
        description: "Minimum minutes before rotating to next channel",
        default: 10
    },
    maxChannelRotationMinutes: {
        type: OptionType.NUMBER,
        description: "Maximum minutes before rotating to next channel",
        default: 20
    },
    message1: {
        type: OptionType.STRING,
        description: "Message 1 (leave blank to skip)",
        default: "Hi"
    },
    message2: {
        type: OptionType.STRING,
        description: "Message 2 (leave blank to skip)",
        default: "Hello"
    },
    message3: {
        type: OptionType.STRING,
        description: "Message 3 (leave blank to skip)",
        default: "Yo"
    },
    message4: {
        type: OptionType.STRING,
        description: "Message 4 (leave blank to skip)",
        default: ""
    },
    message5: {
        type: OptionType.STRING,
        description: "Message 5 (leave blank to skip)",
        default: ""
    },
    message6: {
        type: OptionType.STRING,
        description: "Message 6 (leave blank to skip)",
        default: ""
    },
    message7: {
        type: OptionType.STRING,
        description: "Message 7 (leave blank to skip)",
        default: ""
    },
    message8: {
        type: OptionType.STRING,
        description: "Message 8 (leave blank to skip)",
        default: ""
    },
    message9: {
        type: OptionType.STRING,
        description: "Message 9 (leave blank to skip)",
        default: ""
    },
    message10: {
        type: OptionType.STRING,
        description: "Message 10 (leave blank to skip)",
        default: ""
    },
    minIntervalSeconds: {
        type: OptionType.NUMBER,
        description: "Minimum seconds to wait between message cycles",
        default: 20
    },
    maxIntervalSeconds: {
        type: OptionType.NUMBER,
        description: "Maximum seconds to wait between message cycles",
        default: 40
    },
    enableVerificationDetection: {
        type: OptionType.BOOLEAN,
        description: "Enable automatic detection of verification messages",
        default: true
    },
    enableOtherUserDetection: {
        type: OptionType.BOOLEAN,
        description: "Alert when another user sends a message in the channel (ignores OWO-bot-style commands)",
        default: true
    },
    otherUserIgnoreList: {
        type: OptionType.STRING,
        description: "Comma-separated messages to IGNORE (won't alert). Add your own. Example: owo, owoh, owob, wh",
        default: "owo, owoh, owob, wh, wb, gh, gb, owo h, owo b, w h, w b, wpiku, owopiku, wpup, owopup, owo hunt, owo battle, owo gamble, owo fish, owo pray, owo run, owo zap, owo loot"
    },
    otherUserIgnoreUserIds: {
        type: OptionType.STRING,
        description: "Comma-separated user IDs to IGNORE (their messages will never trigger an alert). Add more as needed.",
        default: "507962222132068362, 767671131032518687"
    },
    enableBotDetection: {
        type: OptionType.BOOLEAN,
        description: "Alert when a bot sends a message in the channel (ignores bots listed in Bot Ignore IDs)",
        default: false
    },
    botIgnoreIds: {
        type: OptionType.STRING,
        description: "Comma-separated bot IDs to IGNORE (their messages will never trigger a bot alert). Example: 408785106942164992, 547905866255433758",
        default: "408785106942164992, 547905866255433758"
    }
});

async function sendMessages() {
    const channelId = getCurrentChannelId();

    if (!channelId) {
        showToast("No enabled channels configured!", Toasts.Type.FAILURE);
        stopMessageLoop();
        return;
    }

    const messages = [
        settings.store.message1,
        settings.store.message2,
        settings.store.message3,
        settings.store.message4,
        settings.store.message5,
        settings.store.message6,
        settings.store.message7,
        settings.store.message8,
        settings.store.message9,
        settings.store.message10
    ].filter(msg => msg && msg.trim() !== "");

    if (messages.length === 0) {
        showToast("No messages configured!", Toasts.Type.FAILURE);
        stopMessageLoop();
        return;
    }

    const displayName = getChannelDisplayName(channelId);
    console.log(`[AutoMessageSender] Sending message sequence to: ${displayName}...`);

    for (const message of messages) {
        try {
            await MessageActions.sendMessage(
                channelId,
                {
                    content: message,
                    tts: false,
                    invalidEmojis: [],
                    validNonShortcutEmojis: []
                },
                undefined,
                {
                    nonce: generateNonce()
                }
            );
            console.log(`[AutoMessageSender] ✓ Sent to ${displayName}: "${message}"`);

            // Small delay between messages (500ms)
            if (message !== messages[messages.length - 1]) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error("[AutoMessageSender] Error sending message:", error);
            showToast("Failed to send message. Stopping plugin.", Toasts.Type.FAILURE);
            stopMessageLoop();
            return;
        }
    }

    console.log(`[AutoMessageSender] Sequence complete. Next cycle in ${settings.store.minIntervalSeconds}-${settings.store.maxIntervalSeconds} seconds (random).`);
}

function manualPause() {
    if (!isRunning) {
        showToast("Auto-messages are not running.", Toasts.Type.MESSAGE);
        return;
    }
    if (isPaused) {
        showToast("Already paused.", Toasts.Type.MESSAGE);
        return;
    }
    isPaused = true;
    if (intervalId) { clearTimeout(intervalId); intervalId = null; }
    if (countdownId) { clearInterval(countdownId); countdownId = null; }
    if (channelRotationId) { clearTimeout(channelRotationId); channelRotationId = null; }
    if (channelRotationCountdownId) { clearInterval(channelRotationCountdownId); channelRotationCountdownId = null; }
    if (timerElement) {
        timerElement.style.background = "linear-gradient(135deg, #f39c12 0%, #d68910 100%)";
        timerElement.innerHTML = `⏸️ MANUALLY PAUSED<br><span style="font-size: 12px; opacity: 0.8;">Right-click → Resume to continue</span>`;
    }
    showToast("⏸️ Auto-messages manually paused.", Toasts.Type.MESSAGE);
    console.log("[AutoMessageSender] Auto-messages manually paused.");
}

function manualResume() {
    if (!isRunning) {
        showToast("Auto-messages are not running. Start them first.", Toasts.Type.MESSAGE);
        return;
    }
    if (!isPaused) {
        showToast("Auto-messages are not paused.", Toasts.Type.MESSAGE);
        return;
    }
    isPaused = false;

    if (timerElement) {
        timerElement.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    }

    const channels = getActiveChannels();
    if (channels.length > 1) {
        scheduleChannelRotation();
    }

    const resumeLoop = () => {
        const randomDelay = getRandomInterval();
        console.log(`[AutoMessageSender] (Manual resume) Next message in ${randomDelay} seconds...`);
        startCountdown(randomDelay);
        intervalId = setTimeout(() => {
            sendMessages();
            resumeLoop();
        }, randomDelay * 1000);
    };

    resumeLoop();
    showToast("▶️ Auto-messages manually resumed!", Toasts.Type.SUCCESS);
    console.log("[AutoMessageSender] Auto-messages manually resumed.");
}

function startMessageLoop() {
    if (intervalId || isRunning) {
        showToast("Auto message sender is already running!", Toasts.Type.MESSAGE);
        return;
    }

    const channels = getActiveChannels();
    if (channels.length === 0) {
        showToast("Please enable at least one channel!", Toasts.Type.FAILURE);
        return;
    }

    isRunning = true;
    currentChannelIndex = 0;

    const timerDiv = createTimerDisplay();
    timerDiv.style.display = "block";

    // Send immediately on start
    sendMessages();

    // Schedule channel rotation if multiple channels
    if (channels.length > 1) {
        scheduleChannelRotation();
    }

    // Then repeat with random interval
    function scheduleNext() {
        const randomDelay = getRandomInterval();
        console.log(`[AutoMessageSender] Next message in ${randomDelay} seconds...`);
        startCountdown(randomDelay);

        intervalId = setTimeout(() => {
            sendMessages();
            scheduleNext();
        }, randomDelay * 1000);
    }

    scheduleNext();

    const channelList = channels.map((id, i) => {
        return `${i + 1}. ${getChannelDisplayName(id)}`;
    }).join(", ");

    showToast(`Auto sender started! ${channels.length} enabled channel(s)`, Toasts.Type.SUCCESS);
    console.log(`[AutoMessageSender] Plugin started with ${channels.length} enabled channels: ${channelList}`);
}

function stopMessageLoop() {
    if (intervalId) {
        clearTimeout(intervalId);
        intervalId = null;
    }

    if (countdownId) {
        clearInterval(countdownId);
        countdownId = null;
    }

    if (channelRotationId) {
        clearTimeout(channelRotationId);
        channelRotationId = null;
    }

    if (channelRotationCountdownId) {
        clearInterval(channelRotationCountdownId);
        channelRotationCountdownId = null;
    }

    removeTimerDisplay();
    isRunning = false;
    showToast("Auto message sender stopped!", Toasts.Type.MESSAGE);
    console.log("[AutoMessageSender] Plugin stopped");
}

function addCurrentChannel() {
    const currentChannel = ChannelStore.getChannel(ChannelStore.getLastSelectedChannelId());

    if (!currentChannel) {
        showToast("No channel selected!", Toasts.Type.FAILURE);
        return;
    }

    const slots = [
        { idKey: "channelId1",  enableKey: "channel1Enabled"  },
        { idKey: "channelId2",  enableKey: "channel2Enabled"  },
        { idKey: "channelId3",  enableKey: "channel3Enabled"  },
        { idKey: "channelId4",  enableKey: "channel4Enabled"  },
        { idKey: "channelId5",  enableKey: "channel5Enabled"  },
        { idKey: "channelId6",  enableKey: "channel6Enabled"  },
        { idKey: "channelId7",  enableKey: "channel7Enabled"  },
        { idKey: "channelId8",  enableKey: "channel8Enabled"  },
        { idKey: "channelId9",  enableKey: "channel9Enabled"  },
        { idKey: "channelId10", enableKey: "channel10Enabled" }
    ];

    // Check if channel is already added
    for (let i = 0; i < slots.length; i++) {
        const existingId = settings.store[slots[i].idKey as keyof typeof settings.store] as string;
        if (existingId === currentChannel.id) {
            showToast(`Channel already added as Slot ${i + 1}!`, Toasts.Type.FAILURE);
            return;
        }
    }

    // Find first empty slot
    const emptySlot = slots.findIndex(s => {
        const id = settings.store[s.idKey as keyof typeof settings.store] as string;
        return !id || id.trim() === "";
    });

    if (emptySlot === -1) {
        showToast("All 10 channel slots are full! Remove one in Settings first.", Toasts.Type.FAILURE);
        return;
    }

    const slotNum = emptySlot + 1;
    settings.store[slots[emptySlot].idKey as keyof typeof settings.store] = currentChannel.id;
    settings.store[slots[emptySlot].enableKey as keyof typeof settings.store] = true;

    const displayName = getChannelDisplayName(currentChannel.id);
    showToast(`✅ Channel added to Slot ${slotNum}: ${displayName}`, Toasts.Type.SUCCESS);
    console.log(`[AutoMessageSender] Channel added to slot ${slotNum}: ${displayName} (${currentChannel.id})`);
}

function toggleChannel(channelNumber: number) {
    const enableKey = `channel${channelNumber}Enabled` as keyof typeof settings.store;
    const channelIdKey = `channelId${channelNumber}` as keyof typeof settings.store;
    const channelId = settings.store[channelIdKey] as string;

    if (!channelId || channelId.trim() === "") {
        showToast(`Channel ${channelNumber} is not configured!`, Toasts.Type.FAILURE);
        return;
    }

    const currentValue = settings.store[enableKey] as boolean;
    settings.store[enableKey] = !currentValue;

    const displayName = getChannelDisplayName(channelId);
    const status = !currentValue ? "enabled" : "disabled";
    showToast(`Channel ${channelNumber} ${status}: ${displayName}`, Toasts.Type.SUCCESS);
    console.log(`[AutoMessageSender] Channel ${channelNumber} ${status}: ${displayName}`);
}

export default definePlugin({
    name: "AutoMessageSender",
    description: "Automatically sends a sequence of messages to multiple channels with rotation and verification detection",
    longDescription: "AutoMessageSender allows you to set up automatic message sequences that are sent to up to 10 target Discord channels with automatic rotation. Includes verification message detection with sound alerts, auto-pause/resume on detection, and individual channel enable/disable toggles.",
    authors: [Devs.rz30],
    settings,

    flux: {
        MESSAGE_CREATE({ message }: { message: any }) {
            if (!settings.store.enableVerificationDetection) return;
            if (!isRunning && !isPaused) return; // only monitor while active

            // Only alert if the message is in the channel we're currently sending to
            const currentChannelId = getCurrentChannelId();
            if (!currentChannelId || message.channel_id !== currentChannelId) return;

            const result = checkForVerificationMessage(message);
            if (result.detected) {
                const authorName = message.author?.global_name || message.author?.username || "Unknown";
                console.log("[AutoMessageSender] Verification message detected in current channel:");
                console.log(`[AutoMessageSender] From: ${authorName}`);
                console.log(`[AutoMessageSender] Content: ${message.content}`);
                if (result.userId) console.log(`[AutoMessageSender] Targeted user ID: ${result.userId}`);
                triggerAlert(result.userId, authorName, "verification");
                return;
            }

            if (checkForNeonCatchlist(message)) {
                console.log("[AutoMessageSender] 🎣 Neon catchlist message detected in current channel!");
                triggerAlert("", "", "neon-catchlist");
                return;
            }

            // Check if another real user (non-bot, not us) sent any non-ignored message
            if (settings.store.enableOtherUserDetection) {
                const myUser = UserStore.getCurrentUser();
                const myId = myUser?.id ?? "";
                if (checkForOtherUserMessage(message, myId)) {
                    const authorName = message.author?.global_name || message.author?.username || "Unknown";
                    console.log(`[AutoMessageSender] 👤 Other user message from ${authorName}: "${message.content}"`);
                    triggerAlert("", authorName, "other-user");
                    return;
                }
            }

            // Check if an unignored bot sent a message
            if (settings.store.enableBotDetection) {
                if (checkForBotMessage(message)) {
                    const botName = message.author?.global_name || message.author?.username || "Unknown Bot";
                    const botId = message.author?.id ?? "";
                    console.log(`[AutoMessageSender] 🤖 Unignored bot message from ${botName} (${botId}): "${message.content}"`);
                    triggerAlert(botId, botName, "bot");
                }
            }
        }
    },

    start() {
        console.log("[AutoMessageSender] Plugin loaded!");
        console.log("[AutoMessageSender] Verification detection enabled — PAUSES on alert, resumes on dismiss");
        console.log("[AutoMessageSender] Supports up to 10 channels with enable/disable toggles");
        console.log("[AutoMessageSender] Right-click any channel to see Auto Message options");
        console.log("[AutoMessageSender] Developer: Ar7340 | Discord ID: 1321782566763892748");
        console.log("[AutoMessageSender] Repository: https://github.com/Ar7340/Discord-Auto-Messages-Vencord");

        // Create alert button (hidden by default)
        createAlertButton();
    },

    stop() {
        stopMessageLoop();
        removeTimerDisplay();
        stopAlert();
        removeAlertButton();
        console.log("[AutoMessageSender] Plugin unloaded");
    },

    // Add context menu to channels
    contextMenus: {
        "channel-context"(children, props) {
            const channel = ChannelStore.getChannel(props.channel.id);
            if (!channel) return;

            children.push(
                <Menu.MenuItem
                    label="Auto Message Sender"
                    id="auto-message-sender"
                >
                    <Menu.MenuItem
                        id="auto-message-start"
                        label={isRunning ? "✅ Stop Auto Messages" : "▶️ Start Auto Messages"}
                        action={() => {
                            if (isRunning) {
                                stopMessageLoop();
                            } else {
                                startMessageLoop();
                            }
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-pause"
                        label={isPaused ? "▶️ Resume Auto Messages" : "⏸️ Pause Auto Messages"}
                        disabled={!isRunning}
                        action={() => {
                            if (isPaused) {
                                manualResume();
                            } else {
                                manualPause();
                            }
                        }}
                    />
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="auto-message-channels"
                        label="📋 Channels"
                    >
                        {[
                            { idKey: "channelId1"  as const, enableKey: "channel1Enabled"  as const, num: 1  },
                            { idKey: "channelId2"  as const, enableKey: "channel2Enabled"  as const, num: 2  },
                            { idKey: "channelId3"  as const, enableKey: "channel3Enabled"  as const, num: 3  },
                            { idKey: "channelId4"  as const, enableKey: "channel4Enabled"  as const, num: 4  },
                            { idKey: "channelId5"  as const, enableKey: "channel5Enabled"  as const, num: 5  },
                            { idKey: "channelId6"  as const, enableKey: "channel6Enabled"  as const, num: 6  },
                            { idKey: "channelId7"  as const, enableKey: "channel7Enabled"  as const, num: 7  },
                            { idKey: "channelId8"  as const, enableKey: "channel8Enabled"  as const, num: 8  },
                            { idKey: "channelId9"  as const, enableKey: "channel9Enabled"  as const, num: 9  },
                            { idKey: "channelId10" as const, enableKey: "channel10Enabled" as const, num: 10 }
                        ].map(({ idKey, enableKey, num }) => {
                            const channelId = settings.store[idKey];
                            if (!channelId || channelId.trim() === "") return null;
                            const enabled = settings.store[enableKey];
                            const name = getChannelDisplayName(channelId);
                            return (
                                <Menu.MenuItem
                                    key={`ch-${num}`}
                                    id={`auto-message-channel-${num}`}
                                    label={`${enabled ? "✅" : "❌"} Slot ${num}: ${name}`}
                                    action={() => toggleChannel(num)}
                                />
                            );
                        })}
                        <Menu.MenuSeparator />
                        <Menu.MenuItem
                            id="auto-message-add-channel"
                            label={(() => {
                                const slots = ["channelId1","channelId2","channelId3","channelId4","channelId5","channelId6","channelId7","channelId8","channelId9","channelId10"] as const;
                                const filled = slots.filter(k => settings.store[k] && settings.store[k].trim() !== "").length;
                                return filled >= 10 ? "🚫 All Slots Full (10/10)" : `➕ Add Current Channel (${filled}/10)`;
                            })()}
                            disabled={(() => {
                                const slots = ["channelId1","channelId2","channelId3","channelId4","channelId5","channelId6","channelId7","channelId8","channelId9","channelId10"] as const;
                                return slots.every(k => settings.store[k] && settings.store[k].trim() !== "");
                            })()}
                            action={() => addCurrentChannel()}
                        />
                    </Menu.MenuItem>
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="auto-message-goto-channels"
                        label="🔗 Go To Channel"
                    >
                        {[
                            { idKey: "channelId1"  as const, num: 1  },
                            { idKey: "channelId2"  as const, num: 2  },
                            { idKey: "channelId3"  as const, num: 3  },
                            { idKey: "channelId4"  as const, num: 4  },
                            { idKey: "channelId5"  as const, num: 5  },
                            { idKey: "channelId6"  as const, num: 6  },
                            { idKey: "channelId7"  as const, num: 7  },
                            { idKey: "channelId8"  as const, num: 8  },
                            { idKey: "channelId9"  as const, num: 9  },
                            { idKey: "channelId10" as const, num: 10 }
                        ].map(({ idKey, num }) => {
                            const channelId = settings.store[idKey];
                            if (!channelId || channelId.trim() === "") return null;
                            return (
                                <Menu.MenuItem
                                    key={`goto-${num}`}
                                    id={`auto-message-goto-channel-${num}`}
                                    label={`Slot ${num}: ${getChannelDisplayName(channelId)}`}
                                    action={() => {
                                        const targetChannel = ChannelStore.getChannel(channelId);
                                        if (!targetChannel) {
                                            showToast(`Slot ${num} channel not found!`, Toasts.Type.FAILURE);
                                            return;
                                        }
                                        const guildId = targetChannel.guild_id;
                                        if (guildId) {
                                            NavigationRouter.transitionTo(`/channels/${guildId}/${channelId}`);
                                        } else {
                                            NavigationRouter.transitionTo(`/channels/@me/${channelId}`);
                                        }
                                        showToast(`Navigating to: ${getChannelDisplayName(channelId)}`, Toasts.Type.SUCCESS);
                                    }}
                                />
                            );
                        })}
                    </Menu.MenuItem>

                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="auto-message-status"
                        label={`Status: ${isRunning ? (isPaused ? "⏸️ Paused" : "🟢 Running") : "🔴 Stopped"}`}
                        action={() => {
                            const allChannels = [
                                { id: settings.store.channelId1,  enabled: settings.store.channel1Enabled,  num: 1  },
                                { id: settings.store.channelId2,  enabled: settings.store.channel2Enabled,  num: 2  },
                                { id: settings.store.channelId3,  enabled: settings.store.channel3Enabled,  num: 3  },
                                { id: settings.store.channelId4,  enabled: settings.store.channel4Enabled,  num: 4  },
                                { id: settings.store.channelId5,  enabled: settings.store.channel5Enabled,  num: 5  },
                                { id: settings.store.channelId6,  enabled: settings.store.channel6Enabled,  num: 6  },
                                { id: settings.store.channelId7,  enabled: settings.store.channel7Enabled,  num: 7  },
                                { id: settings.store.channelId8,  enabled: settings.store.channel8Enabled,  num: 8  },
                                { id: settings.store.channelId9,  enabled: settings.store.channel9Enabled,  num: 9  },
                                { id: settings.store.channelId10, enabled: settings.store.channel10Enabled, num: 10 }
                            ].filter(ch => ch.id && ch.id.trim() !== "");

                            const statusList = allChannels.map(ch => {
                                const status = ch.enabled ? "✅" : "❌";
                                return `${status} Slot ${ch.num}: ${getChannelDisplayName(ch.id)}`;
                            }).join("\n");

                            const runState = isRunning ? (isPaused ? "Paused (alert)" : "Running") : "Stopped";
                            showToast(
                                `Status: ${runState}\n\n${statusList || "No channels configured"}\n\nMessage Delay: ${settings.store.minIntervalSeconds}s - ${settings.store.maxIntervalSeconds}s\nRotation: ${settings.store.minChannelRotationMinutes}-${settings.store.maxChannelRotationMinutes} min\nVerification Detection: ${settings.store.enableVerificationDetection ? "ON" : "OFF"}\nOther User Detection: ${settings.store.enableOtherUserDetection ? "ON" : "OFF"}\nBot Detection: ${settings.store.enableBotDetection ? "ON" : "OFF"}`,
                                Toasts.Type.MESSAGE
                            );
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-rotate-now"
                        label="🔄 Rotate Channel Now"
                        disabled={!isRunning || getActiveChannels().length <= 1}
                        action={() => {
                            rotateChannel();
                        }}
                    />
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="auto-message-test-alert"
                        label="🔔 Test Verification Alert"
                        action={() => {
                            triggerAlert();
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-settings"
                        label="⚙️ Open Settings"
                        action={() => {
                            const settingsButton = document.querySelector('[aria-label="User Settings"]') as HTMLElement;
                            settingsButton?.click();
                            setTimeout(() => {
                                const vencordTab = Array.from(document.querySelectorAll('[class*="item"]'))
                                    .find(el => el.textContent === "Vencord") as HTMLElement;
                                vencordTab?.click();
                                setTimeout(() => {
                                    const pluginsTab = Array.from(document.querySelectorAll('[class*="item"]'))
                                        .find(el => el.textContent === "Plugins") as HTMLElement;
                                    pluginsTab?.click();
                                }, 100);
                            }, 100);
                        }}
                    />
                </Menu.MenuItem>
            );
        }
    }
});
