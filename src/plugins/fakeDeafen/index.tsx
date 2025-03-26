/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";


export let fakeD = false;

const Button = findComponentByCodeLazy(".NONE,disabled:", ".PANEL_BUTTON");

function mute() {
    (document.querySelector('[aria-label="Mute"]') as HTMLElement).click();
}

function deafen() {
    (document.querySelector('[aria-label="Deafen"]') as HTMLElement).click();
}

function makeDeafenIcon(useFakeState: boolean) {
    return function DeafenIconComponent() {
        return (
            <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Ear Icon Paths */}
                <path
                    d="M5.274 5.876c0.396-0.89 0.744-1.934 1.611-2.476 4.086-2.554 8.316 1.441 7.695 5.786-0.359 2.515-3.004 3.861-4.056 5.965-0.902 1.804-4.457 3.494-4.742 0.925"
                    stroke={useFakeState ? "var(--status-danger)" : "currentColor"}
                    strokeOpacity={0.9}
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M11.478 11.931c2.111-2.239 1.579-7.495-1.909-7.337-2.625 0.119-2.012 3.64-1.402 4.861"
                    stroke={useFakeState ? "var(--status-danger)" : "currentColor"}
                    strokeOpacity={0.9}
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M7.636 7.755c2.796-0.194 3.747 2.749 1.933 4.563-0.472 0.472-1.386-0.214-1.933 0.06-0.547 0.274-0.957 1.136-1.497 0.507"
                    stroke={useFakeState ? "var(--status-danger)" : "currentColor"}
                    strokeOpacity={0.9}
                    strokeWidth={0.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Strike-through (only shown in fake state) */}
                {useFakeState && (
                    <path
                        d="M19 1L1 19"
                        stroke="var(--status-danger)"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                    />
                )}
            </svg>
        );
    };
}


function fakeDeafenToggleButton() {

    return (
        <Button
            tooltipText="Fake Deafen"
            icon={makeDeafenIcon(fakeD)}
            role="switch"
            aria-checked={!fakeD}
            onClick={() => {
                fakeD = !fakeD;
                deafen();
                setTimeout(deafen, 250);

                if (settings.store.muteUponFakeDeafen)
                    setTimeout(mute, 300);
            }
            }
        />
    );
}

const settings = definePluginSettings({
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
    }
});

export default definePlugin({
    name: "FakeDeafen",
    description: "You're deafened but you're not",
    dependencies: ["PhilsPluginLibrary"],
    authors: [Devs.desu],

    patches: [
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+),self_video:([^,]+)/,
                replace: "self_mute:$self.toggle($1, 'mute'),self_deaf:$self.toggle($2, 'deaf'),self_video:$self.toggle($3, 'video')"
            }
        },
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /className:\i\.buttons,.{0,50}children:\[/,
                replace: "$&$self.fakeDeafenToggleButton(),"
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
    fakeDeafenToggleButton: ErrorBoundary.wrap(fakeDeafenToggleButton, { noop: true }),

});
