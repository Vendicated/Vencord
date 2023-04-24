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

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { handleComponentFailed } from "@components/handleComponentFailed";
import { isMobile } from "@utils/misc";
import { Forms, SettingsRouter, TabBar, Text } from "@webpack/common";

import BackupRestoreTab from "./BackupRestoreTab";
import CloudTab from "./CloudTab";
import PluginsTab from "./PluginsTab";
import ThemesTab from "./ThemesTab";
import Updater from "./Updater";
import VencordSettings from "./VencordTab";

const cl = classNameFactory("vc-settings-");

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
    VencordCloud: { name: "Cloud", component: () => <CloudTab /> },
    VencordSettingsSync: { name: "Backup & Restore", component: () => <BackupRestoreTab /> }
};

if (!IS_WEB) SettingsTabs.VencordUpdater.component = () => Updater && <Updater />;

function Settings(props: SettingsProps) {
    const { tab = "VencordSettings" } = props;

    const CurrentTab = SettingsTabs[tab]?.component ?? null;
    if (isMobile) {
        return CurrentTab && <CurrentTab />;
    }

    return <Forms.FormSection>
        <Text variant="heading-lg/semibold" style={{ color: "var(--header-primary)" }} tag="h2">Vencord Settings</Text>

        <TabBar
            type="top"
            look="brand"
            className={cl("tab-bar")}
            selectedItem={tab}
            onItemSelect={SettingsRouter.open}
        >
            {Object.entries(SettingsTabs).map(([key, { name, component }]) => {
                if (!component) return null;
                return <TabBar.Item
                    id={key}
                    className={cl("tab-bar-item")}
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
    return <ErrorBoundary onError={handleComponentFailed}>
        <Settings tab={props.tab} />
    </ErrorBoundary>;
}
