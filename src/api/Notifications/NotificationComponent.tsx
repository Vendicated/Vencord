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
import { Forms, React, useEffect, useMemo, useState, useStateFromStores, WindowStore } from "@webpack/common";

import { NotificationData } from "./Notifications";

export default ErrorBoundary.wrap(function NotificationComponent({
    title,
    body,
    richBody,
    color,
    icon,
    onClick,
    onClose,
    image
}: NotificationData) {
    const { timeout, position } = useSettings(["notifications.timeout", "notifications.position"]).notifications;
    const hasFocus = useStateFromStores([WindowStore], () => WindowStore.isFocused());

    const [isHover, setIsHover] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const start = useMemo(() => Date.now(), [timeout, isHover, hasFocus]);

    useEffect(() => {
        if (isHover || !hasFocus || timeout === 0) return void setElapsed(0);

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
            className="vc-notification-root"
            style={position === "bottom-right" ? { bottom: "1rem" } : { top: "3rem" }}
            onClick={onClick}
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
                    <Forms.FormTitle tag="h2">{title}</Forms.FormTitle>
                    <div>
                        {richBody ?? <p className="vc-notification-p">{body}</p>}
                    </div>
                </div>
            </div>
            {image && <img className="vc-notification-img" src={image} alt="" />}
            {timeout !== 0 && (
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
