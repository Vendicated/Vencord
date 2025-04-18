/*
 * Tallycord, a modification for Discord's desktop app
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

export const enum IpcEvents {
    QUICK_CSS_UPDATE = "TallycordQuickCssUpdate",
    THEME_UPDATE = "TallycordThemeUpdate",
    GET_QUICK_CSS = "TallycordGetQuickCss",
    SET_QUICK_CSS = "TallycordSetQuickCss",
    UPLOAD_THEME = "TallycordUploadTheme",
    DELETE_THEME = "TallycordDeleteTheme",
    GET_THEMES_DIR = "TallycordGetThemesDir",
    GET_THEMES_LIST = "TallycordGetThemesList",
    GET_THEME_DATA = "TallycordGetThemeData",
    GET_THEME_SYSTEM_VALUES = "TallycordGetThemeSystemValues",
    GET_SETTINGS_DIR = "TallycordGetSettingsDir",
    GET_SETTINGS = "TallycordGetSettings",
    SET_SETTINGS = "TallycordSetSettings",
    OPEN_EXTERNAL = "TallycordOpenExternal",
    OPEN_QUICKCSS = "TallycordOpenQuickCss",
    GET_UPDATES = "TallycordGetUpdates",
    GET_REPO = "TallycordGetRepo",
    UPDATE = "TallycordUpdate",
    BUILD = "TallycordBuild",
    OPEN_MONACO_EDITOR = "TallycordOpenMonacoEditor",

    GET_PLUGIN_IPC_METHOD_MAP = "TallycordGetPluginIpcMethodMap",

    OPEN_IN_APP__RESOLVE_REDIRECT = "TallycordOIAResolveRedirect",
    VOICE_MESSAGES_READ_RECORDING = "TallycordVMReadRecording",
}
