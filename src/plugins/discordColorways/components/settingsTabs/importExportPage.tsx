/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Flex } from "@components/Flex";
import { SettingsTab } from "@components/VencordSettings/shared";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { chooseFile, saveFile } from "@utils/web";
import { Button, Card, Text } from "@webpack/common";

export function ImportExportColorwaysPage() {
    return <SettingsTab title="Backup & Restore Colorways">
        <Card className={classes("vc-settings-card", "vc-backup-restore-card")}>
            <Flex flexDirection="column">
                <strong>Warning</strong>
                <span>Importing a colorways file will overwrite your current custom colorways.</span>
            </Flex>
        </Card>
        <Text variant="text-md/normal" className={Margins.bottom8}>
            You can import and export your custom colorways as a JSON file.
            This allows you to easily transfer them to another device/installation.
        </Text>
        <Flex>
            <Button
                size={Button.Sizes.SMALL}
                onClick={async () => {
                    if (IS_DISCORD_DESKTOP) {
                        const [file] = await DiscordNative.fileManager.openFiles({
                            filters: [
                                { name: "Discord Colorways List", extensions: ["json"] },
                                { name: "all", extensions: ["*"] }
                            ]
                        });
                        if (file) {
                            try {
                                await DataStore.set("customColorways", JSON.parse(new TextDecoder().decode(file.data)));
                            } catch (err) {
                                new Logger("DiscordColorways").error(err);
                            }
                        }
                    } else {
                        const file = await chooseFile("application/json");
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = async () => {
                            try {
                                await DataStore.set("customColorways", JSON.parse(reader.result as string));
                            } catch (err) {
                                new Logger("DiscordColorways").error(err);
                            }
                        };
                        reader.readAsText(file);
                    }
                }}>
                Import...
            </Button>
            <Button
                size={Button.Sizes.SMALL}
                onClick={async () => {
                    const customColorways = await DataStore.get("customColorways");
                    if (IS_DISCORD_DESKTOP) {
                        DiscordNative.fileManager.saveWithDialog(JSON.stringify(customColorways), "colorways.json");
                    } else {
                        saveFile(new File([JSON.stringify(customColorways)], "colorways.json", { type: "application/json" }));
                    }
                }}>
                Export...
            </Button>
        </Flex>
    </SettingsTab>;
}
