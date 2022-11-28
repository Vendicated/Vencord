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
type ThemeId = Shiki["currentThemeUrl"];
type Theme = Shiki["currentTheme"];

type ThemeState = {
    id: ThemeId,
    theme: Theme,
};

const memoState: ThemeState = {
    id: null,
    theme: null,
};

const themeDispatchers = new Set<React.DispatchWithoutAction>();

export const useTheme = (): ThemeState => {
    const [, dispatch] = React.useReducer(() => { }, void 0);

    React.useEffect(() => {
        themeDispatchers.add(dispatch);
        return () => void themeDispatchers.delete(dispatch);
    }, []);

    return memoState;
};

export const dispatchTheme = (state: ThemeState) => {
    if (memoState.id === state.id) return;
    Object.assign(memoState, state);
    themeDispatchers.forEach(dispatch => dispatch());
};
