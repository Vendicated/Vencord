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

type Enum<T extends Record<string, string>> = {
    [k in keyof T]: T[k];
} & { [v in keyof T as T[v]]: v; };

function strEnum<T extends Record<string, string>>(obj: T): T {
    const o = {} as T;
    for (const key in obj) {
        o[key] = obj[key] as any;
        o[obj[key]] = key as any;
    }
    return Object.freeze(o);
}

export default strEnum({
    QUICK_CSS_UPDATE: "VencordQuickCssUpdate",
    GET_QUICK_CSS: "VencordGetQuickCss",
    SET_QUICK_CSS: "VencordSetQuickCss",
    GET_SETTINGS_DIR: "VencordGetSettingsDir",
    GET_SETTINGS: "VencordGetSettings",
    SET_SETTINGS: "VencordSetSettings",
    OPEN_EXTERNAL: "VencordOpenExternal",
    OPEN_QUICKCSS: "VencordOpenQuickCss",
    GET_UPDATES: "VencordGetUpdates",
    GET_REPO: "VencordGetRepo",
    UPDATE: "VencordUpdate",
    BUILD: "VencordBuild",
    OPEN_MONACO_EDITOR: "VencordOpenMonacoEditor",
} as const);
