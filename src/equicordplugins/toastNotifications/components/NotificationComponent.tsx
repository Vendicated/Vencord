/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { settings as PluginSettings } from "@equicordplugins/toastNotifications/index";
import { classes } from "@utils/misc";
import { React, useEffect, useMemo, useState } from "@webpack/common";

import { NotificationData } from "./Notifications";

export default ErrorBoundary.wrap(function NotificationComponent({
    title,
    body,
    richBody,
    icon,
    image,
    permanent,
    dismissOnClick,
    index,
    onClick,
    onClose,
    attachments
}: NotificationData & { index?: number; }) {
    const [isHover, setIsHover] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    let renderBody: boolean = true;
    let footer: boolean = false;

    if (attachments > 0) footer = true;

    if (body === "") renderBody = false;

    // Precompute appearance settings.
    const AppearanceSettings = {
        position: `toastnotifications-position-${PluginSettings.store.position || "bottom-left"}`,
        timeout: (PluginSettings.store.timeout * 1000) || 5000,
        opacity: PluginSettings.store.opacity / 100,
    };

    const start = useMemo(() => Date.now(), [isHover]); // Reset the timer when the user hovers over the notification.

    // Precompute the position style.
    const positionStyle = useMemo(() => {
        if (index === undefined) return {};
        const isTopPosition = AppearanceSettings.position.includes("top");
        const actualHeight = 115; // Update this with the actual height including margin
        const effectiveIndex = index % PluginSettings.store.maxNotifications;
        const offset = 10 + (effectiveIndex * actualHeight); // 10 is the base offset

        return isTopPosition ? { top: `${offset}px` } : { bottom: `${offset}px` };
    }, [index, AppearanceSettings.position]);

    // Handle notification timeout.
    useEffect(() => {
        if (isHover || permanent) return void setElapsed(0);

        const intervalId = setInterval(() => {
            const elapsed = Date.now() - start;
            if (elapsed >= AppearanceSettings.timeout)
                onClose!();
            else
                setElapsed(elapsed);
        }, 10);

        return () => clearInterval(intervalId);
    }, [isHover]);

    const timeoutProgress = elapsed / AppearanceSettings.timeout;

    // Render the notification.
    return (
        <button
            style={positionStyle}
            className={classes("toastnotifications-notification-root", AppearanceSettings.position)}
            onClick={() => {
                onClick?.();
                if (dismissOnClick !== false)
                    onClose!();
            }}
            onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                onClose!();
            }}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            <div className="toastnotifications-notification">
                {icon && <img className="toastnotifications-notification-icon" src={icon} alt="User Avatar" />}
                <div className="toastnotifications-notification-content">
                    <div className="toastnotifications-notification-header">
                        <h2 className="toastnotifications-notification-title">{title}</h2>
                        <button
                            className="toastnotifications-notification-close-btn"
                            onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose!();
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-labelledby="toastnotifications-notification-dismiss-title">
                                <title id="toastnotifications-notification-dismiss-title">Dismiss Notification</title>
                                <path fill="currentColor" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z" />
                            </svg>
                        </button>
                    </div>
                    <div>
                        {renderBody ? (
                            richBody ?? (
                                <p className="toastnotifications-notification-p">
                                    {body.length > 500 ? body.slice(0, 500) + "..." : body}
                                </p>
                            )
                        ) : null}
                        {PluginSettings.store.renderImages && image && <img className="toastnotifications-notification-img" src={image} alt="ToastNotification Image" />}
                        {footer && <p className="toastnotifications-notification-footer">{`${attachments} attachment${attachments > 1 ? "s" : ""} ${attachments > 1 ? "were" : "was"} sent.`}</p>}
                    </div>
                </div>
            </div>
            {AppearanceSettings.timeout !== 0 && !permanent && (
                <div
                    className="toastnotifications-notification-progressbar"
                    style={{ width: `${(1 - timeoutProgress) * 100}%`, backgroundColor: "var(--toastnotifications-progressbar-color)" }}
                />
            )}
        </button>
    );
}, {
    onError: ({ props }) => props.onClose!()
});
