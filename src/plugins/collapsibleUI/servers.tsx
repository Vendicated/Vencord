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

import { useForceUpdater } from "@utils/react";
import { useEffect, useState } from "@webpack/common";

import { HeaderBarIcon, settings } from ".";

let stateChanged: (() => void) | null;

export function ServersWrapper({ Component, props }: { Component: React.ElementType<any>; props: React.HTMLAttributes<any>; }) {
    const updater = useForceUpdater();
    useEffect(() => {
        stateChanged = updater;
        return () => { stateChanged = null; };
    });

    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const mouseEvent = (event: MouseEvent) => setRevealed(settings.store.reveal && event.x <= (revealed ? 68 : 6));
        document.addEventListener("mousemove", mouseEvent);
        return () => document.removeEventListener("mousemove", mouseEvent);
    });

    const classes = [props.className, "vc-guilds"];
    if (!settings.store.servers) {
        classes.push("vc-collapsed");
        if (revealed)
            classes.push("vc-revealed");
    }

    return <Component {...props} className={classes.join(" ")} />;
}

export function ToggleServersButton() {
    const update = useForceUpdater();
    return (
        <HeaderBarIcon
            tooltip={settings.store.servers ? "Hide Servers" : "Show Servers"}
            icon={ServersIcon}
            selected={settings.store.servers}
            onClick={() => {
                settings.store.servers = !settings.store.servers;
                stateChanged?.();
                update();
            }}
        />
    );
}

function ServersIcon({ width, height, className }: { width: number, height: number, className: string; }) {
    return (
        <svg width={width} height={height} className={className} viewBox="0 0 24 24">
            <g fill={"currentColor"}>
                <circle cx="16.9804" cy="7.01942" r="4.01942"></circle>
                <circle cx="16.9804" cy="16.9805" r="4.01942"></circle>
                <circle cx="7.01942" cy="16.9805" r="4.01942"></circle>
                <rect x="3" y="3" width="8.03884" height="8.03884" rx="2"></rect>
            </g>
        </svg>
    );
}
