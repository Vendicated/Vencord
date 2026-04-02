/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    language: {
        type: OptionType.SELECT,
        description: "Language / Idioma",
        default: "en",
        options: [
            { label: "English", value: "en" },
            { label: "Português (BR)", value: "pt-br" },
        ],
    },
    showGuildToggle: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show separate button to hide guild list / Mostrar botão separado para ocultar servidores",
    },
    showSidebarToggle: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show separate button to hide sidebar / Mostrar botão separado para ocultar barra lateral",
    },
});

const i18n = {
    "en": {
        focusOn: "Focus Mode",
        focusOff: "Exit Focus Mode",
        guildShow: "Show servers",
        guildHide: "Hide servers",
        sidebarShow: "Show sidebar",
        sidebarHide: "Hide sidebar",
        description: "Hide the server list and sidebar with one click to focus on chat/call. Optional extra buttons in settings.",
    },
    "pt-br": {
        focusOn: "Modo foco",
        focusOff: "Sair do modo foco",
        guildShow: "Mostrar servidores",
        guildHide: "Ocultar servidores",
        sidebarShow: "Mostrar barra lateral",
        sidebarHide: "Ocultar barra lateral",
        description: "Oculta a lista de servidores e barra lateral com um clique para focar no chat/call. Botões extras opcionais nas configurações.",
    },
};

function t(key: keyof typeof i18n["en"]): string {
    const lang = settings.store.language as keyof typeof i18n;
    return i18n[lang]?.[key] ?? i18n["en"][key];
}

let styleEl: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;

// State
let focusHidden = false;
let guildHidden = false;
let sidebarHidden = false;

// Buttons
let focusBtn: HTMLDivElement | null = null;
let guildBtn: HTMLDivElement | null = null;
let sidebarBtn: HTMLDivElement | null = null;

function applyCSS() {
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "vc-focusMode-style";
    }

    const hideGuild = focusHidden || guildHidden;
    const hideSidebar = focusHidden || sidebarHidden;

    const rules: string[] = [];

    if (hideGuild) {
        rules.push(`
            [class*="guilds_"] {
                width: 0 !important;
                min-width: 0 !important;
                flex-basis: 0 !important;
                overflow: hidden !important;
                padding: 0 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: width 0.2s ease, opacity 0.15s ease;
            }
        `);
    }

    if (hideSidebar) {
        rules.push(`
            [class*="sidebarList_"],
            [class*="sidebarListRounded_"] {
                width: 0 !important;
                min-width: 0 !important;
                flex-basis: 0 !important;
                overflow: hidden !important;
                padding: 0 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: width 0.2s ease, opacity 0.15s ease;
            }
            [class*="panels_"] {
                display: none !important;
            }
        `);
    }

    if (rules.length > 0) {
        styleEl.textContent = rules.join("\n");
        if (!styleEl.parentElement) document.head.appendChild(styleEl);
    } else {
        styleEl.remove();
    }
}

function makeBtn(className: string, label: string, onClick: () => void): HTMLDivElement {
    const el = document.createElement("div");
    el.className = className;
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", label);

    Object.assign(el.style, {
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        width: "28px",
        height: "28px",
        borderRadius: "4px",
        cursor: "pointer",
        color: "#ffffff",
        fontSize: "11px",
        fontWeight: "700",
        fontFamily: "monospace",
        lineHeight: "1",
        transition: "background-color 0.15s ease",
        marginLeft: "4px",
        flexShrink: "0",
    });

    el.addEventListener("click", onClick);
    el.addEventListener("mouseenter", () => { el.style.filter = "brightness(0.85)"; });
    el.addEventListener("mouseleave", () => { el.style.filter = "none"; });

    return el;
}

function updateButtons() {
    if (focusBtn) {
        focusBtn.textContent = focusHidden ? "⊞" : "⊟";
        focusBtn.title = focusHidden ? t("focusOff") : t("focusOn");
        focusBtn.style.backgroundColor = focusHidden ? "#ed4245" : "#5865f2";
    }
    if (guildBtn) {
        guildBtn.textContent = guildHidden || focusHidden ? "G+" : "G";
        guildBtn.title = (guildHidden || focusHidden) ? t("guildShow") : t("guildHide");
        guildBtn.style.backgroundColor = (guildHidden || focusHidden) ? "#ed4245" : "#3ba55c";
    }
    if (sidebarBtn) {
        sidebarBtn.textContent = sidebarHidden || focusHidden ? "S+" : "S";
        sidebarBtn.title = (sidebarHidden || focusHidden) ? t("sidebarShow") : t("sidebarHide");
        sidebarBtn.style.backgroundColor = (sidebarHidden || focusHidden) ? "#ed4245" : "#faa61a";
    }
}

function toggleFocus() {
    focusHidden = !focusHidden;
    applyCSS();
    updateButtons();
}

function toggleGuild() {
    guildHidden = !guildHidden;
    applyCSS();
    updateButtons();
}

function toggleSidebar() {
    sidebarHidden = !sidebarHidden;
    applyCSS();
    updateButtons();
}

function injectButtons() {
    const leading = document.querySelector<HTMLElement>("[class*='leading_']");
    if (!leading) return;

    // Focus button (always present)
    if (!leading.querySelector(".vc-focusMode-btn")) {
        focusBtn = makeBtn("vc-focusMode-btn", "Focus Mode", toggleFocus);
        updateButtons();
        leading.appendChild(focusBtn);
    }

    // Guild toggle (optional)
    if (settings.store.showGuildToggle && !leading.querySelector(".vc-focusMode-guild")) {
        guildBtn = makeBtn("vc-focusMode-guild", "Toggle Guild List", toggleGuild);
        updateButtons();
        leading.appendChild(guildBtn);
    }
    if (!settings.store.showGuildToggle && leading.querySelector(".vc-focusMode-guild")) {
        leading.querySelector(".vc-focusMode-guild")?.remove();
        guildBtn = null;
    }

    // Sidebar toggle (optional)
    if (settings.store.showSidebarToggle && !leading.querySelector(".vc-focusMode-sidebar")) {
        sidebarBtn = makeBtn("vc-focusMode-sidebar", "Toggle Sidebar", toggleSidebar);
        updateButtons();
        leading.appendChild(sidebarBtn);
    }
    if (!settings.store.showSidebarToggle && leading.querySelector(".vc-focusMode-sidebar")) {
        leading.querySelector(".vc-focusMode-sidebar")?.remove();
        sidebarBtn = null;
    }
}

function startObserver() {
    observer = new MutationObserver(() => {
        if (!document.querySelector(".vc-focusMode-btn")) {
            focusBtn = null;
            guildBtn = null;
            sidebarBtn = null;
            injectButtons();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

export default definePlugin({
    name: "FocusMode",
    description: "Hide server list & sidebar with one click to focus on chat/call.",
    authors: [Devs.ferpgshy],
    settings,

    start() {
        startObserver();
        injectButtons();
    },

    stop() {
        styleEl?.remove();
        styleEl = null;
        observer?.disconnect();
        observer = null;
        focusBtn?.remove();
        guildBtn?.remove();
        sidebarBtn?.remove();
        focusBtn = null;
        guildBtn = null;
        sidebarBtn = null;
        focusHidden = false;
        guildHidden = false;
        sidebarHidden = false;
    },
});
