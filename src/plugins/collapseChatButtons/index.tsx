/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { useMemo, useState } from "@webpack/common";
import { MouseEventHandler, ReactElement } from "react";

let collapsechatbuttonsopen: boolean | undefined;

const excluded = new Set();

function UpdateExcludedButtons(val: string) {
    excluded.clear();
    val.split(";").map(x => x.trim()).forEach(excluded.add.bind(excluded));
}

const settings = definePluginSettings({
    Open: {
        type: OptionType.BOOLEAN,
        description: "opened by default",
        default: false,
        onChange: (store: { open: boolean; }) => {
            console.log("changing open", store.open);
            collapsechatbuttonsopen = store.open;
        }
    },
    ExcludedButtons: {
        type: OptionType.STRING,
        description: "Semi colon separated list of buttons (IDs), you have gift, emoji, sticker, appLauncher and vencord-chat-buttons and maybe others. NOTE this doesn't support custom buttons by plugins and names should be lower case!",
        default: "submit;",
        onChange: UpdateExcludedButtons
    }
});

function CollapseToggleButton(props: { open: boolean | undefined, onClick: MouseEventHandler<HTMLButtonElement>; }) {
    return (<ChatBarButton
        onClick={props.onClick}
        tooltip={props.open ? "Close" : "Open"}
    >
        <svg
            id="vc-chat-button-collapse-buttons-toggle"
            className={props.open ? "vc-collapse-chat-buttons-toggle-open" : "vc-collapse-chat-buttons-toggle-closed"}
            fill="currentColor"
            fillRule="evenodd"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            style={{ scale: "1.096", translate: "0 -1px" }}
        >
            {props.open ?
                <><path d="M1.3 21.3a1 1 0 1 0 1.4 1.4l20-20a1 1 0 0 0-1.4-1.4l-20 20ZM3.16 16.05c.18.24.53.26.74.05l.72-.72c.18-.18.2-.45.05-.66a15.7 15.7 0 0 1-1.43-2.52.48.48 0 0 1 0-.4c.4-.9 1.18-2.37 2.37-3.72C7.13 6.38 9.2 5 12 5c.82 0 1.58.12 2.28.33.18.05.38 0 .52-.13l.8-.8c.25-.25.18-.67-.15-.79A9.79 9.79 0 0 0 12 3C4.89 3 1.73 10.11 1.11 11.7a.83.83 0 0 0 0 .6c.25.64.9 2.15 2.05 3.75Z"></path><path d="M8.18 10.81c-.13.43.36.65.67.34l2.3-2.3c.31-.31.09-.8-.34-.67a4 4 0 0 0-2.63 2.63ZM12.85 15.15c-.31.31-.09.8.34.67a4.01 4.01 0 0 0 2.63-2.63c.13-.43-.36-.65-.67-.34l-2.3 2.3Z"></path> <path d="M9.72 18.67a.52.52 0 0 0-.52.13l-.8.8c-.25.25-.18.67.15.79 1.03.38 2.18.61 3.45.61 7.11 0 10.27-7.11 10.89-8.7a.83.83 0 0 0 0-.6c-.25-.64-.9-2.15-2.05-3.75a.49.49 0 0 0-.74-.05l-.72.72a.51.51 0 0 0-.05.66 15.7 15.7 0 0 1 1.43 2.52c.06.13.06.27 0 .4-.4.9-1.18 2.37-2.37 3.72C16.87 17.62 14.8 19 12 19c-.82 0-1.58-.12-2.28-.33Z"></path></> :
                <path d="M22.89 11.7c.07.2.07.4 0 .6C22.27 13.9 19.1 21 12 21c-7.11 0-10.27-7.11-10.89-8.7a.83.83 0 0 1 0-.6C1.73 10.1 4.9 3 12 3c7.11 0 10.27 7.11 10.89 8.7Zm-4.5-3.62A15.11 15.11 0 0 1 20.85 12c-.38.88-1.18 2.47-2.46 3.92C16.87 17.62 14.8 19 12 19c-2.8 0-4.87-1.38-6.39-3.08A15.11 15.11 0 0 1 3.15 12c.38-.88 1.18-2.47 2.46-3.92C7.13 6.38 9.2 5 12 5c2.8 0 4.87 1.38 6.39 3.08ZM15.56 11.77c.2-.1.44.02.44.23a4 4 0 1 1-4-4c.21 0 .33.25.23.44a2.5 2.5 0 0 0 3.32 3.32Z" />
            }
        </svg>
    </ChatBarButton>);
}

function ButtonsWrapper({ buttons, disabled }: { buttons: React.ReactNode[]; disabled: boolean; }) {
    if (disabled) return;
    const [open, setOpen] = useState(collapsechatbuttonsopen);

    useMemo(() => {
        collapsechatbuttonsopen = open;
    }, [open]);
    const excludedButtons: React.ReactNode[] = [];
    const includedButtons: React.ReactNode[] = [];
    for (const button of buttons) {
        if (excluded.has((button as ReactElement)?.key)) {
            excludedButtons.push(button);
            continue;
        }
        includedButtons.push(button);
    }

    return (
        <div id="chat-bar-buttons-menu" style={{
            display: "flex",
            flexWrap: "nowrap",
            overflow: "hidden",
        }}>
            {open ? includedButtons : null}
            <CollapseToggleButton onClick={() => setOpen(!open)} open={open}></CollapseToggleButton>
            {excludedButtons}
        </div>
    );
}

export default definePlugin({
    name: "CollapseChatButtons",
    description: "able to collapse the chat buttons",
    settings: settings,
    dependencies: ["ChatInputButtonAPI"],
    authors: [Devs.iamme],
    patches: [
        {
            find: "\"sticker\")",
            replacement: {
                match: /(.buttons,.{20}children:)([^}]+)/,
                replace: "$1$self.ButtonsWrapper($2, arguments[0])"
            }
        }
    ],
    startAt: StartAt.Init,
    ButtonsWrapper: (buttons: React.ReactNode[], props: any) => <ErrorBoundary><ButtonsWrapper buttons={buttons} {...props} /></ErrorBoundary>,
    start: async () => {
        collapsechatbuttonsopen = settings.store.Open;
        UpdateExcludedButtons(settings.store.ExcludedButtons);
    }
});
