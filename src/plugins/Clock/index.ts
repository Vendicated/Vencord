/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    use12Hour: {
        description: "Whether to use 24 hour time",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    },
    showSeconds: {
        description: "Whether to show seconds",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
    rightAlign: {
        description: "Whether to right align the clock",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
    seperator: {
        description: "Seperator between the two clocks",
        type: OptionType.STRING,
        default: " | ",
        restartNeeded: true,
    },
    slotOneEnabled: {
        description: "Whether to show slot one",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    },
    slotOneLabel: {
        description: "Label for slot one",
        type: OptionType.STRING,
        default: "Hong Kong",
        restartNeeded: true,
    },
    slotOneZone: {
        description: "IANA Time Zone Code for slot one",
        type: OptionType.STRING,
        default: "Asia/Hong_Kong",
        restartNeeded: true,
    },
    slotTwoEnabled: {
        description: "Whether to show slot two",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    },
    slotTwoLabel: {
        description: "Label for slot two",
        type: OptionType.STRING,
        default: "Toronto",
        restartNeeded: true,
    },
    slotTwoZone: {
        description: "IANA Time Zone Code for slot two",
        type: OptionType.STRING,
        default: "America/Toronto",
        restartNeeded: true,
    },
    slotThreeEnabled: {
        description: "Whether to show slot three",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
    slotThreeLabel: {
        description: "Label for slot three",
        type: OptionType.STRING,
        default: "London",
        restartNeeded: true,
    },
    slotThreeZone: {
        description: "IANA Time Zone Code for slot three",
        type: OptionType.STRING,
        default: "Europe/London",
        restartNeeded: true,
    },
    slotFourEnabled: {
        description: "Whether to show slot four",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
    slotFourLabel: {
        description: "Label for slot four",
        type: OptionType.STRING,
        default: "Sydney",
        restartNeeded: true,
    },
    slotFourZone: {
        description: "IANA Time Zone Code for slot four",
        type: OptionType.STRING,
        default: "Australia/Sydney",
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "Clock",
    description: "Adds a customizable clock with timezones",
    authors: [Devs.Tnixc],
    settings,
    async start() {
        const { use12Hour, showSeconds, seperator, rightAlign } = settings.store;
        const { slotOneEnabled, slotOneLabel, slotOneZone } = settings.store;
        const { slotTwoEnabled, slotTwoLabel, slotTwoZone } = settings.store;
        const { slotThreeEnabled, slotThreeLabel, slotThreeZone } = settings.store;
        const { slotFourEnabled, slotFourLabel, slotFourZone } = settings.store;

        const createClockOptions = (hour12: boolean, timeZone: string): Intl.DateTimeFormatOptions => ({
            timeZone: timeZone,
            hour12: hour12,
            hour: "2-digit",
            minute: "2-digit",
            ...(showSeconds && { second: "2-digit" }),
        });

        const clockOneOptions = createClockOptions(use12Hour, slotOneZone);
        const clockTwoOptions = createClockOptions(use12Hour, slotTwoZone);
        const clockThreeOptions = createClockOptions(use12Hour, slotThreeZone);
        const clockFourOptions = createClockOptions(use12Hour, slotFourZone);

        const panels = document.querySelector(".panels__58331") as HTMLElement;

        if (!panels) return;

        const clockContainer = document.createElement("div");
        clockContainer.classList.add("vc-clock-container");

        if (rightAlign) clockContainer.classList.add("right-align");

        panels.appendChild(clockContainer);
        if (slotOneEnabled) {
            var slotOneClock = document.createElement("p");
            slotOneClock.classList.add("vc-clock");
            clockContainer.appendChild(slotOneClock);
        }
        if (slotTwoEnabled) {
            var slotTwoClock = document.createElement("p");
            slotTwoClock.classList.add("vc-clock");
            clockContainer?.appendChild(slotTwoClock);
        }
        if (slotThreeEnabled) {
            var slotThreeClock = document.createElement("p");
            slotThreeClock.classList.add("vc-clock");
            clockContainer?.appendChild(slotThreeClock);
        }
        if (slotFourEnabled) {
            var slotFourClock = document.createElement("p");
            slotFourClock.classList.add("vc-clock");
            clockContainer?.appendChild(slotFourClock);
        }
        function updateTime() {
            const now = new Date();
            if (slotOneEnabled) { slotOneClock.textContent = slotOneLabel + seperator + now.toLocaleTimeString([], clockOneOptions); }
            if (slotTwoEnabled) { slotTwoClock.textContent = slotTwoLabel + seperator + now.toLocaleTimeString([], clockTwoOptions); }
            if (slotThreeEnabled) { slotThreeClock.textContent = slotThreeLabel + seperator + now.toLocaleTimeString([], clockThreeOptions); }
            if (slotFourEnabled) { slotFourClock.textContent = slotFourLabel + seperator + now.toLocaleTimeString([], clockFourOptions); }
        }
        setInterval(updateTime, 1000);
    },
});
