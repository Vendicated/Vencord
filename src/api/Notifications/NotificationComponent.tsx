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

import { useSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { classes } from "@utils/misc";
import { React, useEffect, useMemo, useState, useStateFromStores, WindowStore } from "@webpack/common";

import { NotificationData } from "./Notifications";

export default ErrorBoundary.wrap(function NotificationComponent({
    title,
    body,
    richBody,
    color,
    icon,
    onClick,
    onClose,
    image,
    permanent,
    className,
    dismissOnClick
}: NotificationData & { className?: string; }) {
    const { timeout, position } = useSettings(["notifications.timeout", "notifications.position"]).notifications;
    const hasFocus = useStateFromStores([WindowStore], () => WindowStore.isFocused());

    const [isHover, setIsHover] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const start = useMemo(() => Date.now(), [timeout, isHover, hasFocus]);

    useEffect(() => {
        if (isHover || !hasFocus || timeout === 0 || permanent) return void setElapsed(0);

        const intervalId = setInterval(() => {
            const elapsed = Date.now() - start;
            if (elapsed >= timeout)
                onClose!();
            else
                setElapsed(elapsed);
        }, 10);

        return () => clearInterval(intervalId);
    }, [timeout, isHover, hasFocus]);

    const timeoutProgress = elapsed / timeout;

    return (
        <button
            className={classes("vc-notification-root", className)}
            style={position === "bottom-right" ? { bottom: "1rem" } : { top: "3rem" }}
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
            <div className="vc-notification">
                {icon && <img className="vc-notification-icon" src={icon} alt="" />}
                <div className="vc-notification-content">
                    <div className="vc-notification-header">
                        <h2 className="vc-notification-title">{title}</h2>
                        <button
                            className="vc-notification-close-btn"
                            onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose!();
                            }}
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                role="img"
                                aria-labelledby="vc-notification-dismiss-title"
                            >
                                <title id="vc-notification-dismiss-title">Dismiss Notification</title>
                                <path fill="currentColor" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z" />
                            </svg>
                        </button>
                    </div>
                    <div>
                        {richBody ?? <p className="vc-notification-p">{body}</p>}
                    </div>
                </div>
            </div>
            {image && <img className="vc-notification-img" src={image} alt="" />}
            {timeout !== 0 && !permanent && (
                <div
                    className="vc-notification-progressbar"
                    style={{ width: `${(1 - timeoutProgress) * 100}%`, backgroundColor: color || "var(--brand-experiment)" }}
                />
            )}
        </button>
    );
}, {
    onError: ({ props }) => props.onClose!()
});
