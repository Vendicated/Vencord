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
import { Button, Card, Forms, Text } from "@webpack/common";

import { defaultColorwaySource } from "../../constants";
import { generateCss } from "../../css";
import { Colorway } from "../../types";
import { colorToHex } from "../../utils";

export default function () {
    return <SettingsTab title="Manage Colorways">
        <Forms.FormSection title="Import/Export">
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
                    Import Colorways
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={async () => {
                        if (IS_DISCORD_DESKTOP) {
                            DiscordNative.fileManager.saveWithDialog(JSON.stringify(await DataStore.get("customColorways") as string), "colorways.json");
                        } else {
                            saveFile(new File([JSON.stringify(await DataStore.get("customColorways") as string)], "colorways.json", { type: "application/json" }));
                        }
                    }}>
                    Export Colorways
                </Button>
            </Flex>
        </Forms.FormSection>
        <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />
        <Forms.FormSection title="Transfer 3rd Party Colorways to local index (3rd-Party > Custom):">
            <Flex>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={async () => {
                        const colorwaySourceFiles = await DataStore.get(
                            "colorwaySourceFiles"
                        );
                        const responses: Response[] = await Promise.all(
                            colorwaySourceFiles.map((url: string) =>
                                fetch(url)
                            )
                        );
                        const data = await Promise.all(
                            responses.map((res: Response) =>
                                res.json().then(dt => { return { colorways: dt.colorways, url: res.url }; }).catch(() => { return { colorways: [], url: res.url }; })
                            ));
                        const thirdPartyColorwaysArr: Colorway[] = data.flatMap(json => json.url !== defaultColorwaySource ? json.colorways : []);
                        const customColorways: Colorway[] = await DataStore.get("customColorways") as Colorway[];
                        DataStore.set("customColorways", [...customColorways, ...thirdPartyColorwaysArr.map(({ name: nameOld, ...rest }) => ({ name: (nameOld + " (Custom)"), ...rest }))]);
                    }}>
                    As-Is
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={async () => {
                        const colorwaySourceFiles = await DataStore.get(
                            "colorwaySourceFiles"
                        );
                        const responses: Response[] = await Promise.all(
                            colorwaySourceFiles.map((url: string) =>
                                fetch(url)
                            )
                        );
                        const data = await Promise.all(
                            responses.map((res: Response) =>
                                res.json().then(dt => { return { colorways: dt.colorways, url: res.url }; }).catch(() => { return { colorways: [], url: res.url }; })
                            ));
                        const thirdPartyColorwaysArr: Colorway[] = data.flatMap(json => json.url !== defaultColorwaySource ? json.colorways : []);
                        const customColorways: Colorway[] = await DataStore.get("customColorways") as Colorway[];
                        DataStore.set("customColorways", [...customColorways, ...thirdPartyColorwaysArr.map(({ name: nameOld, "dc-import": oldImport, ...rest }: Colorway) => ({ name: (nameOld + " (Custom)"), "dc-import": generateCss(rest.primary.split("#")[1] || "313338", rest.secondary.split("#")[1] || "2b2d31", rest.tertiary.split("#")[1] || "1e1f22", rest.accent.split("#")[1] || "5865f2", true, true), ...rest }))]);
                    }}>
                    With Updated CSS
                </Button>
            </Flex>
        </Forms.FormSection>
        <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />
        <Forms.FormSection title="Developer Options:">
            <Button
                size={Button.Sizes.SMALL}
                onClick={async () => {
                    const colorwaySourceFiles = await DataStore.get(
                        "colorwaySourceFiles"
                    );
                    const responses: Response[] = await Promise.all(
                        colorwaySourceFiles.map((url: string) =>
                            fetch(url)
                        )
                    );
                    const data = await Promise.all(
                        responses.map((res: Response) =>
                            res.json().then(dt => { return { colorways: dt.colorways, url: res.url }; }).catch(() => { return { colorways: [], url: res.url }; })
                        ));
                    const colorwaysArr: Colorway[] = data.flatMap(json => json.url === defaultColorwaySource ? json.colorways : []);

                    colorwaysArr.forEach(async (color: Colorway) => {
                        if (IS_DISCORD_DESKTOP) {
                            await DiscordNative.fileManager.saveWithDialog(generateCss(colorToHex(color.primary) || "313338", colorToHex(color.secondary) || "2b2d31", colorToHex(color.tertiary) || "1e1f22", colorToHex(color.accent) || "5865f2", true, true), `import_${color.name.replaceAll(" ", "-").replaceAll("'", "")}.css`);
                        } else {
                            saveFile(new File([generateCss(colorToHex(color.primary) || "313338", colorToHex(color.secondary) || "2b2d31", colorToHex(color.tertiary) || "1e1f22", colorToHex(color.accent) || "5865f2", true, true)], `import_${color.name.replaceAll(" ", "-").replaceAll("'", "")}.css`, { type: "text/plain;charset=utf-8" }));
                        }
                    });
                }}>
                Update all official Colorways and export
            </Button>
        </Forms.FormSection>
    </SettingsTab>;
}
