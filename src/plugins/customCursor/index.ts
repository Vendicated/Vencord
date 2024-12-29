import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";

const DEFAULT_CURSOR_URL = "https://savage-files-cdn.vercel.app/files/inspect/67713414ee4e8c87b96a0ffd";
const WHITE_CURSOR_URL = "https://savage-files-cdn.vercel.app/files/inspect/67714b81fd5c6c65af595fe6";
const BLACK_CURSOR_URL = "https://savage-files-cdn.vercel.app/files/inspect/67714c31fd5c6c65af5960c8";
const TABBY_CURSOR_URL = "https://savage-files-cdn.vercel.app/files/inspect/67714c38fd5c6c65af5960cc";

const settings = definePluginSettings({
    DefaultCursors: {
        description: "Default cursors",
        type: OptionType.SELECT,
        restartNeeded: true,
        options: [
            {
                label: "Tan Cat Paw",
                value: DEFAULT_CURSOR_URL,
                default: true
            },
            {
                label: "White Cat Paw",
                value: WHITE_CURSOR_URL
            },
            {
                label: "Black Cat Paw",
                value: BLACK_CURSOR_URL
            },
            {
                label: "Tabby Cat Paw",
                value: TABBY_CURSOR_URL,
            },
            {
                label: "Custom URL",
                value: "custom",
            }
        ],
    },
    customCursorURL: {
        description: "Custom Cursor URL (Only used if 'Custom URL' is selected)",
        type: OptionType.STRING,
        restartNeeded: true,
        default: "",
    },
    cursorSize: {
        description: "Cursor Size",
        type: OptionType.NUMBER,
        restartNeeded: true,
        default: 24,
    },
});

export default definePlugin({
    name: "CustomCursor",
    description: "Replace the default cursor with a custom cursor",
    settings,
    authors: [Devs.HaddajiDev],

    start() {
        const cursorEl = document.createElement("div");
        cursorEl.id = "customCursor";
        document.body.appendChild(cursorEl);

        const styleTag = document.createElement("style");
        styleTag.id = "customCursorStyles";
        styleTag.innerHTML = `
            * { cursor: none !important; }
            #customCursor { z-index: 9999 !important; }
        `;
        document.head.appendChild(styleTag);

        const updateCursor = () => {
            const selectedCursorURL = settings.store.DefaultCursors;
            let cursorURL = selectedCursorURL;

            if (selectedCursorURL === "custom") {
                cursorURL = settings.store.customCursorURL && settings.store.customCursorURL.trim()
                    ? settings.store.customCursorURL
                    : DEFAULT_CURSOR_URL;
            }
            else if (!cursorURL) {
                cursorURL = DEFAULT_CURSOR_URL;
            }

            const cursorSize = settings.store.cursorSize;

            Object.assign(cursorEl.style, {
                width: `${cursorSize}px`,
                height: `${cursorSize}px`,
                position: "fixed",
                pointerEvents: "none",
                backgroundImage: `url(${DEFAULT_CURSOR_URL})`,
                backgroundSize: "contain",
                zIndex: "9999",
                transform: "translate(-50%, -50%)",
            });

            const img = new Image();

            img.onload = () => {
                Object.assign(cursorEl.style, {
                    backgroundImage: `url(${cursorURL})`,
                });
            };

            img.onerror = () => {
                Object.assign(cursorEl.style, {
                    backgroundImage: `url(${DEFAULT_CURSOR_URL})`,
                });
            };

            img.src = cursorURL;

            //check for invalid links
            setTimeout(() => {
                if (img.complete === false) {
                    Object.assign(cursorEl.style, {
                        backgroundImage: `url(${DEFAULT_CURSOR_URL})`,
                    });
                }
            }, 5000);
        };

        const updateCursorPosition = (event) => {
            cursorEl.style.left = `${event.clientX}px`;
            cursorEl.style.top = `${event.clientY}px`;
        };

        updateCursor();

        document.addEventListener("mousemove", updateCursorPosition);

        this._cursorEl = cursorEl;
        this._updateCursorPosition = updateCursorPosition;
        this._styleTag = styleTag;
    },

    stop() {
        document.body.style.cursor = "default";
        this._cursorEl?.remove();
        if (this._updateCursorPosition) {
            document.removeEventListener("mousemove", this._updateCursorPosition);
        }
        this._styleTag?.remove();
    },
});
