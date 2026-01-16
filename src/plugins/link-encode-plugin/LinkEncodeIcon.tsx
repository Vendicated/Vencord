/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { classes } from "@utils/misc";
import { openModal } from "@utils/modal";
import { IconComponent } from "@utils/types";
import { Alerts, Forms, Tooltip, useEffect, useState } from "@webpack/common";

import { settings } from "./settings";
import { LinkEncodeModal } from "./LinkEncodeModal";
import { cl } from "./utils";

export const LinkEncodeIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            className={classes(cl("icon"), className)}
            fill="currentColor"
        >
            {/* Lock with keyhole - encryption/security icon */}
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
    );
};

export let setShouldShowEncodeEnabledTooltip: undefined | ((show: boolean) => void);

export const LinkEncodeChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    const { autoEncode } = settings.use(["autoEncode"]);

    const [shouldShowEncodeEnabledTooltip, setter] = useState(false);
    useEffect(() => {
        setShouldShowEncodeEnabledTooltip = setter;
        return () => setShouldShowEncodeEnabledTooltip = undefined;
    }, []);

    if (!isMainChat) return null;

    const toggle = () => {
        const newState = !autoEncode;
        settings.store.autoEncode = newState;
        if (newState && settings.store.showAutoEncodeAlert !== false)
            Alerts.show({
                title: "Auto-Encryption Enabled",
                body: <>
                    <Forms.FormText>
                        Your messages will now be <b>automatically encrypted</b> before sending. 
                        Each message uses a unique encryption key to bypass link filtering while maintaining privacy.
                    </Forms.FormText>
                </>,
                confirmText: "Disable",
                cancelText: "Got it",
                secondaryConfirmText: "Don't show again",
                onConfirmSecondary: () => settings.store.showAutoEncodeAlert = false,
                onConfirm: () => settings.store.autoEncode = false,
                confirmColor: "vc-notification-log-danger-btn",
            });
    };

    const button = (
        <ChatBarButton
            tooltip="Message Encryption Settings"
            onClick={e => {
                if (e.shiftKey) return toggle();

                openModal(props => (
                    <LinkEncodeModal rootProps={props} />
                ));
            }}
            onContextMenu={toggle}
            buttonProps={{
                "aria-haspopup": "dialog"
            }}
        >
            <LinkEncodeIcon className={cl({ "auto-encode": autoEncode, "chat-button": true })} />
        </ChatBarButton>
    );

    if (shouldShowEncodeEnabledTooltip && settings.store.showEncodedTooltip)
        return (
            <Tooltip text="Auto-encryption active" forceOpen>
                {() => button}
            </Tooltip>
        );

    return button;
};
