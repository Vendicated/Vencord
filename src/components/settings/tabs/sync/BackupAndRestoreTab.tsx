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

import { downloadSettingsBackup, uploadSettingsBackup } from "@api/SettingsSync/offline";
import { Alert } from "@components/Alert";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";

function BackupAndRestoreTab() {
    return (
        <SettingsTab title="Backup & Restore">
            <Flex flexDirection="column" gap="0.5em">
                <Alert.Warning>
                    Importing a settings file will overwrite your current settings.
                </Alert.Warning>

                <Paragraph className={Margins.bottom8}>
                    You can import and export your Vencord settings as a JSON file.
                    This allows you to easily transfer your settings to another device,
                    or recover your settings after reinstalling Vencord or Discord.
                </Paragraph>

                <Heading tag="h4">Settings Export contains:</Heading>
                <Paragraph className={Margins.bottom8}>
                    <ul>
                        <li>&mdash; Custom QuickCSS</li>
                        <li>&mdash; Theme Links</li>
                        <li>&mdash; Plugin Settings</li>
                    </ul>
                </Paragraph>

                <Flex>
                    <Button
                        onClick={() => uploadSettingsBackup()}
                        size="small"
                    >
                        Import Settings
                    </Button>
                    <Button
                        onClick={() => downloadSettingsBackup("settings")}
                        size="small"
                    >
                        Export Settings
                    </Button>
                    <Button
                        onClick={() => downloadSettingsBackup("plugins")}
                        size="small"
                    >
                        Export Plugins
                    </Button>
                    <Button
                        onClick={() => downloadSettingsBackup("css")}
                        size="small"
                    >
                        Export CSS
                    </Button>
                    <Button
                        onClick={() => downloadSettingsBackup("datastore")}
                        size="small"
                    >
                        Export DataStores
                    </Button>
                </Flex>
            </Flex>
        </SettingsTab >
    );
}

export default wrapTab(BackupAndRestoreTab, "Backup & Restore");
