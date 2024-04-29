/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Flex } from "@components/Flex";
import { openUserProfile } from "@utils/discord";
import {
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalProps,
    ModalRoot,
} from "@utils/modal";
import { Button, Clipboard, Forms, Text, Toasts, useState } from "@webpack/common";

import { ColorwayCSS } from "..";
import { generateCss, pureGradientBase } from "../css";
import { Colorway } from "../types";
import { colorToHex, stringToHex } from "../utils";
import ThemePreviewCategory from "./ThemePreview";

export default function ({
    modalProps,
    colorwayProps,
    discrimProps = false,
    loadUIProps
}: {
    modalProps: ModalProps;
    colorwayProps: Colorway;
    discrimProps?: boolean;
    loadUIProps: () => Promise<void>;
}) {
    const colors: string[] = colorwayProps.colors || [
        "accent",
        "primary",
        "secondary",
        "tertiary",
    ];
    const [collapsedCSS, setCollapsedCSS] = useState(true);
    return <ModalRoot {...modalProps} className="colorwayCreator-modal">
        <ModalHeader>
            <Text variant="heading-lg/semibold" tag="h1" style={{ marginRight: "auto" }}>
                Colorway Details: {colorwayProps.name}
            </Text>
            <ModalCloseButton onClick={() => modalProps.onClose()} />
        </ModalHeader>
        <ModalContent>
            <div className="colorwayInfo-wrapper">
                <div className="colorwayInfo-colorSwatches">
                    {colors.map(color => <div
                        className="colorwayInfo-colorSwatch"
                        style={{ backgroundColor: colorwayProps[color] }}
                        onClick={() => {
                            Clipboard.copy(colorwayProps[color]);
                            Toasts.show({
                                message: "Copied color successfully",
                                type: 1,
                                id: "copy-colorway-color-notify",
                            });
                        }}
                    />)}
                </div>
                <div className="colorwayInfo-row colorwayInfo-author">
                    <Flex style={{ gap: "10px", width: "100%", alignItems: "center" }}>
                        <Forms.FormTitle style={{ marginBottom: 0, width: "100%" }}>Properties:</Forms.FormTitle>
                        <Button
                            color={Button.Colors.PRIMARY}
                            size={Button.Sizes.MEDIUM}
                            look={Button.Looks.OUTLINED}
                            style={{ flex: "0 0 auto", maxWidth: "236px" }}
                            onClick={() => {
                                openUserProfile(colorwayProps.authorID);
                            }}
                        >
                            Author: {colorwayProps.author}
                        </Button>
                        <Button
                            color={Button.Colors.PRIMARY}
                            size={Button.Sizes.MEDIUM}
                            look={Button.Looks.OUTLINED}
                            style={{ flex: "0 0 auto" }}
                            onClick={() => {
                                const colorwayIDArray = `${colorwayProps.accent},${colorwayProps.primary},${colorwayProps.secondary},${colorwayProps.tertiary}`;
                                const colorwayID = stringToHex(colorwayIDArray);
                                Clipboard.copy(colorwayID);
                                Toasts.show({
                                    message: "Copied Colorway ID Successfully",
                                    type: 1,
                                    id: "copy-colorway-id-notify",
                                });
                            }}
                        >
                            Copy Colorway ID
                        </Button>
                        {discrimProps && <Button
                            color={Button.Colors.RED}
                            size={Button.Sizes.MEDIUM}
                            look={Button.Looks.FILLED}
                            style={{ flex: "0 0 auto" }}
                            onClick={async () => {
                                const customColorways = await DataStore.get("customColorways");
                                const actveColorwayID = await DataStore.get("actveColorwayID");
                                const customColorwaysArray: Colorway[] = [];
                                customColorways.map((color: Colorway, i: number) => {
                                    if (customColorways.length > 0) {
                                        if (color.name !== colorwayProps.name) {
                                            customColorwaysArray.push(color);
                                        }
                                        if (++i === customColorways.length) {
                                            DataStore.set("customColorways", customColorwaysArray);
                                        }
                                        if (actveColorwayID === colorwayProps.name) {
                                            DataStore.set("actveColorway", null);
                                            DataStore.set("actveColorwayID", null);
                                            ColorwayCSS.set("");
                                        }
                                        modalProps.onClose();
                                        loadUIProps();
                                    }
                                });
                            }}
                        >
                            Delete
                        </Button>}
                    </Flex>
                </div>
                <div className={"colorwayInfo-row colorwayInfo-css" + (collapsedCSS ? " colorwaysCreator-settingCat-collapsed" : "")}>
                    <Flex style={{ gap: "10px", width: "100%", alignItems: "center" }}>
                        <Forms.FormTitle style={{ marginBottom: 0, width: "100%" }}>CSS:</Forms.FormTitle>
                        <Button
                            color={Button.Colors.PRIMARY}
                            size={Button.Sizes.MEDIUM}
                            look={Button.Looks.OUTLINED}
                            style={{ flex: "0 0 auto" }}
                            onClick={() => setCollapsedCSS(!collapsedCSS)}
                        >
                            {collapsedCSS ? "Show" : "Hide"}
                        </Button>
                        <Button
                            color={Button.Colors.PRIMARY}
                            size={Button.Sizes.MEDIUM}
                            look={Button.Looks.OUTLINED}
                            style={{ flex: "0 0 auto" }}
                            onClick={() => {
                                Clipboard.copy(colorwayProps["dc-import"]);
                                Toasts.show({
                                    message: "Copied CSS to Clipboard",
                                    type: 1,
                                    id: "copy-colorway-css-notify",
                                });
                            }}
                        >
                            Copy
                        </Button>
                        {discrimProps ? <Button
                            color={Button.Colors.PRIMARY}
                            size={Button.Sizes.MEDIUM}
                            look={Button.Looks.OUTLINED}
                            style={{ flex: "0 0 auto" }}
                            onClick={async () => {
                                const customColorways = await DataStore.get("customColorways");
                                const customColorwaysArray: Colorway[] = [];
                                customColorways.map((color: Colorway, i: number) => {
                                    if (customColorways.length > 0) {
                                        if (color.name === colorwayProps.name) {
                                            color["dc-import"] = generateCss(colorToHex(color.primary) || "313338", colorToHex(color.secondary) || "2b2d31", colorToHex(color.tertiary) || "1e1f22", colorToHex(color.accent) || "5865f2", true, true);
                                            customColorwaysArray.push(color);
                                        } else {
                                            customColorwaysArray.push(color);
                                        }
                                        if (++i === customColorways.length) {
                                            DataStore.set("customColorways", customColorwaysArray);
                                        }
                                        modalProps.onClose();
                                        loadUIProps();
                                    }
                                });
                            }}
                        >
                            Update
                        </Button> : <Button
                            color={Button.Colors.PRIMARY}
                            size={Button.Sizes.MEDIUM}
                            look={Button.Looks.OUTLINED}
                            style={{ flex: "0 0 auto" }}
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
                                const colorways = data.flatMap(json => json.colorways);

                                const customColorways = await DataStore.get("customColorways");
                                const customColorwaysArray: Colorway[] = [];
                                colorways.map((color: Colorway, i: number) => {
                                    if (colorways.length > 0) {
                                        if (color.name === colorwayProps.name) {
                                            color.name += " (Custom)";
                                            color["dc-import"] = generateCss(colorToHex(color.primary) || "313338", colorToHex(color.secondary) || "2b2d31", colorToHex(color.tertiary) || "1e1f22", colorToHex(color.accent) || "5865f2", true, true);
                                            customColorwaysArray.push(color);
                                        }
                                        if (++i === colorways.length) {
                                            DataStore.set("customColorways", [...customColorways, ...customColorwaysArray]);
                                        }
                                        modalProps.onClose();
                                        loadUIProps();
                                    }
                                });
                            }}
                        >
                            Update
                        </Button>}
                    </Flex>
                    <Text
                        variant="code"
                        selectable={true}
                        className="colorwayInfo-cssCodeblock"
                    >
                        {colorwayProps["dc-import"]}
                    </Text>
                </div>
                <ThemePreviewCategory
                    isCollapsed={true}
                    className="colorwayInfo-lastCat"
                    accent={colorwayProps.accent}
                    primary={colorwayProps.primary}
                    secondary={colorwayProps.secondary}
                    tertiary={colorwayProps.tertiary}
                    noContainer
                    previewCSS={colorwayProps.isGradient ? pureGradientBase + `.colorwaysPreview-modal,.colorwaysPreview-wrapper {--gradient-theme-bg: linear-gradient(${colorwayProps.linearGradient})}` : ""}
                />
            </div>
            <div style={{ width: "100%", height: "20px" }} />
        </ModalContent>
    </ModalRoot>;
}
