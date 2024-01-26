/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";

import { settings } from "./settings";
import style from "./style.css?managed";

export let faked = false;

function mute() {
    const muteBtn = (document.querySelector('[aria-label="Mute"]') as HTMLElement);
    if (muteBtn) muteBtn.click();
}

function deafen() {
    const deafenBtn = (document.querySelector('[aria-label="Deafen"]') as HTMLElement);
    if (deafenBtn) deafenBtn.click();
}

function openSettings() {
    const settingsBtn = (document.querySelector('[aria-label="Deafen"]') as HTMLElement);
    if (settingsBtn) settingsBtn.click();
}

const Button = findByCodeLazy("Button.Sizes.NONE,disabled:");

function makeIcon(enabled?: boolean) {
    return function () {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="19"
                height="19"
                viewBox="0 0 512 512"
            >
                <path fill="currentColor" d="M256 48C141.1 48 48 141.1 48 256v40c0 13.3-10.7 24-24 24s-24-10.7-24-24V256C0 114.6 114.6 0 256 0S512 114.6 512 256V400.1c0 48.6-39.4 88-88.1 88L313.6 488c-8.3 14.3-23.8 24-41.6 24H240c-26.5 0-48-21.5-48-48s21.5-48 48-48h32c17.8 0 33.3 9.7 41.6 24l110.4 .1c22.1 0 40-17.9 40-40V256c0-114.9-93.1-208-208-208zM144 208h16c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32H144c-35.3 0-64-28.7-64-64V272c0-35.3 28.7-64 64-64zm224 0c35.3 0 64 28.7 64 64v48c0 35.3-28.7 64-64 64H352c-17.7 0-32-14.3-32-32V240c0-17.7 14.3-32 32-32h16z" />
                {!enabled &&
                    <line
                        x1="495"
                        y1="10"
                        x2="10"
                        y2="464"
                        stroke="var(--status-danger)"
                        strokeWidth="40"
                    />
                }
            </svg>
        );
    };
}

function FakeVoiceOptionToggleButton() {
    return (
        <div className="button-container">
            <Button
                tooltipText={faked ? "Disable Fake Deafen/Mute/Cam" : "Enable Fake Deafen/Mute/Cam"}
                icon={makeIcon(!faked)}
                role="switch"
                aria-checked={!faked}
                onClick={() => {
                    faked = !faked;

                    deafen();
                    setTimeout(deafen, 200);

                    if (settings.store.muteOnFakeDeafen && faked) setTimeout(mute, 350);
                }}
            />
        </div>
    );
}

export default definePlugin({
    name: "FakeVoiceOptions",
    description: "Fake mute, deafen, and camera for VCs",
    authors: [Devs.AceSilentKill],
    patches: [
        {
            find: ".Messages.ACCOUNT_SPEAKING_WHILE_MUTED",
            replacement: {
                match: /this\.renderNameZone\(\).+?children:\[/,
                replace: "$&$self.FakeVoiceOptionToggleButton(),"
            }
        },
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+),self_video:([^,]+)/,
                replace: "self_mute:$self.toggle($1,'fakeMute'),self_deaf:$self.toggle($2,'fakeDeafen'),self_video:$self.toggle($3,'fakeCam')",
            }
        }
    ],
    FakeVoiceOptionToggleButton: ErrorBoundary.wrap(FakeVoiceOptionToggleButton, { noop: true }),
    settings,
    toggle: (_o: any, key: string) => {
        return (faked === false) ? _o : settings.store[key];
    },
    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    }
});
