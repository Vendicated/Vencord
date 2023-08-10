/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const enum IpcEvents {
    QUICK_CSS_UPDATE = "VencordQuickCssUpdate",
    THEME_UPDATE = "VencordThemeUpdate",
    GET_QUICK_CSS = "VencordGetQuickCss",
    SET_QUICK_CSS = "VencordSetQuickCss",
    UPLOAD_THEME = "VencordUploadTheme",
    DELETE_THEME = "VencordDeleteTheme",
    GET_THEMES_DIR = "VencordGetThemesDir",
    GET_THEMES_LIST = "VencordGetThemesList",
    GET_THEME_DATA = "VencordGetThemeData",
    GET_SETTINGS_DIR = "VencordGetSettingsDir",
    GET_SETTINGS = "VencordGetSettings",
    SET_SETTINGS = "VencordSetSettings",
    OPEN_EXTERNAL = "VencordOpenExternal",
    OPEN_QUICKCSS = "VencordOpenQuickCss",
    GET_UPDATES = "VencordGetUpdates",
    GET_REPO = "VencordGetRepo",
    UPDATE = "VencordUpdate",
    BUILD = "VencordBuild",
    OPEN_MONACO_EDITOR = "VencordOpenMonacoEditor",

    OPEN_IN_APP__RESOLVE_REDIRECT = "VencordOIAResolveRedirect",
    VOICE_MESSAGES_READ_RECORDING = "VencordVMReadRecording",
}
