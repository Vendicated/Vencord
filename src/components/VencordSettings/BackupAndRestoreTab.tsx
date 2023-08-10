/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { downloadSettingsBackup, uploadSettingsBackup } from "@utils/settingsSync";
import { Button, Card, Text } from "@webpack/common";

import { SettingsTab, wrapTab } from "./shared";

function BackupRestoreTab() {
    return (
        <SettingsTab title="Backup & Restore">
            <Card className={classes("vc-settings-card", "vc-backup-restore-card")}>
                <Flex flexDirection="column">
                    <strong>Warning</strong>
                    <span>Importing a settings file will overwrite your current settings.</span>
                </Flex>
            </Card>
            <Text variant="text-md/normal" className={Margins.bottom8}>
                You can import and export your Vencord settings as a JSON file.
                This allows you to easily transfer your settings to another device,
                or recover your settings after reinstalling Vencord or Discord.
            </Text>
            <Text variant="text-md/normal" className={Margins.bottom8}>
                Settings Export contains:
                <ul>
                    <li>&mdash; Custom QuickCSS</li>
                    <li>&mdash; Theme Links</li>
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
        </SettingsTab>
    );
}

export default wrapTab(BackupRestoreTab, "Backup & Restore");
