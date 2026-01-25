/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { addSettingsPanelButton, DeafenIcon, removeSettingsPanelButton } from "../philsPluginLibrary";

export let fakeD = false;

function mute() {
    (document.querySelector('[aria-label="Mute"]') as HTMLElement)?.click();
}

function deafen() {
    (document.querySelector('[aria-label="Deafen"]') as HTMLElement)?.click();
}

const settings = definePluginSettings({
    hideIcon: {
        type: OptionType.BOOLEAN,
        description: "",
        default: false,
        onChange: (value: boolean) => {
            if (value) {
                removeSettingsPanelButton("faked");
            } else {
                addSettingsPanelButton({
                    name: "faked",
                    icon: DeafenIcon,
                    tooltipText: "Fake Deafen",
                    onClick: toggleFakeDeafen
                });
            }
        }
    },
    keybind: {
        type: OptionType.SELECT,
        description: "",
        options: [
            { label: "F1", value: "f1", default: false },
            { label: "F2", value: "f2", default: false },
            { label: "F3", value: "f3", default: false },
            { label: "F4", value: "f4", default: false },
            { label: "F5", value: "f5", default: false },
            { label: "F6", value: "f6", default: false },
            { label: "F7", value: "f7", default: false },
            { label: "F8", value: "f8", default: false },
            { label: "F9", value: "f9", default: true },
            { label: "F10", value: "f10", default: false },
            { label: "F11", value: "f11", default: false },
            { label: "F12", value: "f12", default: false },
            { label: "Ctrl+D", value: "ctrl+d", default: false },
            { label: "Ctrl+Shift+D", value: "ctrl+shift+d", default: false },
            { label: "Alt+D", value: "alt+d", default: false },
            { label: "Alt+F", value: "alt+f", default: false },
            { label: "Ctrl+Alt+D", value: "ctrl+alt+d", default: false },
            { label: "Shift+F9", value: "shift+f9", default: false },
            { label: "Shift+F10", value: "shift+f10", default: false },
            { label: "Shift+F11", value: "shift+f11", default: false },
            { label: "Shift+F12", value: "shift+f12", default: false }
        ]
    },
    muteUponFakeDeafen: {
        type: OptionType.BOOLEAN,
        description: "",
        default: false
    },
    mute: {
        type: OptionType.BOOLEAN,
        description: "",
        default: true
    },
    deafen: {
        type: OptionType.BOOLEAN,
        description: "",
        default: true
    },
    cam: {
        type: OptionType.BOOLEAN,
        description: "",
        default: false
    },
    useCustomKeybind: {
        type: OptionType.BOOLEAN,
        description: "",
        default: false,
        onChange: () => {
            setupKeybindListener();
        }
    },
    customKeybind: {
        type: OptionType.STRING,
        description: "",
        default: "",
        disabled: () => !settings.store.useCustomKeybind,
        onChange: () => {
            setupKeybindListener();
        }
    }
});

function toggleFakeDeafen() {
    fakeD = !fakeD;
    console.log("[FakeDeafen] Toggle state:", fakeD ? "ON" : "OFF");
    
    
    const deafenBtn = document.querySelector('[aria-label="Deafen"]') as HTMLElement;
    if (deafenBtn) {
        deafenBtn.click();
        
        setTimeout(() => deafenBtn.click(), 250);
    }

    
    if (fakeD && settings.store.muteUponFakeDeafen) {
        setTimeout(mute, 300);
    }
}

let keydownListener: ((e: KeyboardEvent) => void) | null = null;

function parseKeybind(keybind: string): { ctrl: boolean; shift: boolean; alt: boolean; key: string } {
    const parts = keybind.toLowerCase().split("+");
    return {
        ctrl: parts.includes("ctrl") || parts.includes("control"),
        shift: parts.includes("shift"),
        alt: parts.includes("alt"),
        key: parts[parts.length - 1]
    };
}

function setupKeybindListener() {
    if (keydownListener) {
        document.removeEventListener("keydown", keydownListener);
    }

    keydownListener = (e: KeyboardEvent) => {
        
        const keybindValue = settings.store.useCustomKeybind && settings.store.customKeybind
            ? settings.store.customKeybind
            : settings.store.keybind || "f9";
        
        const keybind = parseKeybind(keybindValue);
        
        const ctrlMatch = keybind.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = keybind.shift === e.shiftKey;
        const altMatch = keybind.alt === e.altKey;
        const keyMatch = e.key.toLowerCase() === keybind.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
            e.preventDefault();
            toggleFakeDeafen();
        }
    };

    document.addEventListener("keydown", keydownListener);
}

export default definePlugin({
    name: "FakeDeafen",
    description: "You're deafened but you're not.",
    dependencies: ["PhilsPluginLibrary"],
    authors: [Devs.pluckerpilple],

    patches: [
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+),self_video:([^,]+)/,
                replace: "self_mute:$self.toggle($1, 'mute'),self_deaf:$self.toggle($2, 'deaf'),self_video:$self.toggle($3, 'video')"
            }
        }
    ],

    settings,
    toggle: (au: any, what: string) => {
        if (fakeD === false)
            return au;
        else
            switch (what) {
                case "mute": return settings.store.mute;
                case "deaf": return settings.store.deafen;
                case "video": return settings.store.cam;
            }
    },

    start() {
        
        if (!settings.store.hideIcon) {
            addSettingsPanelButton({
                name: "faked",
                icon: DeafenIcon,
                tooltipText: "Fake Deafen",
                onClick: toggleFakeDeafen
            });
        }

        
        setupKeybindListener();
    },

    stop() {
        removeSettingsPanelButton("faked");
        
        
        if (keydownListener) {
            document.removeEventListener("keydown", keydownListener);
            keydownListener = null;
        }
    }
});