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
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { t } from "@utils/i18n";
import { Margins } from "@utils/margins";
import { Button, Text } from "@webpack/common";

function BackupAndRestoreTab() {
    return (
        <SettingsTab>
            <Flex flexDirection="column" gap="0.5em">
                <Card variant="warning">
                    <Heading tag="h4">{t("Warning")}</Heading>
                    <Paragraph>{t("Importing a settings file will overwrite your current settings.")}</Paragraph>
                </Card>

                <Text variant="text-md/normal" className={Margins.bottom8}>
                    {t("You can import and export your Vencord settings as a JSON file.")}
                    {" "}
                    {t("This allows you to easily transfer your settings to another device,")}
                    {" "}
                    {t("or recover your settings after reinstalling Vencord or Discord.")}
                </Text>

                <Heading tag="h4">{t("Settings Export contains:")}</Heading>
                <Text variant="text-md/normal" className={Margins.bottom8}>
                    <ul>
                        <li>&mdash; {t("Custom QuickCSS")}</li>
                        <li>&mdash; {t("Theme Links")}</li>
                        <li>&mdash; {t("Plugin Settings")}</li>
                    </ul>
                </Text>

                <Flex>
                    <Button onClick={() => uploadSettingsBackup()}>
                        {t("Import Settings")}
                    </Button>
                    <Button onClick={downloadSettingsBackup}>
                        {t("Export Settings")}
                    </Button>
                </Flex>
            </Flex>
        </SettingsTab >
    );
}

export default wrapTab(BackupAndRestoreTab, t("Backup & Restore"));
