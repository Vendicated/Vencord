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

import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { classes } from "@utils/misc";
import { useEffect, useMemo, useState, useStateFromStores, WindowStore } from "@webpack/common";
import type { SetRequired } from "type-fest";

import type { NotificationData } from "./Notifications";

const cl = classNameFactory("vc-notification-");

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
}: SetRequired<NotificationData, "onClose"> & { className?: string; }) {
    const { timeout, position } = useSettings(["notifications.timeout", "notifications.position"]).notifications;
    const hasFocus = useStateFromStores([WindowStore], () => WindowStore.isFocused());

    const [isHover, setIsHover] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const start = useMemo(() => Date.now(), [timeout, isHover, hasFocus]);

    useEffect(() => {
        if (isHover || !hasFocus || timeout === 0 || permanent) {
            setElapsed(0);
            return;
        }

        const intervalId = setInterval(() => {
            const elapsed = Date.now() - start;
            if (elapsed >= timeout)
                onClose();
            else
                setElapsed(elapsed);
        }, 10);

        return () => { clearInterval(intervalId); };
    }, [timeout, isHover, hasFocus]);

    const timeoutProgress = elapsed / timeout;

    return (
        <button
            className={classes(cl("root"), className)}
            style={position === "bottom-right" ? { bottom: "1rem" } : { top: "3rem" }}
            onClick={() => {
                onClick?.();
                if (dismissOnClick !== false)
                    onClose();
            }}
            onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }}
            onMouseEnter={() => { setIsHover(true); }}
            onMouseLeave={() => { setIsHover(false); }}
        >
            <div className="vc-notification">
                {icon && <img className={cl("icon")} src={icon} alt="" />}
                <div className={cl("content")}>
                    <div className={cl("header")}>
                        <h2 className={cl("title")}>{title}</h2>
                        <button
                            className={cl("close-btn")}
                            onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose();
                            }}
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                role="img"
                                aria-labelledby={cl("dismiss-title")}
                            >
                                <title id={cl("dismiss-title")}>Dismiss Notification</title>
                                <path d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z" />
                            </svg>
                        </button>
                    </div>
                    <div>
                        {richBody ?? <p className={cl("p")}>{body}</p>}
                    </div>
                </div>
            </div>
            {image && <img className={cl("img")} src={image} alt="" />}
            {timeout !== 0 && !permanent && (
                <div
                    className={cl("progressbar")}
                    style={{ width: `${(1 - timeoutProgress) * 100}%`, backgroundColor: color || "var(--brand-500)" }}
                />
            )}
        </button>
    );
}, {
    onError: ({ props }) => { props.onClose(); }
});
