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

import { React, useEffect, useRef } from "@webpack/common";

let player: symbol | null = null;
const dispatchers = new Set<React.DispatchWithoutAction>();

export function usePlayer() {
    const playerRef = useRef(Symbol());

    const [, update] = React.useReducer(() => ({}), {});
    useEffect(() => {
        dispatchers.add(update);
        return () => void dispatchers.delete(update);
    }, []);

    const playing = player === playerRef.current;
    const play = () => {
        player = playerRef.current;
        dispatchers.forEach(d => d());
    };

    return [playing, play] as const;
}
