/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, SelectedChannelStore, UserStore } from "@webpack/common";

interface MessageCreatePayload {
    type: "MESSAGE_CREATE";
    channelId: string;
    guildId?: string;
    message: {
        id: string;
        author: { id: string };
        mentions: Array<{ id: string }>;
        mention_everyone?: boolean;
        flags?: number;
        referenced_message?: { author?: { id: string } };
    };
}

interface Raindrop {
    x: number;
    y: number;
    vy: number;
    vx: number;
    length: number;
    opacity: number;
    depth: number;
    thickness: number;
    isHero: boolean;
}

interface Splash {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    type: "particle" | "ring";
}

const settings = definePluginSettings({
    style: {
        type: OptionType.SELECT,
        description: "Visual style of the shower",
        options: [
            { label: "Cinematic (parallax depth + glow + splashes)", value: "cinematic", default: true },
            { label: "Classic (simple lines)", value: "classic" },
            { label: "Sparkle (glittery diamonds)", value: "sparkle" }
        ]
    },
    intensity: {
        type: OptionType.SELECT,
        description: "Density of the shower",
        options: [
            { label: "Drizzle (40)", value: 40 },
            { label: "Shower (80)", value: 80, default: true },
            { label: "Downpour (150)", value: 150 },
            { label: "Monsoon (300)", value: 300 }
        ]
    },
    duration: {
        type: OptionType.SLIDER,
        description: "How long the shower lasts (seconds)",
        markers: [1, 2, 3, 5, 8],
        default: 3,
        stickToMarkers: true
    },
    color: {
        type: OptionType.STRING,
        description: "Drop color. Try: rgba(170,215,255,0.85) blue, #ffd700 gold, #ff8fb1 sakura, #80ff80 matrix",
        default: "rgba(170, 215, 255, 0.85)"
    },
    glow: {
        type: OptionType.SLIDER,
        description: "Soft glow around each drop (0 = none, 12 = heavy)",
        markers: [0, 3, 6, 9, 12],
        default: 6,
        stickToMarkers: true
    },
    wind: {
        type: OptionType.SLIDER,
        description: "Wind angle in degrees (0 = vertical, 25 = stormy)",
        markers: [0, 4, 8, 15, 25],
        default: 4,
        stickToMarkers: true
    },
    splashes: {
        type: OptionType.BOOLEAN,
        description: "Splash particles when drops hit the bottom of the screen",
        default: true
    },
    backdropTint: {
        type: OptionType.BOOLEAN,
        description: "Subtly darken the background during a shower for contrast",
        default: true
    },
    triggerOnReply: {
        type: OptionType.BOOLEAN,
        description: "Rain on replies to your messages (Discord adds you to mentions on replies)",
        default: true
    },
    triggerOnEveryone: {
        type: OptionType.BOOLEAN,
        description: "Also rain on @everyone / @here mentions",
        default: false
    },
    onlyFocusedChannel: {
        type: OptionType.BOOLEAN,
        description: "Only rain if the mention is in your currently open channel",
        default: false
    }
});

let activeCanvas: HTMLCanvasElement | null = null;
let activeAnimationFrame: number | null = null;
let activeStartTime = 0;
let activeDurationMs = 0;

function startRain() {
    if (activeCanvas) {
        activeStartTime = performance.now();
        activeDurationMs = settings.store.duration * 1000;
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.id = "vc-mention-rain";
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99999";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    activeCanvas = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        cleanup();
        return;
    }

    const { intensity, duration, color, glow, wind, splashes, backdropTint, style } = settings.store;
    const dropCount: number = intensity;
    activeDurationMs = duration * 1000;
    activeStartTime = performance.now();

    const windRadians = (wind * Math.PI) / 180;
    const isSparkle = style === "sparkle";
    const isCinematic = style === "cinematic";

    const drops: Raindrop[] = Array.from({ length: dropCount }, () => {
        const depth = Math.random();
        const isHero = isCinematic && Math.random() < 0.08;
        const speedBase = isSparkle ? 2 + Math.random() * 3 : 6 + Math.random() * 10;
        const baseVy = isCinematic ? speedBase * (0.4 + depth * 1.4) : speedBase;
        const vy = isHero ? baseVy * 1.3 : baseVy;
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height * 0.5,
            vy,
            vx: vy * Math.tan(windRadians),
            length: isSparkle
                ? 2 + Math.random() * 4
                : isHero
                    ? 28 + Math.random() * 18
                    : (8 + Math.random() * 20) * (isCinematic ? 0.4 + depth : 1),
            opacity: isHero
                ? 0.85 + Math.random() * 0.15
                : (0.3 + Math.random() * 0.7) * (isCinematic ? 0.4 + depth * 0.6 : 1),
            depth,
            thickness: isSparkle
                ? 2 + Math.random() * 2
                : isHero
                    ? 2.5 + Math.random() * 1.2
                    : 0.8 + (isCinematic ? depth * 1.2 : 0.7),
            isHero
        };
    });

    const splashList: Splash[] = [];

    function frame(now: number) {
        if (!activeCanvas || !ctx) return;

        const elapsed = now - activeStartTime;
        const fadeIn = Math.min(1, elapsed / 400);
        const fadeOut = elapsed > activeDurationMs - 600
            ? Math.max(0, (activeDurationMs - elapsed) / 600)
            : 1;
        const masterAlpha = fadeIn * fadeOut;

        ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);

        if (backdropTint) {
            const gradient = ctx.createLinearGradient(0, 0, 0, activeCanvas.height);
            gradient.addColorStop(0, `rgba(0, 10, 30, ${0.06 * masterAlpha})`);
            gradient.addColorStop(1, `rgba(0, 5, 20, ${0.16 * masterAlpha})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, activeCanvas.width, activeCanvas.height);
        }

        // Mist accumulation at top during cinematic showers
        if (isCinematic && elapsed > 200) {
            const mistProgress = Math.min(1, elapsed / 1500);
            const mistAlpha = 0.05 * mistProgress * masterAlpha;
            const mistGrad = ctx.createLinearGradient(0, 0, 0, 180);
            mistGrad.addColorStop(0, `rgba(255, 255, 255, ${mistAlpha})`);
            mistGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = mistGrad;
            ctx.fillRect(0, 0, activeCanvas.width, 180);
        }

        ctx.lineCap = "round";
        ctx.fillStyle = color;
        ctx.shadowColor = color;

        for (const drop of drops) {
            ctx.globalAlpha = drop.opacity * masterAlpha;
            ctx.shadowBlur = drop.isHero ? glow * 2.5 : glow;

            if (isSparkle) {
                const s = drop.length * 0.5;
                ctx.beginPath();
                ctx.moveTo(drop.x, drop.y - s);
                ctx.lineTo(drop.x + s, drop.y);
                ctx.lineTo(drop.x, drop.y + s);
                ctx.lineTo(drop.x - s, drop.y);
                ctx.closePath();
                ctx.fill();
            } else {
                if (isCinematic) {
                    const tailX = drop.x - drop.vx * 0.6;
                    const tailY = drop.y - drop.length;
                    const grad = ctx.createLinearGradient(drop.x, drop.y, tailX, tailY);
                    grad.addColorStop(0, color);
                    grad.addColorStop(0.45, color);
                    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    ctx.strokeStyle = grad;
                } else {
                    ctx.strokeStyle = color;
                }
                ctx.lineWidth = drop.thickness;
                ctx.beginPath();
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x - drop.vx * 0.6, drop.y - drop.length);
                ctx.stroke();
            }

            drop.x += drop.vx;
            drop.y += drop.vy;

            if (drop.y > activeCanvas.height) {
                if (splashes && !isSparkle && Math.random() < 0.75) {
                    splashList.push({
                        x: drop.x,
                        y: activeCanvas.height - 2,
                        vx: 0,
                        vy: 0,
                        life: 0,
                        maxLife: drop.isHero ? 700 : 500,
                        type: "ring"
                    });
                    const splashCount = drop.isHero
                        ? 5 + Math.floor(Math.random() * 3)
                        : 2 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < splashCount; i++) {
                        splashList.push({
                            x: drop.x,
                            y: activeCanvas.height - 4,
                            vx: (Math.random() - 0.5) * (drop.isHero ? 5 : 3),
                            vy: -1 - Math.random() * (drop.isHero ? 4 : 2.5),
                            life: 0,
                            maxLife: 350 + Math.random() * 250,
                            type: "particle"
                        });
                    }
                }
                drop.y = -drop.length;
                drop.x = Math.random() * activeCanvas.width;
            }
            if (drop.x > activeCanvas.width + 20) drop.x -= activeCanvas.width + 40;
            if (drop.x < -20) drop.x += activeCanvas.width + 40;
        }

        // Splash rendering
        ctx.strokeStyle = color;
        for (let i = splashList.length - 1; i >= 0; i--) {
            const sp = splashList[i];
            sp.life += 16;
            if (sp.life >= sp.maxLife) {
                splashList.splice(i, 1);
                continue;
            }
            const progress = sp.life / sp.maxLife;

            if (sp.type === "ring") {
                const r = progress * 22;
                const alpha = (1 - progress) * 0.55 * masterAlpha;
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = glow * 0.3;
                ctx.lineWidth = 1.4 * (1 - progress * 0.4);
                ctx.beginPath();
                ctx.ellipse(sp.x, sp.y, r, r * 0.32, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                sp.vy += 0.18;
                sp.x += sp.vx;
                sp.y += sp.vy;
                ctx.globalAlpha = (1 - progress) * 0.85 * masterAlpha;
                ctx.shadowBlur = glow * 0.4;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, 1.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        if (elapsed < activeDurationMs || splashList.length > 0) {
            activeAnimationFrame = requestAnimationFrame(frame);
        } else {
            cleanup();
        }
    }

    activeAnimationFrame = requestAnimationFrame(frame);
}

function cleanup() {
    if (activeAnimationFrame !== null) {
        cancelAnimationFrame(activeAnimationFrame);
        activeAnimationFrame = null;
    }
    if (activeCanvas) {
        activeCanvas.remove();
        activeCanvas = null;
    }
}

function onResize() {
    if (activeCanvas) {
        activeCanvas.width = window.innerWidth;
        activeCanvas.height = window.innerHeight;
    }
}

function isUserMentioned(payload: MessageCreatePayload, currentUserId: string): boolean {
    const msg = payload.message;

    if (msg.author?.id === currentUserId) return false;

    if (msg.mentions?.some(m => m.id === currentUserId)) {
        if (msg.referenced_message?.author?.id === currentUserId && !settings.store.triggerOnReply) {
            const hasOtherMention = msg.mentions.some(m => m.id !== currentUserId);
            if (!hasOtherMention) return false;
        }
        return true;
    }

    if (settings.store.triggerOnEveryone && msg.mention_everyone) return true;

    return false;
}

function onMessageCreate(payload: MessageCreatePayload) {
    try {
        const currentUser = UserStore.getCurrentUser();
        if (!currentUser) return;

        if (!isUserMentioned(payload, currentUser.id)) return;

        if (settings.store.onlyFocusedChannel) {
            const focused = SelectedChannelStore.getChannelId();
            if (payload.channelId !== focused) return;
        }

        startRain();
    } catch (err) {
        console.error("[MentionRain] failed to handle mention:", err);
    }
}

export default definePlugin({
    name: "MentionRain",
    description: "Cascading raindrops fall across your screen when you are mentioned. Cinematic parallax depth, soft glow, splash particles, optional sparkle style. Pure visual feedback for notifications.",
    tags: ["Mentions", "Notifications", "Appearance", "Fun"],
    authors: [
        { name: "stark", id: 0n }
    ],
    settings,

    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);
        window.addEventListener("resize", onResize);
    },

    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessageCreate);
        window.removeEventListener("resize", onResize);
        cleanup();
    }
});
