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

import { BaseText } from "@components/BaseText";
import { Flex } from "@components/Flex";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { downloadSettingsBackup, uploadSettingsBackup } from "@utils/settingsSync";
import { Button, Card } from "@webpack/common";

function BackupAndRestoreTab() {
    return (
        <SettingsTab title="Backup & Restore">
            <Card className={classes("vc-settings-card", "vc-backup-restore-card")}>
                <Flex flexDirection="column">
                    <strong>Warning</strong>
                    <span>Importing a settings file will overwrite your current settings.</span>
                </Flex>
            </Card>
            <BaseText size="md" className={Margins.bottom8}>
                You can import and export your Equicord settings as a JSON file.
                This allows you to easily transfer your settings to another device,
                or recover your settings after reinstalling Vencord or Discord.
            </BaseText>
            <BaseText size="md" className={Margins.bottom8}>
                Settings Export contains:
                <ul>
                    <li>&mdash; Custom QuickCSS</li>
                    <li>&mdash; Theme Links</li>
                    <li>&mdash; Plugin Settings</li>
                    <li>&mdash; Plugin DataStores (e.g. Timezones or IRememberYou)</li>
                </ul>
            </BaseText>
            <Flex>
                <Button
                    onClick={() => uploadSettingsBackup()}
                    size={Button.Sizes.SMALL}
                >
                    Import Settings
                </Button>
                <Button
                    onClick={() => downloadSettingsBackup("settings")}
                    size={Button.Sizes.SMALL}
                >
                    Export Settings
                </Button>
                <Button
                    onClick={() => downloadSettingsBackup("plugins")}
                    size={Button.Sizes.SMALL}
                >
                    Export Plugins
                </Button>
                <Button
                    onClick={() => downloadSettingsBackup("css")}
                    size={Button.Sizes.SMALL}
                >
                    Export CSS
                </Button>
                <Button
                    onClick={() => downloadSettingsBackup("datastore")}
                    size={Button.Sizes.SMALL}
                >
                    Export DataStores
                </Button>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(BackupAndRestoreTab, "Backup & Restore");
