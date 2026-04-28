/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { addSettingsPanelButton, DeafenIcon, MuteIcon, removeSettingsPanelButton } from "@plugins/philsPluginLibrary";
import { camicon } from "@plugins/philsPluginLibrary";

export let fakeD = false;
export let fakeM = false;
export let fakeBoth = false;
export let fakecam = false; // إضافة حالة الفيك كام

function mute() {
    (document.querySelector('[aria-label="Mute"]') as HTMLElement)?.click();
}

function deafen() {
    (document.querySelector('[aria-label="Deafen"]') as HTMLElement)?.click();
}

const BothIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2.00305C6.486 2.00305 2 6.48805 2 12.0031V20.0031C2 21.1071 2.895 22.0031 4 22.0031H6C7.104 22.0031 8 21.1071 8 20.0031V17.0031C8 15.8991 7.104 15.0031 6 15.0031H4V12.0031C4 7.59105 7.589 4.00305 12 4.00305C16.411 4.00305 20 7.59105 20 12.0031V15.0031H18C16.896 15.0031 16 15.8991 16 17.0031V20.0031C16 21.1071 16.896 22.0031 18 22.0031H20C21.104 22.0031 22 21.1071 22 20.0031V12.0031C22 6.48805 17.514 2.00305 12 2.00305Z" />
        <path fill="currentColor" d="M6.16204 15.0065C6.10859 15.0022 6.05455 15 6 15H4V12C4 7.588 7.589 4 12 4C13.4809 4 14.8691 4.40439 16.0599 5.10859L6.16204 15.0065Z" />
        <path fill="currentColor" d="M18 15C17.9454 15 17.8914 15.0022 17.8379 15.0065L7.94413 4.10778C9.13603 3.40203 10.5232 3 12 3C16.4183 3 20 6.58172 20 11V15H18Z" />
        <rect fill="currentColor" x="3" y="2" width="2" height="20" transform="rotate(45 3 2)" />
    </svg>
);

const camicon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M17 10.5V7C17 5.9 16.1 5 15 5H5C3.9 5 3 5.9 3 7V15C3 16.1 3.9 17 5 17H15C16.1 17 17 16.1 17 15V11.5L21 15.5V6.5L17 10.5Z" />
        <rect fill="currentColor" x="2" y="2" width="2" height="20" transform="rotate(45 2 2)" />
    </svg>

);

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
    name: "rz فيك دفن",
    description: "You're deafened but you're not.",
    dependencies: ["PhilsPluginLibrary"],
    authors: [Devs.rz30],

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
        if (!fakeM && !fakeD && !fakeBoth && !fakecam)
            return au;

        switch (what) {
            case "mute":
                return (fakeM || fakeBoth) ? settings.store.mute : au;
            case "deaf":
                return (fakeD || fakeBoth) ? settings.store.deafen : au;
            case "video":
                return (fakecam || fakeBoth) ? settings.store.cam : au;
        }
    },

    start() {
        // زر Fake Mute
        addSettingsPanelButton({
            name: "fakemute",
            icon: MuteIcon,
            tooltipText: "Fake Mute",
            onClick: () => {
                if (fakeD) {
                    fakeD = false;
                    deafen();
                    setTimeout(deafen, 250);
                }
                if (fakeBoth) {
                    fakeBoth = false;
                    deafen();
                    setTimeout(deafen, 250);
                    setTimeout(mute, 300);
                }

                fakeM = !fakeM;
                mute();
                setTimeout(mute, 250);
            }
        });

        // زر Fake Deafen
        addSettingsPanelButton({
            name: "faked",
            icon: DeafenIcon,
            tooltipText: "Fake Deafen",
            onClick: () => {
                if (fakeM) {
                    fakeM = false;
                    mute();
                    setTimeout(mute, 250);
                }
                if (fakeBoth) {
                    fakeBoth = false;
                    deafen();
                    setTimeout(deafen, 250);
                    setTimeout(mute, 300);
                }

                fakeD = !fakeD;
                deafen();
                setTimeout(deafen, 250);

                if (settings.store.muteUponFakeDeafen)
                    setTimeout(mute, 300);
            }
        });

        // زر Fake Mute & Deafen
        addSettingsPanelButton({
            name: "fakeboth",
            icon: BothIcon,
            tooltipText: "Fake Mute & Deafen",
            onClick: () => {
                if (fakeM) {
                    fakeM = false;
                    mute();
                    setTimeout(mute, 250);
                }
                if (fakeD) {
                    fakeD = false;
                    deafen();
                    setTimeout(deafen, 250);
                }

                fakeBoth = !fakeBoth;
                deafen();
                setTimeout(mute, 250);
            }
        });

        // زر Fake Camera
        addSettingsPanelButton({
            name: "fakecam", icon: camicon, tooltipText: "Fake Camera", onClick: () => {

                if (fakeM) {
                    fakeM = false;
                    mute();
                    setTimeout(mute, 250);
                }
                if (fakeD) {
                    fakeD = false;
                    deafen();
                    setTimeout(deafen, 250);
                }

                fakecam = !fakecam;
                deafen();
                setTimeout(mute, 250);
            }
        });
    },

    stop() {
        removeSettingsPanelButton("fakemute");
        removeSettingsPanelButton("faked");
        removeSettingsPanelButton("fakeboth");
        removeSettingsPanelButton("fakecam"); // زر الفيك كام
    },

    getSettingsPanel() {
        return (
            <Forms.FormSection>
                <Forms.FormTitle>Fake Audio Controls</Forms.FormTitle>
                <Forms.FormText>
                    Use the buttons in Discord's toolbar to toggle fake mute, deafen,both, or camera.
                </Forms.FormText>
            </Forms.FormSection>
        );
    }
});
