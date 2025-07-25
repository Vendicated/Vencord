/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "../winampStyles.css";

import { classNameFactory } from "@api/Styles";
import { ContextMenuApi, FluxDispatcher, Menu, React, useEffect, useState, useStateFromStores } from "@webpack/common";

import { settings } from "..";
import { WinampStore } from "../WinampStore";
import { Controls } from "./Controls";
import { ProgressBar } from "./ProgressBar";
import { TrackInfo } from "./TrackInfo";
import { Volume } from "./Volume";

const cl = classNameFactory("vc-winamp-");

function WinampContextMenu() {
    return (
        <Menu.Menu
            navId="winamp-context-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Winamp Player Menu"
        >
            <Menu.MenuControlItem
                id="winamp-progress"
                key="winamp-progress"
                label="Progress"
                control={(props, ref) => (
                    <ProgressBar {...props}
                        disableHoverEffects ref={ref} />
                )}
            />
        </Menu.Menu>
    );
}

function makeContextMenu() {
    return (e: React.MouseEvent<HTMLElement, MouseEvent>) =>
        ContextMenuApi.openContextMenu(e, () => <WinampContextMenu />);
}

export function Player() {
    const [track, volume, isPlaying] = useStateFromStores(
        [WinampStore],
        () => [WinampStore.track, WinampStore.volume, WinampStore.isPlaying]
    );

    const [shouldHide, setShouldHide] = useState(false);

    // Hide player if Winamp is not available
    useEffect(() => {
        const isWinampAvailable = track !== null;
        setShouldHide(!isWinampAvailable && !isPlaying);
    }, [track, isPlaying]);

    if (shouldHide || !track) return null;

    return (
        <div id={cl("player")} onContextMenu={makeContextMenu()}>
            <TrackInfo track={track} />
            <Volume volume={volume} />
            <Controls />
            {settings.store.showSeeker && < ProgressBar />}
        </div>
    );
}
