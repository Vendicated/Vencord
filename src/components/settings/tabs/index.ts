/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

export { default as ThemesTab } from "../../ThemeSettings/ThemesTab";
export * from "./BaseTab";
export { default as ChangelogTab } from "./changelog";
export { default as PatchHelperTab } from "./patchHelper";
export { default as PluginsTab } from "./plugins";
export { openContributorModal } from "./plugins/ContributorModal";
export { openPluginModal } from "./plugins/PluginModal";
export { default as BackupAndRestoreTab } from "./sync/BackupAndRestoreTab";
export { default as CloudTab } from "./sync/CloudTab";
export { default as UpdaterTab } from "./updater";
export { default as VencordTab } from "./vencord";
