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
    const muteBtnEn = (document.querySelector('[aria-label="Turn Off Microphone"]') as HTMLElement);
    const muteBtnUk = (document.querySelector('[aria-label="Выключить микрофон"]') as HTMLElement);
    const muteBtnRu = (document.querySelector('[aria-label="Вимкнути мікрофон"]') as HTMLElement);
    if (muteBtnEn) muteBtnEn.click();
    else if (muteBtnEn) muteBtnUk.click();
    else if (muteBtnEn) muteBtnRu.click();
}

function deafen() {
    const deafenBtnEn = (document.querySelector('[aria-label="Deafen"]') as HTMLElement);
    const deafenBtnUk = (document.querySelector('[aria-label="Вимкнути звук"]') as HTMLElement);
    const deafenBtnRu = (document.querySelector('[aria-label="Откл. звук"]') as HTMLElement);

    if (deafenBtnEn) deafenBtnEn.click();
    else if (deafenBtnUk) deafenBtnUk.click();
    else if (deafenBtnRu) deafenBtnRu.click();
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

const defaultLocationSelector = '[aria-label*="User area"]>*>[class*="flex_"][class*="horizontal__"][class*="justifyStart__"][class*="alignStretch_"][class*="noWrap__"]';
const secondaryLocationSelector = '[aria-label*="User area"]>[class*="flex_"][class*="horizontal__"][class*="justifyStart__"][class*="alignStretch_"][class*="noWrap__"]';
const fixButtons = () => {
    let btns;

    btns = document.querySelector(defaultLocationSelector); // In User area
    if (btns && btns.children.length > 4) {
        if (typeof btns?.parentElement?.parentElement?.appendChild === "function") btns.parentElement.parentElement.appendChild(btns);
        return;
    }

    btns = document.querySelector(secondaryLocationSelector); // Already moved
    if (btns && btns.children.length < 5) {
        const avatarWrapper = document.querySelector('div[class*="avatarWrapper_"][class*="withTagAsButton_"]:only-child');
        if (avatarWrapper && ![...avatarWrapper.childNodes].includes(btns)) avatarWrapper.appendChild(btns);
        return;
    }
};
const buttonsObserver = new MutationObserver(fixButtons);

function watchButtons() {
    const btns = document.querySelector(defaultLocationSelector) || document.querySelector(secondaryLocationSelector);
    if (!btns) return;
    buttonsObserver.disconnect();
    buttonsObserver.observe(btns, { subtree: true, childList: true, attributes: false });
}

function FakeVoiceOptionToggleButton() {
    watchButtons();
    return (
        <Button
            /* tooltipText={faked ? "Disable Fake" : "Enable Fake" } */
            icon={makeIcon(!faked)}
            role="switch"
            aria-checked={!faked}
            aria-label="Fake voice options button"
            onClick={() => {
                faked = !faked;

                deafen();
                setTimeout(deafen, 200);

                if (settings.store.muteOnFakeDeafen && faked) setTimeout(mute, 350);
            }}
        />
    );
}

export default definePlugin({
    name: "FakeVoiceOptions",
    description: "Fake mute, deafen, and camera for VCs",
    authors: [{
        name: "AceSilentKill",
        id: 0n
    }],
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
        watchButtons();
        enableStyle(style);
    },
    stop() {
        watchButtons();
        disableStyle(style);
    }
});
