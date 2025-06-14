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

export const enum IpcEvents {
    OPEN_QUICKCSS = "VencordOpenQuickCss",
    GET_QUICK_CSS = "VencordGetQuickCss",
    SET_QUICK_CSS = "VencordSetQuickCss",
    QUICK_CSS_UPDATE = "VencordQuickCssUpdate",

    GET_SETTINGS = "VencordGetSettings",
    SET_SETTINGS = "VencordSetSettings",

    GET_THEMES_LIST = "VencordGetThemesList",
    GET_THEME_DATA = "VencordGetThemeData",
    GET_THEME_SYSTEM_VALUES = "VencordGetThemeSystemValues",
    UPLOAD_THEME = "VencordUploadTheme",
    DELETE_THEME = "VencordDeleteTheme",
    THEME_UPDATE = "VencordThemeUpdate",

    OPEN_EXTERNAL = "VencordOpenExternal",
    OPEN_THEMES_FOLDER = "VencordOpenThemesFolder",
    OPEN_SETTINGS_FOLDER = "VencordOpenSettingsFolder",

    GET_UPDATES = "VencordGetUpdates",
    GET_REPO = "VencordGetRepo",
    UPDATE = "VencordUpdate",
    BUILD = "VencordBuild",

    OPEN_MONACO_EDITOR = "VencordOpenMonacoEditor",

    GET_PLUGIN_IPC_METHOD_MAP = "VencordGetPluginIpcMethodMap",

    OPEN_IN_APP__RESOLVE_REDIRECT = "VencordOIAResolveRedirect",
    VOICE_MESSAGES_READ_RECORDING = "VencordVMReadRecording",

    CSP_IS_DOMAIN_ALLOWED = "VencordCspIsDomainAllowed",
    CSP_REMOVE_OVERRIDE = "VencordCspRemoveOverride",
    CSP_REQUEST_ADD_OVERRIDE = "VencordCspRequestAddOverride",
}
