/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { createRoot, React } from "@webpack/common";
import type { Root } from "react-dom/client";

const SnowfallCSS = `
#snowfield {
    pointer-events: none;
    user-select: none;
    z-index: 100000;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
}
.snowflake {
    position: absolute;
    color: #fff;
    line-height: 1;
    -webkit-font-smoothing: antialiased;
}
.snowflake-solid {
    border-radius: 50%;
    background: #ffffff;
}
.snowflake-image {
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5));
}
`;

// SVG snowflake images as data URIs
const SNOWFLAKE_SVGS = [
    // 6-pointed snowflake
    "data:image/svg+xml," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <path fill="white" d="M50,10 L55,45 L50,50 L45,45 Z M50,90 L55,55 L50,50 L45,55 Z M10,50 L45,55 L50,50 L45,45 Z M90,50 L55,55 L50,50 L55,45 Z M25,25 L45,45 L50,40 L40,30 Z M75,75 L55,55 L50,60 L60,70 Z M75,25 L55,45 L60,50 L70,40 Z M25,75 L45,55 L40,50 L30,60 Z"/>
            <circle cx="50" cy="50" r="8" fill="white"/>
        </svg>
    `),
    // 8-pointed star snowflake
    "data:image/svg+xml," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <g fill="white">
                <rect x="47" y="5" width="6" height="90" rx="2"/>
                <rect x="5" y="47" width="90" height="6" rx="2"/>
                <rect x="47" y="5" width="6" height="90" rx="2" transform="rotate(45 50 50)"/>
                <rect x="47" y="5" width="6" height="90" rx="2" transform="rotate(-45 50 50)"/>
                <circle cx="50" cy="50" r="10" fill="white"/>
            </g>
        </svg>
    `),
    // Discord snowflake
    "data:image/svg+xml," + encodeURIComponent(`
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <symbol id="discord" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                </symbol>
            </defs>
            <!-- snowflake arms -->
            <line x1="100" y1="100" x2="150" y2="100" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="100" y1="100" x2="125" y2="143.3" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="100" y1="100" x2="75" y2="143.3" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="100" y1="100" x2="50" y2="100" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="100" y1="100" x2="75" y2="56.7" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="100" y1="100" x2="125" y2="56.7" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
            <!-- circle mask -->
            <mask id="logoMask">
                <rect width="200" height="200" fill="white"/>
                <circle cx="150" cy="100" r="18" fill="black"/> <!-- right -->
                <circle cx="125" cy="143.3" r="18" fill="black"/> <!-- top-right -->
                <circle cx="75" cy="143.3" r="18" fill="black"/> <!-- top-left -->
                <circle cx="50" cy="100" r="18" fill="black"/> <!-- left -->
                <circle cx="75" cy="56.7" r="18" fill="black"/> <!-- bottom-left -->
                <circle cx="125" cy="56.7" r="18" fill="black"/> <!-- bottom-right -->
            </mask>
            <!-- circle behind all elements -->
            <circle cx="100" cy="100" r="50" stroke="#FFF" stroke-width="1.5" fill="none" stroke-linecap="round" mask="url(#logoMask)" />
            <use href="#discord" fill="#FFF" x="135" y="85" width="30" height="30" transform="rotate(90, 150, 100)"/>
            <use href="#discord" fill="#FFF" x="110" y="128.3" width="30" height="30" transform="rotate(150, 125, 143.3)"/>
            <use href="#discord" fill="#FFF" x="60" y="128.3" width="30" height="30" transform="rotate(210, 75, 143.3)"/>
            <use href="#discord" fill="#FFF" x="35" y="85" width="30" height="30" transform="rotate(270, 50, 100)"/>
            <use href="#discord" fill="#FFF" x="60" y="41.7" width="30" height="30" transform="rotate(330, 75, 56.7)"/>
            <use href="#discord" fill="#FFF" x="110" y="41.7" width="30" height="30" transform="rotate(30, 125, 56.7)"/>
        </svg>
    `),
];

const settings = definePluginSettings({
    typeOfSnow: {
        description: "Change the type of snow displayed (Affects performance).",
        type: OptionType.SELECT,
        options: [
            { label: "Solid (Highest Performance)", value: "solid" },
            { label: "Text (Medium Performance)", value: "text", default: true },
            { label: "Image (Lowest Performance)", value: "image" }
        ],
    },
    maxSize: {
        description: "Maximum snowflake size",
        type: OptionType.SLIDER,
        default: 30,
        markers: [10, 20, 30, 40, 50]
    },
    speed: {
        description: "Snowfall speed (higher = faster fall)",
        type: OptionType.SLIDER,
        default: 50,
        markers: [50, 100, 200, 300, 400, 500]
    },
    flakesPerSecond: {
        description: "Snowflakes per second (higher = denser snowfall)",
        type: OptionType.SLIDER,
        default: 5,
        markers: [1, 5, 10, 20, 40, 60],
        min: 1,
        max: 60,
    }
});

class CopleSnow {
    private static winWidth = window.innerWidth;
    private static winHeight = window.innerHeight;

    static readonly defaultOptions = {
        minSize: 10,
        maxSize: 30,
        type: "text" as "text" | "solid" | "image",
        content: "❄" as string | string[],
        fadeOut: true,
        autoplay: true,
        interval: 200
    };

    private static cssPrefix(propertyName: string): string | null {
        const capitalize = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
        const tempDiv = document.createElement("div");
        const { style } = tempDiv;
        const prefixes = ["Webkit", "Moz", "ms", "O"];

        if (propertyName in style) return propertyName;
        for (const prefix of prefixes) {
            const name = prefix + capitalize;
            if (name in style) return name;
        }
        return null;
    }

    private static readonly cssPrefixedNames = {
        transform: this.cssPrefix("transform"),
        transition: this.cssPrefix("transition")
    };

    private static readonly transitionEndEvent =
        { WebkitTransition: "webkitTransitionEnd", OTransition: "oTransitionEnd", Moztransition: "transitionend", transition: "transitionend" }[
        this.cssPrefixedNames.transition ?? "transition"
        ] ?? "transitionend";

    private static random(min: number, max: number, deviation?: number): number {
        if (deviation !== undefined) {
            deviation *= max;
            max += deviation;
            min = max - deviation;
        } else {
            min = min || 0;
        }
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    private static setStyle(element: HTMLElement, rules: Record<string, string | number>) {
        for (const [name, value] of Object.entries(rules)) {
            const cssName = CopleSnow.cssPrefixedNames[name as keyof typeof CopleSnow.cssPrefixedNames] || name;
            (element.style as any)[cssName] = value;
        }
    }

    private options = { ...CopleSnow.defaultOptions };
    private queue: HTMLElement[] = [];
    private $snowfield: HTMLDivElement;
    private timer: number | null = null;
    public playing = false;

    constructor(newOptions: Partial<typeof CopleSnow.defaultOptions> = {}) {
        Object.assign(this.options, newOptions);

        this.$snowfield = document.createElement("div");
        this.$snowfield.id = "snowfield";
        document.body.appendChild(this.$snowfield);

        const updateSize = () => {
            CopleSnow.winHeight = window.innerHeight;
            CopleSnow.winWidth = window.innerWidth;
        };
        window.addEventListener("resize", updateSize);
        (this as any)._resizeHandler = updateSize;

        this.$snowfield.addEventListener(CopleSnow.transitionEndEvent, e => {
            const snowflake = e.target as HTMLElement;
            if (snowflake.classList.contains("snowflake")) {
                this.$snowfield.removeChild(snowflake);
                this.queue.push(snowflake);
            }
        });

        const handleVisibilityChange = () => {
            if (document.hidden) this.stop();
            else this.play();
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        (this as any)._visibilityHandler = handleVisibilityChange;

        if (this.options.autoplay) this.play();
    }

    private createSnowflake(): HTMLElement {
        const { type, content } = this.options as { type: "text" | "image" | "solid"; content: string | string[]; };
        const cntLength = Array.isArray(content) ? content.length : 1;

        let snowflake: HTMLElement;

        if (type === "image") {
            snowflake = document.createElement("img");
            const src = typeof content === "string"
                ? content
                : content[Math.floor(Math.random() * cntLength)];
            (snowflake as HTMLImageElement).src = src;
            snowflake.setAttribute("draggable", "false");
        } else {
            snowflake = document.createElement("div");
            if (type === "text") {
                const textContent = typeof content === "string"
                    ? content
                    : content[Math.floor(Math.random() * cntLength)];
                snowflake.textContent = textContent;
            }
            // if type is solid we don't need to set content
        }

        snowflake.className = `snowflake snowflake-${type}`;
        (snowflake as any).dataset.type = type;

        return snowflake;
    }

    private animateSnowflake() {
        const { winWidth, winHeight } = CopleSnow;
        const size = CopleSnow.random(this.options.minSize, this.options.maxSize);
        const top = -2 * size;
        const left = CopleSnow.random(0, winWidth - size);
        const opacity = CopleSnow.random(5, 10) / 10;
        const angle = CopleSnow.random(0, winHeight * 0.8, 1);
        const translateX = CopleSnow.random(-100, 100);
        const translateY = winHeight + size * 2;
        const baseSpeed = settings.store.speed;
        const duration = (winHeight * 10) / (baseSpeed / 50);
        let snowflake: HTMLElement;
        if (this.queue.length > 0) {
            const reused = this.queue.shift()!;
            if ((reused.dataset.type as string) !== this.options.type) {
                snowflake = this.createSnowflake();
            } else {
                snowflake = reused;
                if (this.options.type === "text") {
                    const { content } = this.options;
                    if (Array.isArray(content)) {
                        snowflake.textContent = content[Math.floor(Math.random() * content.length)];
                    }
                } else if (this.options.type === "image") {
                    const { content } = this.options;
                    if (Array.isArray(content)) {
                        (snowflake as HTMLImageElement).src = content[Math.floor(Math.random() * content.length)];
                    }
                }
            }
        } else {
            snowflake = this.createSnowflake();
        }

        const styleRules: Record<string, string | number> = {
            top: `${top}px`,
            left: `${left}px`,
            opacity: opacity,
            transform: "none",
            transition: `${duration}ms linear`
        };

        switch (this.options.type) {
            case "solid":
                styleRules.width = styleRules.height = `${size}px`;
                break;
            case "text":
                styleRules.fontSize = `${size}px`;
                break;
            case "image":
                styleRules.width = `${size}px`;
                styleRules.height = "auto";
                break;
        }

        CopleSnow.setStyle(snowflake, styleRules);
        this.$snowfield.appendChild(snowflake);

        setTimeout(() => {
            CopleSnow.setStyle(snowflake, {
                transform: `translate(${translateX}px, ${translateY}px) rotate(${angle}deg)`,
                opacity: this.options.fadeOut ? 0 : opacity
            });
        }, 100);
    }

    play() {
        if (this.playing) return;
        this.timer = window.setInterval(() => this.animateSnowflake(), this.options.interval);
        this.playing = true;
    }

    stop() {
        if (!this.playing) return;
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.playing = false;
    }

    destroy() {
        this.stop();
        if (this.$snowfield.parentNode) {
            this.$snowfield.remove();
        }
        window.removeEventListener("resize", (this as any)._resizeHandler);
        document.removeEventListener("visibilitychange", (this as any)._visibilityHandler);
    }

    updateOptions(newOptions: Partial<typeof CopleSnow.defaultOptions>) {
        Object.assign(this.options, newOptions);
    }
}

const SnowfallManager: React.FC = () => {
    const snowRef = React.useRef<CopleSnow | null>(null);
    const styleRef = React.useRef<HTMLStyleElement | null>(null);

    React.useEffect(() => {
        // Inject CSS
        const styleEl = document.createElement("style");
        styleEl.id = "snowfall-styles";
        styleEl.textContent = SnowfallCSS;
        document.head.appendChild(styleEl);
        styleRef.current = styleEl;

        // Get initial snow type from settings
        const snowType = settings.store.typeOfSnow as "text" | "solid" | "image";
        const snowOptions: Partial<typeof CopleSnow.defaultOptions> = {
            autoplay: false,
            type: snowType,
            maxSize: settings.store.maxSize,
            interval: 1000 / settings.store.flakesPerSecond
        };

        snowOptions.interval = settings.store.speed;

        // Set content based on type
        if (snowType === "image") {
            snowOptions.content = SNOWFLAKE_SVGS;
        }

        // Create snow instance with settings
        const snow = new CopleSnow(snowOptions);
        snowRef.current = snow;

        const blurHandler = () => snow.stop();
        const focusHandler = () => {
            if (document.hasFocus()) snow.play();
        };

        window.addEventListener("blur", blurHandler);
        window.addEventListener("focus", focusHandler);

        if (document.hasFocus()) {
            snow.play();
        }

        // Custom listener for settings changes (we don't have a built-in one)
        let lastSettings = {
            type: settings.store.typeOfSnow as "text" | "solid" | "image",
            maxSize: settings.store.maxSize,
            speed: settings.store.speed,
            flakesPerSecond: settings.store.flakesPerSecond
        };

        const settingsInterval = setInterval(() => {
            const newSettings = {
                type: settings.store.typeOfSnow as "text" | "solid" | "image",
                maxSize: settings.store.maxSize,
                speed: settings.store.speed,
                flakesPerSecond: settings.store.flakesPerSecond
            };

            if (Object.keys(newSettings).some(k => newSettings[k as keyof typeof newSettings] !== lastSettings[k as keyof typeof lastSettings])) {
                lastSettings = newSettings;

                const updateOptions: Partial<typeof CopleSnow.defaultOptions> = {
                    type: newSettings.type,
                    maxSize: newSettings.maxSize,
                    interval: 1000 / newSettings.flakesPerSecond
                };

                if (newSettings.type === "image") updateOptions.content = SNOWFLAKE_SVGS;
                else if (newSettings.type === "text") updateOptions.content = "❄";

                snow.updateOptions(updateOptions);
            }
        }, 5000);

        return () => {
            snow.destroy();
            snowRef.current = null;

            window.removeEventListener("blur", blurHandler);
            window.removeEventListener("focus", focusHandler);

            clearInterval(settingsInterval);

            if (styleEl.parentNode) {
                styleEl.remove();
            }
            styleRef.current = null;

            const snowfield = document.getElementById("snowfield");
            if (snowfield) snowfield.remove();
        };
    }, []);

    return null;
};

let snowRoot: Root | null = null;
let container: HTMLDivElement | null = null;

export default definePlugin({
    name: "Snowfall",
    description: "Let it snow on Discord! Ported from the BetterDiscord plugin by square.",
    authors: [EquicordDevs.ZcraftElite, EquicordDevs.square],

    settingsAboutComponent: () => (
        <>
            <Heading>Information</Heading>
            <Paragraph>
                This plugin adds a christmas-y snowfall effect on top of Discord's interface.
                You can change the type of snow in the settings below.
                <br /><br />
                NOTE: While on most computers this plugin will not impact performance any more than your average Equicord extension,
                it may cause some lag on lower end systems.
            </Paragraph>
        </>
    ),

    settings,

    start() {
        container = document.createElement("div");
        container.id = "snowfall-plugin-container";
        document.body.appendChild(container);

        snowRoot = createRoot(container);
        snowRoot.render(<SnowfallManager />);
    },

    stop() {
        if (snowRoot) {
            snowRoot.unmount();
            snowRoot = null;
        }
        if (container) {
            if (container.parentNode) container.remove();
            container = null;
        }
    }
});
