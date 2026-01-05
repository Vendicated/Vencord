/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";
import { Forms } from "@webpack/common";
import { addSettingsPanelButton, DeafenIcon, MuteIcon, removeSettingsPanelButton } from "../philsPluginLibrary";

export let fakeD = false;
export let fakeM = false;
export let fakeBoth = false;

function mute() {
    (document.querySelector('[aria-label="Mute"]') as HTMLElement).click();
}

function deafen() {
    (document.querySelector('[aria-label="Deafen"]') as HTMLElement).click();
}

const BothIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2.00305C6.486 2.00305 2 6.48805 2 12.0031V20.0031C2 21.1071 2.895 22.0031 4 22.0031H6C7.104 22.0031 8 21.1071 8 20.0031V17.0031C8 15.8991 7.104 15.0031 6 15.0031H4V12.0031C4 7.59105 7.589 4.00305 12 4.00305C16.411 4.00305 20 7.59105 20 12.0031V15.0031H18C16.896 15.0031 16 15.8991 16 17.0031V20.0031C16 21.1071 16.896 22.0031 18 22.0031H20C21.104 22.0031 22 21.1071 22 20.0031V12.0031C22 6.48805 17.514 2.00305 12 2.00305Z" />
        <path fill="currentColor" d="M6.16204 15.0065C6.10859 15.0022 6.05455 15 6 15H4V12C4 7.588 7.589 4 12 4C13.4809 4 14.8691 4.40439 16.0599 5.10859L6.16204 15.0065Z" />
        <path fill="currentColor" d="M18 15C17.9454 15 17.8914 15.0022 17.8379 15.0065L7.94413 4.10778C9.13603 3.40203 10.5232 3 12 3C16.4183 3 20 6.58172 20 11V15H18Z" />
        <rect fill="currentColor" x="3" y="2" width="2" height="20" transform="rotate(45 3 2)" />
    </svg>
);

const settings = definePluginSettings({
    muteUponFakeDeafen: {
        type: OptionType.BOOLEAN,
        description: "Automatically mute when fake deafening",
        default: false
    },
    mute: {
        type: OptionType.BOOLEAN,
        description: "Show as muted when fake mute is active",
        default: true
    },
    deafen: {
        type: OptionType.BOOLEAN,
        description: "Show as deafened when fake deafen is active",
        default: true
    },
    cam: {
        type: OptionType.BOOLEAN,
        description: "Show camera as off when fake features are active",
        default: false
    }
});

export default definePlugin({
    name: "فيك لهم",
    description: "Fake being muted, deafened, or both while still being able to hear and speak.",
    dependencies: ["PhilsPluginLibrary"],
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }],

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
        if (fakeM === false && fakeD === false && fakeBoth === false)
            return au;
        else {
            switch (what) {
                case "mute": return (fakeM || fakeBoth) ? settings.store.mute : au;
                case "deaf": return (fakeD || fakeBoth) ? settings.store.deafen : au;
                case "video": return (fakeM || fakeD || fakeBoth) ? settings.store.cam : au;
            }
        }
    },

    start() {
        // إضافة أزرار التحكم في الصوت الوهمي
        addSettingsPanelButton({
            name: "fakemute", icon: MuteIcon, tooltipText: "Fake Mute", onClick: () => {

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


        addSettingsPanelButton({
            name: "faked", icon: DeafenIcon, tooltipText: "Fake Deafen", onClick: () => {

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


        addSettingsPanelButton({
            name: "fakeboth", icon: BothIcon, tooltipText: "Fake Mute & Deafen", onClick: () => {

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
    },

    stop() {

        removeSettingsPanelButton("fakemute");
        removeSettingsPanelButton("faked");
        removeSettingsPanelButton("fakeboth");
    },

    getSettingsPanel() {
        return (
            <Forms.FormSection>
                <Forms.FormTitle>Fake Audio Controls</Forms.FormTitle>
                <Forms.FormText>
                    Use the buttons in Discord's toolbar to toggle fake mute, deafen, or both.
                </Forms.FormText>
            </Forms.FormSection>
        );
    }
});
