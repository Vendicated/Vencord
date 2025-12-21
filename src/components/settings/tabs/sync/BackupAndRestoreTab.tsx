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
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";

function BackupAndRestoreTab() {
    return (
        <SettingsTab>
            <Heading className={Margins.top16}>Backup & Restore</Heading>
            <Paragraph className={Margins.bottom20}>
                Import and export your Equicord settings as a JSON file. This allows you to easily transfer your settings to another device, or recover them after reinstalling Equicord or Discord.
            </Paragraph>

            <Notice.Warning className={Margins.bottom20}>
                Importing a settings file will overwrite your current settings. Make sure to export a backup first if you want to keep your current configuration.
            </Notice.Warning>

            <Heading>What's included in a backup</Heading>
            <Paragraph className={Margins.bottom20}>
                • Custom QuickCSS<br />
                • Theme Links<br />
                • Plugin Settings<br />
                • DataStore Data
            </Paragraph>

            <Divider className={Margins.bottom20} />

            <Heading>Import Settings</Heading>
            <Paragraph className={Margins.bottom16}>
                Select a previously exported settings file to restore your configuration. This will replace all your current settings with the ones from the backup.
            </Paragraph>

            <Flex gap="8px" className={Margins.bottom20} style={{ flexWrap: "wrap" }}>
                <Button
                    onClick={() => uploadSettingsBackup("all")}
                    size="small"
                    variant="secondary"
                >
                    Import All Settings
                </Button>
                <Button
                    onClick={() => uploadSettingsBackup("plugins")}
                    size="small"
                >
                    Import Plugins
                </Button>
                <Button
                    onClick={() => uploadSettingsBackup("css")}
                    size="small"
                >
                    Import QuickCSS
                </Button>
                <Button
                    onClick={() => uploadSettingsBackup("datastore")}
                    size="small"
                >
                    Import DataStore
                </Button>
            </Flex>

            <Divider className={Margins.bottom20} />

            <Heading>Export Settings</Heading>
            <Paragraph className={Margins.bottom16}>
                Download your current settings as a backup file. You can export everything at once, or choose to export only specific parts of your configuration.
            </Paragraph>

            <Flex gap="8px" style={{ flexWrap: "wrap" }}>
                <Button
                    onClick={() => downloadSettingsBackup("all")}
                    size="small"
                    variant="secondary"
                >
                    Export All Settings
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
                    Export QuickCSS
                </Button>
                <Button
                    onClick={() => downloadSettingsBackup("datastore")}
                    size="small"
                >
                    Export DataStore
                </Button>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(BackupAndRestoreTab, "Backup & Restore");
