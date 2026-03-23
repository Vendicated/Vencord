/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { BackupRestoreIcon, CloudIcon, LogIcon, MainSettingsIcon, PaintbrushIcon, PatchHelperIcon, PluginsIcon, UpdaterIcon } from "@components/Icons";
import {
    BackupAndRestoreTab,
    ChangelogTab,
    CloudTab,
    PatchHelperTab,
    PluginsTab,
    ThemesTab,
    UpdaterTab,
    VencordTab,
} from "@components/settings";
import { gitHashShort } from "@shared/vencordUserAgent";
import { Devs } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import definePlugin, { IconProps, OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { React } from "@webpack/common";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

const enum LayoutType {
    ROOT = 0,
    SECTION = 1,
    SIDEBAR_ITEM = 2,
    PANEL = 3,
    SPLIT = 4,
    CATEGORY = 5,
    ACCORDION = 6,
    LIST = 7,
    RELATED = 8,
    FIELD_SET = 9,
    TAB_ITEM = 10,
    STATIC = 11,
    BUTTON = 12,
    TOGGLE = 13,
    SLIDER = 14,
    SELECT = 15,
    RADIO = 16,
    NAVIGATOR = 17,
    CUSTOM = 18
}

let LayoutTypes = {
    SECTION: 1,
    SIDEBAR_ITEM: 2,
    PANEL: 3,
    CATEGORY: 5,
    CUSTOM: 19,
};
waitFor(["SECTION", "SIDEBAR_ITEM", "PANEL", "CUSTOM"], v => LayoutTypes = v);

const enum SectionType {
    HEADER = "HEADER",
    DIVIDER = "DIVIDER",
    CUSTOM = "CUSTOM"
}

type SettingsLocation =
    | "top"
    | "aboveNitro"
    | "belowNitro"
    | "aboveActivity"
    | "belowActivity"
    | "bottom";

interface SettingsLayoutNode {
    type: LayoutType;
    key?: string;
    legacySearchKey?: string;
    getLegacySearchKey?(): string;
    useLabel?(): string;
    useTitle?(): string;
    buildLayout?(): SettingsLayoutNode[];
    icon?(): ReactNode;
    render?(): ReactNode;
    StronglyDiscouragedCustomComponent?(): ReactNode;
}

interface EntryOptions {
    key: string;
    title: string;
    panelTitle?: string;
    Component: ComponentType<{}>;
    Icon: ComponentType<IconProps>;
}

interface SettingsLayoutBuilder {
    key?: string;
    buildLayout(): SettingsLayoutNode[];
}

const settings = definePluginSettings({
    settingsLocation: {
        type: OptionType.SELECT,
        description: "Where to put the Equicord settings section",
        options: [
            { label: "At the very top", value: "top" },
            { label: "Above the Nitro section", value: "aboveNitro", default: true },
            { label: "Below the Nitro section", value: "belowNitro" },
            { label: "Above Activity Settings", value: "aboveActivity" },
            { label: "Below Activity Settings", value: "belowActivity" },
            { label: "At the very bottom", value: "bottom" },
        ] as { label: string; value: SettingsLocation; default?: boolean; }[]
    }
});

const settingsSectionMap: [string, string][] = [
    ["EquicordSettings", "equicord_main_panel"],
    ["EquicordPlugins", "equicord_plugins_panel"],
    ["EquicordThemes", "equicord_themes_panel"],
    ["EquicordUpdater", "equicord_updater_panel"],
    ["EquicordChangelog", "equicord_changelog_panel"],
    ["EquicordCloud", "equicord_cloud_panel"],
    ["EquicordBackupAndRestore", "equicord_backup_restore_panel"],
    ["EquicordPatchHelper", "equicord_patch_helper_panel"],
    ["EquibopSettings", "equicord_equibop_settings_panel"],
];

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    required: true,

    settings,
    settingsSectionMap,

    patches: [
        {
            find: "#{intl::COPY_VERSION}",
            replacement: [
                {
                    match: /\.RELEASE_CHANNEL/,
                    replace: "$&.replace(/^./, c => c.toUpperCase())"
                },
                {
                    match: /"text-xxs\/normal".{0,300}?(?=null!=(\i)&&(.{0,20}\i\.Text.{0,200}?,children:).{0,15}?("span"),({className:\i\.\i,children:\["Build Override: ",\1\.id\]\})\)\}\))/,
                    replace: (m, _buildOverride, makeRow, component, props) => {
                        props = props.replace(/children:\[.+\]/, "");
                        return `${m},$self.makeInfoElements(${component},${props}).map(e=>${makeRow}e})),`;
                    }
                },
                {
                    match: /copyValue:\i\.join\(" "\)/g,
                    replace: "$& + $self.getInfoString()"
                }
            ]
        },
        {
            find: ".buildLayout().map",
            replacement: {
                match: /(\i)\.buildLayout\(\)(?=\.map)/,
                replace: "$self.buildLayout($1)"
            }
        }
    ],

    buildEntry(options: EntryOptions): SettingsLayoutNode {
        const { key, title, panelTitle = title, Component, Icon } = options;

        const panel: SettingsLayoutNode = {
            key: key + "_panel",
            type: LayoutTypes.PANEL,
            useTitle: () => panelTitle,
            buildLayout: () => [{
                type: LayoutTypes.CATEGORY,
                key: key + "_category",
                buildLayout: () => [{
                    type: LayoutTypes.CUSTOM,
                    key: key + "_custom",
                    Component: Component,
                    useSearchTerms: () => [title]
                }]
            }]
        };

        return ({
            key,
            type: LayoutTypes.SIDEBAR_ITEM,
            useTitle: () => title,
            icon: () => <Icon width={20} height={20} />,
            buildLayout: () => [panel]
        });
    },

    getSettingsSectionMappings() {
        return settingsSectionMap;
    },

    buildLayout(originalLayoutBuilder: SettingsLayoutBuilder) {
        const layout = originalLayoutBuilder.buildLayout();
        if (originalLayoutBuilder.key !== "$Root") return layout;
        if (!Array.isArray(layout)) return layout;
        if (layout.some(s => s?.key === "equicord_section")) return layout;

        const { buildEntry } = this;

        const equicordEntries: SettingsLayoutNode[] = [
            buildEntry({
                key: "equicord_main",
                title: "Equicord",
                panelTitle: "Equicord Settings",
                Component: VencordTab,
                Icon: MainSettingsIcon
            }),
            buildEntry({
                key: "equicord_plugins",
                title: "Plugins",
                Component: PluginsTab,
                Icon: PluginsIcon
            }),
            buildEntry({
                key: "equicord_themes",
                title: "Themes",
                Component: ThemesTab,
                Icon: PaintbrushIcon
            }),
            !IS_UPDATER_DISABLED && UpdaterTab && buildEntry({
                key: "equicord_updater",
                title: "Updater",
                panelTitle: "Equicord Updater",
                Component: UpdaterTab,
                Icon: UpdaterIcon
            }),
            buildEntry({
                key: "equicord_changelog",
                title: "Changelog",
                Component: ChangelogTab,
                Icon: LogIcon,
            }),
            buildEntry({
                key: "equicord_cloud",
                title: "Cloud",
                panelTitle: "Equicord Cloud",
                Component: CloudTab,
                Icon: CloudIcon
            }),
            buildEntry({
                key: "equicord_backup_restore",
                title: "Backup & Restore",
                Component: BackupAndRestoreTab,
                Icon: BackupRestoreIcon
            }),
            IS_DEV && PatchHelperTab && buildEntry({
                key: "equicord_patch_helper",
                title: "Patch Helper",
                Component: PatchHelperTab,
                Icon: PatchHelperIcon
            }),
            ...this.customEntries.map(buildEntry)
        ].filter(isTruthy);

        const equicordSection: SettingsLayoutNode = {
            key: "equicord_section",
            type: LayoutTypes.SECTION,
            useTitle: () => "Equicord Settings",
            buildLayout: () => equicordEntries
        };

        const { settingsLocation } = settings.store;

        const places: Record<SettingsLocation, string> = {
            top: "user_section",
            aboveNitro: "billing_section",
            belowNitro: "billing_section",
            aboveActivity: "activity_section",
            belowActivity: "activity_section",
            bottom: "logout_section"
        };

        const key = places[settingsLocation] ?? places.top;
        let idx = layout.findIndex(s => typeof s?.key === "string" && s.key === key);

        if (idx === -1) {
            idx = 2;
        } else if (settingsLocation.startsWith("below")) {
            idx += 1;
        }

        layout.splice(idx, 0, equicordSection);

        return layout;
    },

    customSections: [] as ((SectionTypes: Record<string, string>) => { section: string; element: ComponentType; label: string; id?: string; })[],
    customEntries: [] as EntryOptions[],

    get electronVersion() {
        return VencordNative.native.getVersions().electron ?? window.legcord?.electron ?? null;
    },

    get chromiumVersion() {
        try {
            return (
                VencordNative.native.getVersions().chrome ??
                // @ts-expect-error userAgentData types
                navigator.userAgentData?.brands?.find(
                    (b: { brand: string; }) => b.brand === "Chromium" || b.brand === "Google Chrome",
                )?.version ??
                null
            );
        } catch {
            return null;
        }
    },

    getVersionInfo(support = true) {
        let version = "";

        if (IS_DEV) version = "Dev Build";
        if (IS_WEB) version = "Web";
        if (IS_VESKTOP) version = `Vesktop v${VesktopNative.app.getVersion()}`;
        if (IS_EQUIBOP) version = `Equibop v${VesktopNative.app.getVersion()}`;
        if (IS_STANDALONE) version = "Standalone";

        return support && version ? ` (${version})` : version;
    },

    getInfoRows() {
        const { electronVersion, chromiumVersion, getVersionInfo } = this;

        const rows = [`Equicord ${gitHashShort}${getVersionInfo()}`];

        if (electronVersion) rows.push(`Electron ${electronVersion}`);
        if (chromiumVersion) rows.push(`Chromium ${chromiumVersion}`);

        return rows;
    },

    getInfoString() {
        return "\n" + this.getInfoRows().join("\n");
    },

    makeInfoElements(
        Component: ComponentType<React.PropsWithChildren>,
        props: PropsWithChildren,
    ) {
        return this.getInfoRows().map((text, i) => (
            <Component key={i} {...props}>
                {text}
            </Component>
        ));
    },
});
