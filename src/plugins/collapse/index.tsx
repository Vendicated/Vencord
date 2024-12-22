/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, useState } from "@webpack/common";

import hideSidebar from "./hideSidebar.css?managed";

const range = (start: number, end: number, step: number) => Array.from({ length: (end - start) / step + 1 }, (_, i) => start + step * i);

enum ButtonOption { Hidden, Shown, Auto, _LEN }

const settings = definePluginSettings({
    startState: {
        type: OptionType.SELECT,
        description: "The default button state after opening Discord",
        options: [
            { label: "Sidebar Auto", value: ButtonOption.Auto, default: true },
            { label: "Sidebar Hidden", value: ButtonOption.Hidden },
            { label: "Sidebar Shown", value: ButtonOption.Shown },
        ]
    },
    buttonSize: {
        type: OptionType.SLIDER,
        description: "Size of the sidebar toggle button in `px`",
        markers: range(20, 60, 2),
        default: 32,
        restartNeeded: true,
    },
});

function setSidebarDisplayVars(main: boolean, auto: boolean) {
    const docStyle = document.body.style;
    docStyle.setProperty("--sidebar-display", main ? "none" : null);
    docStyle.setProperty("--sidebar-auto-display", auto ? "none" : null);
}

function applyChoice(choice: ButtonOption) {
    switch (choice) {
        case ButtonOption.Shown: setSidebarDisplayVars(false, false); break;
        case ButtonOption.Auto: setSidebarDisplayVars(false, true); break;
        case ButtonOption.Hidden: setSidebarDisplayVars(true, true); break;
    }
}

function SidebarIcon(icon: ButtonOption) {
    const svgStyle = { "--sidebar-button-size": settings.store.buttonSize + "px" } as React.CSSProperties;

    switch (icon) {
        case ButtonOption.Hidden:
            return (
                <svg width="86" height="60" viewBox="0 0 86 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={svgStyle}>
                    <rect x="10" y="6" width="66" height="48" rx="6" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linejoin="round" />
                    <path d="M50 29H42" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M34 29H22" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M52 18H34" stroke="var(--sidebar-icon-stroke)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
                    <circle cx="23" cy="18" r="5" fill="var(--sidebar-icon-stroke)" />
                    <rect x="20" y="39" width="30" height="6.00003" rx="2" fill="var(--sidebar-icon-stroke)" stroke="var(--sidebar-icon-stroke)" stroke-width="3" />
                    <rect x="58" y="38" width="8" height="8.00004" rx="2" fill="var(--sidebar-icon-stroke)" stroke="var(--sidebar-icon-stroke)" stroke-width="3" />
                </svg>
            );
        case ButtonOption.Shown:
            return (
                <svg width="86" height="60" viewBox="0 0 86 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={svgStyle}>
                    <rect x="10" y="6" width="66" height="48" rx="6" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linejoin="round" />
                    <line x1="53.5" y1="6" x2="53.5" y2="54" stroke="var(--sidebar-icon-stroke)" stroke-width="3" stroke-linejoin="round" />
                    <path d="M44 16L20 16" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M44 34H20" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M44 25L24 25" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            );
        case ButtonOption.Auto:
            return (
                <svg width="86" height="60" viewBox="0 0 86 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={svgStyle}>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 48V12C12 9.79086 13.7909 8 16 8H53V4H16C11.5817 4 8 7.58172 8 12V48C8 52.4183 11.5817 56 16 56H70C74.4183 56 78 52.4183 78 48V32H74V48C74 50.2091 72.2091 52 70 52H16C13.7909 52 12 50.2091 12 48Z" fill="var(--sidebar-icon-stroke)" />
                    <path d="M61.7015 8.12334L63.1699 13.3995L68.2995 14.9099C68.6369 15.012 68.875 15.3283 68.875 15.6957C68.875 16.0631 68.6369 16.3795 68.2995 16.4815L63.1699 17.9919L61.7015 23.2681C61.6023 23.6151 61.2947 23.86 60.9375 23.86C60.5803 23.86 60.2727 23.6151 60.1735 23.2681L58.7051 17.9919L53.5755 16.4815C53.2381 16.3795 53 16.0631 53 15.6957C53 15.3283 53.2381 15.012 53.5755 14.9099L58.7051 13.3995L60.1735 8.12334C60.2727 7.77636 60.5803 7.53143 60.9375 7.53143C61.2947 7.53143 61.6023 7.77636 61.7015 8.12334ZM73.6375 1C74.0046 1 74.3221 1.25513 74.4114 1.62253L75.0861 4.40859L77.7948 5.10255C78.152 5.1944 78.4 5.52097 78.4 5.89857C78.4 6.27617 78.152 6.60274 77.7948 6.69459L75.0861 7.38855L74.4114 10.1746C74.3221 10.542 74.0046 10.7971 73.6375 10.7971C73.2704 10.7971 72.9529 10.542 72.8636 10.1746L72.1889 7.38855L69.4802 6.69459C69.123 6.60274 68.875 6.27617 68.875 5.89857C68.875 5.52097 69.123 5.1944 69.4802 5.10255L72.1889 4.40859L72.8636 1.62253C72.9529 1.25513 73.2704 1 73.6375 1Z" fill="var(--sidebar-icon-stroke)" />
                    <path d="M79.011 14.1603L80.1857 18.264L84.2894 19.4388C84.5593 19.5181 84.7498 19.7642 84.7498 20.0499C84.7498 20.3357 84.5593 20.5818 84.2894 20.6611L80.1857 21.8359L79.011 25.9396C78.9316 26.2094 78.6856 26.4 78.3998 26.4C78.1141 26.4 77.868 26.2094 77.7886 25.9396L76.6139 21.8359L72.5102 20.6611C72.2403 20.5818 72.0498 20.3357 72.0498 20.0499C72.0498 19.7642 72.2403 19.5181 72.5102 19.4388L76.6139 18.264L77.7886 14.1603C77.868 13.8905 78.1141 13.7 78.3998 13.7C78.6856 13.7 78.9316 13.8905 79.011 14.1603Z" fill="var(--sidebar-icon-stroke)" />
                    <line x1="46.5" y1="5" x2="46.5" y2="54" stroke="var(--sidebar-icon-stroke)" stroke-width="3" stroke-linejoin="round" />
                    <path d="M38 16L20 16" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M38 34H20" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M38 25H24" stroke="var(--sidebar-icon-stroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            );
    }
}

function SidebarButton() {
    const [choice, setChoice] = useState<ButtonOption>(settings.store.startState);

    function onClick() {
        setChoice(prevChoice => {
            const newChoice = (prevChoice + 1) % ButtonOption._LEN;
            applyChoice(newChoice);

            return newChoice;
        });
    }

    function keyDown(event: React.KeyboardEvent) {
        if (event.key === "b" && event.ctrlKey) {
            console.log("Ctrl+B pressed");
            onClick();
        }
    }

    return (
        <Button
            onClick={onClick}
            size={Button.Sizes.MIN}
            color={Button.Colors.CUSTOM}
            className="vc-toggle-sidebar-button"
            alt={"Sidebar " + ButtonOption[choice]}
        >
            {SidebarIcon(choice)}
        </Button>
    );
}

export default definePlugin({
    name: "Collapse",
    description: "Auto & manual collapsing of the channel sidebar",
    authors: [Devs.Rec1dite],

    renderToggleButton: ErrorBoundary.wrap(SidebarButton, { noop: true }),

    start() {
        enableStyle(hideSidebar);
        applyChoice(settings.store.startState);
        addServerListElement(ServerListRenderPosition.Above, this.renderToggleButton);
    },

    stop() {
        disableStyle(hideSidebar);
        removeServerListElement(ServerListRenderPosition.Above, this.renderToggleButton);
    },

    settings
});
