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

import "./settingsStyles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { findByCodeLazy } from "@webpack";
import { Forms, Router, Text } from "@webpack/common";

import BackupRestoreTab from "./BackupRestoreTab";
import PluginsTab from "./PluginsTab";
import ThemesTab from "./ThemesTab";
import Updater from "./Updater";
import VencordSettings from "./VencordTab";

const st = (style: string) => `vcSettings${style}`;

const TabBar = findByCodeLazy('[role="tab"][aria-disabled="false"]');

interface SettingsProps {
    tab: string;
}

interface SettingsTab {
    name: string;
    component?: React.ComponentType;
}

const SettingsTabs: Record<string, SettingsTab> = {
    VencordSettings: { name: "Vencord", component: () => <VencordSettings /> },
    VencordPlugins: { name: "Plugins", component: () => <PluginsTab /> },
    VencordThemes: { name: "Themes", component: () => <ThemesTab /> },
    VencordUpdater: { name: "Updater" }, // Only show updater if IS_WEB is false
    VencordSettingsSync: { name: "Backup & Restore", component: () => <BackupRestoreTab /> },
};

if (!IS_WEB) SettingsTabs.VencordUpdater.component = () => Updater && <Updater />;

function Settings(props: SettingsProps) {
    const { tab = "VencordSettings" } = props;

    const CurrentTab = SettingsTabs[tab]?.component;

    return <Forms.FormSection>
        <Text variant="heading-md/normal" tag="h2">Vencord Settings</Text>

        <TabBar
            type={TabBar.Types.TOP}
            look={TabBar.Looks.BRAND}
            className={st("TabBar")}
            selectedItem={tab}
            onItemSelect={Router.open}
        >
            {Object.entries(SettingsTabs).map(([key, { name, component }]) => {
                if (!component) return null;
                return <TabBar.Item
                    id={key}
                    className={st("TabBarItem")}
                    key={key}>
                    {name}
                </TabBar.Item>;
            })}
        </TabBar>
        <Forms.FormDivider />
        {CurrentTab && <CurrentTab />}
    </Forms.FormSection >;
}

export default function (props: SettingsProps) {
    return <ErrorBoundary>
        <Settings tab={props.tab} />
    </ErrorBoundary>;
}
