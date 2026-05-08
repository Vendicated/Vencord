import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { React, ColorPicker } from "@webpack/common";


const STYLE_ID = "smooth-typing-style";
const CARET_ID = "smooth-typing-caret";

let caretEl: HTMLDivElement | null = null;
let selectionInterval: ReturnType<typeof setInterval> | null = null;

const settings = definePluginSettings({
    smoothCaret: {
        type: OptionType.BOOLEAN,
        description: "Enable smooth caret (cursor) animation",
        default: true,
        onChange() { applySettings(); }
    },
    smoothChars: {
        type: OptionType.BOOLEAN,
        description: "Enable smooth character fade-in while typing",
        default: true,
        onChange() { applySettings(); }
    },
    caretSpeed: {
        type: OptionType.NUMBER,
        description: "Caret transition speed (ms) — lower = faster",
        default: 80,
        onChange() { applySettings(); }
    },
    fadeSpeed: {
        type: OptionType.NUMBER,
        description: "Character fade-in speed (ms) — lower = faster",
        default: 80,
        onChange() { applySettings(); }
    },
    caretColor: {
    type: OptionType.COMPONENT,
    description: "Caret color",
    default: 0xffffff,
    component: () => (
        <ColorPicker
            color={settings.store.caretColor}
            onChange={color => {
                settings.store.caretColor = color;
                applySettings();
            }}
            showEyeDropper={true}
        />
    )
},
    smoothScrollbar: {
        type: OptionType.BOOLEAN,
        description: "Enable smooth scrollbar in the text area",
        default: true,
        onChange() { applySettings(); }
    },
    scrollbarColor: {
        type: OptionType.STRING,
        description: "Scrollbar color",
        default: "#3b3b3b",
        onChange() { applySettings(); }
    }
});

function getCaretColor() {
    const color = settings.store.caretColor;
    if (!color) return "var(--text-normal, #fff)";
    return `#${color.toString(16).padStart(6, "0")}`;
}

function injectCSS() {
    removeCSS();
    const style = document.createElement("style");
    style.id = STYLE_ID;
    const { fadeSpeed, smoothScrollbar, scrollbarColor } = settings.store;

    style.textContent = `
        /* Hide original caret */
        [class*="slateTextArea"] * {
            caret-color: transparent !important;
        }

        /* Smooth char fade-in */
        [class*="slateTextArea"] span[data-slate-string="true"] {
            animation: smoothCharIn ${fadeSpeed}ms ease-out both;
        }

        @keyframes smoothCharIn {
            from {
                opacity: 0.6;
                filter: blur(0.4px);
            }
            to {
                opacity: 1;
                filter: blur(0px);
            }
        }

        /* Custom caret */
        #${CARET_ID} {
            position: fixed;
            width: 2px;
            border-radius: 2px;
            background: ${getCaretColor()};
            pointer-events: none;
            z-index: 9999;
            animation: caretBlink 1s step-end infinite;
            transition: left var(--caret-speed, 80ms) cubic-bezier(0.2, 0, 0, 1),
                        top var(--caret-speed, 80ms) cubic-bezier(0.2, 0, 0, 1),
                        height var(--caret-speed, 80ms) ease,
                        background 300ms ease;
        }

        @keyframes caretBlink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0; }
        }

        ${smoothScrollbar ? `
        /* Smooth Scrollbar */
        [class*="slateTextArea"] {
            overflow-y: auto;
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: ${scrollbarColor} transparent;
        }

        [class*="slateTextArea"]::-webkit-scrollbar {
            width: 4px;
        }

        [class*="slateTextArea"]::-webkit-scrollbar-track {
            background: transparent;
        }

        [class*="slateTextArea"]::-webkit-scrollbar-thumb {
            background: ${scrollbarColor};
            border-radius: 4px;
            transition: background 200ms ease;
        }

        [class*="slateTextArea"]::-webkit-scrollbar-thumb:hover {
            background: ${scrollbarColor}cc;
        }
        ` : ""}
    `;
    document.head.appendChild(style);
}

function removeCSS() {
    document.getElementById(STYLE_ID)?.remove();
}

function createCaret() {
    removeCaret();
    caretEl = document.createElement("div");
    caretEl.id = CARET_ID;
    document.body.appendChild(caretEl);
}

function removeCaret() {
    document.getElementById(CARET_ID)?.remove();
    caretEl = null;
}

function updateCaretPosition() {
    if (!caretEl) return;

    // Check that the focus is within the chat input
    const focused = document.activeElement;
    const isInChat = focused?.closest("[class*='slateTextArea']") || 
                     focused?.closest("[class*='textArea']");
    
    if (!isInChat) {
        caretEl.style.display = "none";
        return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);

    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return;

    const node = sel.anchorNode;
    if (!node) return;
    const parent = node.parentElement?.closest("[class*='slateTextArea']");
    if (!parent) {
        caretEl.style.display = "none";
        return;
    }

    caretEl.style.display = "block";
    caretEl.style.left = `${rect.left}px`;
    caretEl.style.top = `${rect.top}px`;
    caretEl.style.height = `${rect.height || 20}px`;
}   

function startTracking() {
    stopTracking();
    selectionInterval = setInterval(updateCaretPosition, 16);
    document.addEventListener("selectionchange", updateCaretPosition);
    document.addEventListener("keydown", resetBlinkOnKey);
}

function stopTracking() {
    if (selectionInterval) {
        clearInterval(selectionInterval);
        selectionInterval = null;
    }
    document.removeEventListener("selectionchange", updateCaretPosition);
    document.removeEventListener("keydown", resetBlinkOnKey);
}

function resetBlinkOnKey() {
    if (!caretEl) return;
    caretEl.style.animation = "none";
    void caretEl.offsetHeight;
    caretEl.style.animation = "";
}

function applySettings() {
    const { smoothCaret, caretSpeed } = settings.store;

    document.documentElement.style.setProperty("--caret-speed", `${caretSpeed}ms`);

    injectCSS();

    if (smoothCaret) {
        createCaret();
        startTracking();
    } else {
        removeCaret();
        stopTracking();
    }
}

function cleanup() {
    removeCSS();
    removeCaret();
    stopTracking();
}

export default definePlugin({
    name: "SmoothTyping",
    description: "Smooth caret movement, character animation, change color cursor typing.",
    authors: [Devs.cute],
    settings,

    start() {
        applySettings();
    },

    stop() {
        cleanup();
    }
});