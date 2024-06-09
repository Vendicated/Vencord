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

import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { downloadSettingsBackup, uploadSettingsBackup } from "@utils/settingsSync";
import { $t } from "@utils/translation";
import { Button, Card, Text } from "@webpack/common";

import { SettingsTab, wrapTab } from "./shared";

function BackupRestoreTab() {
    return (
        <SettingsTab title="Backup & Restore">
            <Card className={classes("vc-settings-card", "vc-backup-restore-card")}>
                <Flex flexDirection="column">
                    <strong>{$t("vencord.warning")}</strong>
                    <span>{$t("vencord.backupAndRestore.importWarning")}</span>
                </Flex>
            </Card>
            <Text variant="text-md/normal" className={Margins.bottom8}>
                {$t("vencord.backupAndRestore.description")}
            </Text>
            <Text variant="text-md/normal" className={Margins.bottom8}>
                {$t("vencord.backupAndRestore.exportContains")}
                <ul>
                    <li>&mdash; {$t("vencord.backupAndRestore.customQuickcss")}</li>
                    <li>&mdash; {$t("vencord.backupAndRestore.themeLinks")}</li>
                    <li>&mdash; {$t("vencord.backupAndRestore.pluginSettings")}</li>
                </ul>
            </Text>
            <Flex>
                <Button
                    onClick={() => uploadSettingsBackup()}
                    size={Button.Sizes.SMALL}
                >
                    {$t("vencord.backupAndRestore.importSettings")}
                </Button>
                <Button
                    onClick={downloadSettingsBackup}
                    size={Button.Sizes.SMALL}
                >
                    {$t("vencord.backupAndRestore.exportSettings")}
                </Button>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(BackupRestoreTab, "Backup & Restore");
