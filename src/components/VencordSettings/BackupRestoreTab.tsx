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

import { downloadSettingsBackup, uploadSettingsBackup } from "../../utils/settingsSync";
import { Button, Forms, Margins, Text } from "../../webpack/common";
import ErrorBoundary from "../ErrorBoundary";
import { Flex } from "../Flex";

function BackupRestoreTab() {
    return (
        <Forms.FormSection title="Settings Sync">
            <Text variant="text-md/normal" className={Margins.marginBottom8}>
                <b>Warning:</b> Importing a settings file will overwrite your current settings.
            </Text>
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
                    onClick={uploadSettingsBackup}
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
    );
}

export default ErrorBoundary.wrap(BackupRestoreTab);
