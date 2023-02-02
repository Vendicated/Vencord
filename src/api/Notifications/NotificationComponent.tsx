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
import { Forms, useEffect, useMemo, useState } from "@webpack/common";

import { NotificationData } from "./Notifications";

interface Props extends NotificationData {
    onClose(): void;
    id: number;
}

export default ErrorBoundary.wrap(function NotificationComponent({
    title,
    body,
    color,
    icon,
    onClick,
    onClose,
    id
}: Props) {
    const { timeout } = useSettings(["notifications.timeout"]).notifications;

    const [isHover, setIsHover] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const start = useMemo(() => Date.now(), [id, timeout, isHover]);

    useEffect(() => {
        if (isHover) return void setElapsed(0);

        const intervalId = setInterval(() => {
            const elapsed = Date.now() - start;
            if (elapsed >= timeout)
                onClose();
            else
                setElapsed(elapsed);
        }, 10);

        return () => clearInterval(intervalId);
    }, [timeout, id, isHover]);

    const timeoutProgress = elapsed / timeout;

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
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            <div className="vc-notification">
                {icon && <img src={icon} alt="" />}
                <div className="vc-notification-content">
                    <Forms.FormTitle tag="h2">{title}</Forms.FormTitle>
                    <div>
                        {typeof body === "string" ? <p className="vc-notification-p">{body}</p> : body}
                    </div>
                </div>
            </div>
            <div className="vc-notification-progressbar" style={{ width: `${(1 - timeoutProgress) * 100}%` }} />
        </button>
    );
});
