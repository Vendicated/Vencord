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
import { Forms, useEffect, useMemo, useState } from "@webpack/common";

import { NotificationData } from "./Notifications";

interface Props extends NotificationData {
    onClose(): void;
}

export default ErrorBoundary.wrap(function NotificationComponent({
    title,
    body,
    color = "var(--color-brand)",
    icon,
    timeoutMs = 5000,
    onClick,
    onClose
}: Props) {
    const start = useMemo(() => Date.now(), []);
    const [timeoutProgress, setTimeoutProgress] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const elapsed = Date.now() - start;
            setTimeoutProgress(elapsed / timeoutMs);
        }, 10);

        const timeoutId = setTimeout(onClose, timeoutMs);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [timeoutMs]);

    return (
        <button
            className="vc-notification-root"
            style={{ "--vc-color": color } as any}
            onClick={onClick}
            onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }}
        >
            <div className="vc-notification">
                {icon && <img src={icon} alt="" />}
                <div className="vc-notification-content">
                    <Forms.FormTitle tag="h2">{title}</Forms.FormTitle>
                    <div>
                        {body}
                    </div>
                </div>
            </div>
            <div className="vc-notification-progressbar">
                <div className="vc-notification-progressbar-inner" style={{ transform: `scaleX(${1 - timeoutProgress})` }} />
            </div>
        </button>
    );
});
