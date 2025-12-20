/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
