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

import "./styles.css";

import { Link } from "@components/Link";
import { handleSettingsTabError, SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { ModalCloseButton, ModalContent, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { getStylusWebStoreUrl } from "@utils/web";
import { Card, Forms, React, TabBar, useState } from "@webpack/common";

import { CspErrorCard } from "./CspErrorCard";
import { LocalThemesTab } from "./LocalThemesTab";
import { OnlineThemesTab } from "./OnlineThemesTab";

const enum ThemeTab {
    LOCAL,
    ONLINE
}

function ThemesTab() {
    const [currentTab, setCurrentTab] = useState(ThemeTab.LOCAL);

    return (
        <SettingsTab title="Themes">
            <TabBar
                type="top"
                look="brand"
                className="vc-settings-tab-bar"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={ThemeTab.LOCAL}
                >
                    Local Themes
                </TabBar.Item>
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={ThemeTab.ONLINE}
                >
                    Online Themes
                </TabBar.Item>
            </TabBar>

            <CspErrorCard />

            {currentTab === ThemeTab.LOCAL && <LocalThemesTab />}
            {currentTab === ThemeTab.ONLINE && <OnlineThemesTab />}
        </SettingsTab>
    );
}

function UserscriptThemesTab() {
    return (
        <SettingsTab title="Themes">
            <Card className="vc-settings-card">
                <Forms.FormTitle tag="h5">Themes are not supported on the Userscript!</Forms.FormTitle>

                <Forms.FormText>
                    You can instead install themes with the <Link href={getStylusWebStoreUrl()}>Stylus extension</Link>!
                </Forms.FormText>
            </Card>
        </SettingsTab>
    );
}

const Tab = IS_USERSCRIPT
    ? wrapTab(UserscriptThemesTab, "Themes")
    : wrapTab(ThemesTab, "Themes");

export default Tab;

export function openThemeModal() {
    try {
        openModal(wrapTab((modalProps: ModalProps) => (
            <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
                <ModalContent className="vc-updater-modal">
                    <ModalCloseButton onClick={modalProps.onClose} className="vc-updater-modal-close-button" />
                    <Tab />
                </ModalContent>
            </ModalRoot>
        ), "UpdaterModal"));
    } catch {
        handleSettingsTabError();
    }
}
