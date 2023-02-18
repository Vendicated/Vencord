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

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { classes } from "@utils/misc";
import { authorizeCloud, checkSyncRequirement, deauthorizeCloud, downloadSettingsBackup, syncFromCloud, syncToCloud, uploadSettingsBackup } from "@utils/settingsSync";
import { Button, Card, Forms, Margins, Text } from "@webpack/common";

function BackupRestoreTab() {
    return (
        <>
            <Forms.FormSection title="Settings Sync" className={Margins.marginTop16}>
                <Card className={classes("vc-settings-card", "vc-backup-restore-card")}>
                    <Flex flexDirection="column">
                        <strong>Warning</strong>
                        <span>Importing a settings file will overwrite your current settings.</span>
                    </Flex>
                </Card>
                <Text variant="text-md/normal" className={Margins.marginBottom8}>
                    You can import and export your Vencord settings as a JSON file.
                    This allows you to easily transfer your settings to another device,
                    or recover your settings after reinstalling Vencord or Discord.
                </Text>
                <Text variant="text-md/normal" className={Margins.marginBottom8}>
                    Settings Export contains:
                    <ul>
                        <li>&mdash; Custom QuickCSS</li>
                        <li>&mdash; Plugin Settings</li>
                    </ul>
                </Text>
                <Flex>
                    <Button
                        onClick={() => uploadSettingsBackup()}
                        size={Button.Sizes.SMALL}
                    >
                        Import Settings
                    </Button>
                    <Button
                        onClick={downloadSettingsBackup}
                        size={Button.Sizes.SMALL}
                    >
                        Export Settings
                    </Button>
                </Flex>
            </Forms.FormSection>
            <Forms.FormSection title="Cloud Settings" className={Margins.marginTop16}>
                <Text variant="text-md/normal" className={Margins.marginBottom8}>
                    You can set up cloud settings sync here.
                </Text>
                <Flex>
                    <Button
                        onClick={() => authorizeCloud()}
                        size={Button.Sizes.SMALL}
                    >Authorize</Button>
                    <Button
                        onClick={() => deauthorizeCloud()}
                        size={Button.Sizes.SMALL}
                    >forgor 💀</Button>
                </Flex>
                <Flex className={Margins.marginTop8}>
                    <Button
                        onClick={() => syncToCloud()}
                    >Sync to Cloud</Button>
                    <Button
                        onClick={() => syncFromCloud()}
                    >Sync from Cloud</Button>
                    <Button
                        onClick={() => checkSyncRequirement()}
                    >Log Cloud Version</Button>
                </Flex>
            </Forms.FormSection>
        </>
    );
}

export default ErrorBoundary.wrap(BackupRestoreTab);
