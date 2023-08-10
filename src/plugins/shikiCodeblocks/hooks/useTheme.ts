/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
