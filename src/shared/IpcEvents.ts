/*
 * Claudecord, a modification for Discord's desktop app
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
    INIT_FILE_WATCHERS = "ClaudecordInitFileWatchers",

    OPEN_QUICKCSS = "ClaudecordOpenQuickCss",
    GET_QUICK_CSS = "ClaudecordGetQuickCss",
    SET_QUICK_CSS = "ClaudecordSetQuickCss",
    QUICK_CSS_UPDATE = "ClaudecordQuickCssUpdate",

    GET_SETTINGS = "ClaudecordGetSettings",
    SET_SETTINGS = "ClaudecordSetSettings",

    GET_THEMES_LIST = "ClaudecordGetThemesList",
    GET_THEME_DATA = "ClaudecordGetThemeData",
    GET_THEME_SYSTEM_VALUES = "ClaudecordGetThemeSystemValues",
    THEME_UPDATE = "ClaudecordThemeUpdate",

    OPEN_EXTERNAL = "ClaudecordOpenExternal",
    OPEN_THEMES_FOLDER = "ClaudecordOpenThemesFolder",
    OPEN_SETTINGS_FOLDER = "ClaudecordOpenSettingsFolder",

    GET_UPDATES = "ClaudecordGetUpdates",
    GET_REPO = "ClaudecordGetRepo",
    UPDATE = "ClaudecordUpdate",
    BUILD = "ClaudecordBuild",

    OPEN_MONACO_EDITOR = "ClaudecordOpenMonacoEditor",
    GET_MONACO_THEME = "ClaudecordGetMonacoTheme",

    GET_PLUGIN_IPC_METHOD_MAP = "ClaudecordGetPluginIpcMethodMap",

    CSP_IS_DOMAIN_ALLOWED = "ClaudecordCspIsDomainAllowed",
    CSP_REMOVE_OVERRIDE = "ClaudecordCspRemoveOverride",
    CSP_REQUEST_ADD_OVERRIDE = "ClaudecordCspRequestAddOverride",

    GET_RENDERER_CSS = "ClaudecordGetRendererCss",
    RENDERER_CSS_UPDATE = "ClaudecordRendererCssUpdate",
    PRELOAD_GET_RENDERER_JS = "ClaudecordPreloadGetRendererJs",

    SUPPORTS_WINDOWS_MATERIAL = "ClaudecordSupportsWindowsMaterial",
}
