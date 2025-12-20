/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { downloadSettingsBackup, uploadSettingsBackup } from "@api/SettingsSync/offline";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { Button, Text } from "@webpack/common";

function BackupAndRestoreTab() {
    return (
        <SettingsTab>
            <Flex flexDirection="column" gap="0.5em">
                <Card variant="warning">
                    <Heading tag="h4">Warning</Heading>
                    <Paragraph>Importing a settings file will overwrite your current settings.</Paragraph>
                </Card>

                <Text variant="text-md/normal" className={Margins.bottom8}>
                    You can import and export your Vencord settings as a JSON file.
                    This allows you to easily transfer your settings to another device,
                    or recover your settings after reinstalling Vencord or Discord.
                </Text>

                <Heading tag="h4">Settings Export contains:</Heading>
                <Text variant="text-md/normal" className={Margins.bottom8}>
                    <ul>
                        <li>&mdash; Custom QuickCSS</li>
                        <li>&mdash; Theme Links</li>
                        <li>&mdash; Plugin Settings</li>
                    </ul>
                </Text>

                <Flex>
                    <Button onClick={() => uploadSettingsBackup()}>
                        Import Settings
                    </Button>
                    <Button onClick={downloadSettingsBackup}>
                        Export Settings
                    </Button>
                </Flex>
            </Flex>
        </SettingsTab >
    );
}

export default wrapTab(BackupAndRestoreTab, "Backup & Restore");
