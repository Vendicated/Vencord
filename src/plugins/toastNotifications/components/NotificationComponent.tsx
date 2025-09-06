/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { classes } from "@utils/misc";
import { Channel, Message } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { React, useEffect, useMemo, useState } from "@webpack/common";

import { settings as PluginSettings } from "../index";

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");
const MessageComponent = findComponentByCodeLazy("childrenExecutedCommand:", ".hideAccessories");

export interface NotificationData {
    message: Message; // The Discord message object.
    mockedMessage: Message;
    channel: Channel;
    permanent?: boolean; // Whether or not the notification should be permanent or timeout.
    dismissOnClick?: boolean; // Whether or not the notification should be dismissed when clicked.
    onClick?(): void;
    onClose?(): void;
}

export default ErrorBoundary.wrap(function NotificationComponent(props: NotificationData & { index?: number; }) {
    const [isHover, setIsHover] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    // Precompute appearance settings.
    const AppearanceSettings = {
        position: `toastnotifications-position-${PluginSettings.store.position || "bottom-left"}`,
        timeout: (PluginSettings.store.timeout * 1000) || 5000,
        opacity: PluginSettings.store.opacity / 100,
    };

    const start = useMemo(() => Date.now(), [isHover]); // Reset the timer when the user hovers over the notification.

    // Compute the notification styles such as position and opacity.
    const notificationStyles = useMemo(() => {
        if (props.index === undefined) return {};
        const isTopPosition = AppearanceSettings.position.includes("top");
        const actualHeight = 100; // TODO: Calculate the actual height of the notification.
        const effectiveIndex = props.index % PluginSettings.store.maxNotifications;
        const offset = 10 + (effectiveIndex * actualHeight); // 10 is the base offset.

        const position = isTopPosition ? { top: `${offset}px` } : { bottom: `${offset}px` };
        return { ...position, opacity: AppearanceSettings.opacity };
    }, [props.index, AppearanceSettings.position, AppearanceSettings.opacity]);

    // Handle notification timeout.
    useEffect(() => {
        if (isHover || props?.permanent) return void setElapsed(0);

        const intervalId = setInterval(() => {
            const elapsed = Date.now() - start;
            if (elapsed >= AppearanceSettings.timeout)
                props?.onClose!();
            else
                setElapsed(elapsed);
        }, 10);

        return () => clearInterval(intervalId);
    }, [isHover]);

    const timeoutProgress = elapsed / AppearanceSettings.timeout;

    // Render the notification.
    return (
        <button
            style={notificationStyles}
            className={classes("toastnotifications-notification-root", AppearanceSettings.position)}
            onClick={() => {
                SelectedChannelActionCreators.selectPrivateChannel(props.message.channel_id); // Navigate to the channel.
                if (props?.dismissOnClick !== false) props?.onClose!();
            }}
            onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                props?.onClose!();
            }}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            <div className="toastnotifications-notification-content">
                <MessageComponent
                    id={`toastnotification-mock-${props.message.id}`}
                    message={props.mockedMessage} // Use the mocked message.
                    channel={props.channel}
                    subscribeToComponentDispatch={false}
                />
            </div>
            {AppearanceSettings.timeout !== 0 && !props?.permanent && (
                <div
                    className="toastnotifications-notification-progressbar"
                    style={{ width: `${(1 - timeoutProgress) * 100}%` }}
                />
            )}
        </button>
    );
}, {
    onError: ({ props }) => props.onClose!()
});
