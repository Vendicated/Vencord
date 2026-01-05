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

import { React } from "@webpack/common";

type Shiki = typeof import("../api/shiki").shiki;
interface ThemeState {
    id: Shiki["currentThemeUrl"],
    theme: Shiki["currentTheme"],
}

const currentTheme: ThemeState = {
    id: null,
    theme: null,
};

const themeSetters = new Set<React.Dispatch<React.SetStateAction<ThemeState>>>();

export const useTheme = (): ThemeState => {
    const [, setTheme] = React.useState<ThemeState>(currentTheme);

    React.useEffect(() => {
        themeSetters.add(setTheme);
        return () => void themeSetters.delete(setTheme);
    }, []);

    return currentTheme;
};

export function dispatchTheme(state: ThemeState) {
    if (currentTheme.id === state.id) return;
    Object.assign(currentTheme, state);
    themeSetters.forEach(setTheme => setTheme(state));
}
