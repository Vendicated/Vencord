/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { openUserProfile } from "@utils/discord";
import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
} from "@utils/modal";
import { Button, Clipboard, Forms, Text, Toasts } from "@webpack/common";

import { ColorwayCSS } from "..";
import { Colorway } from "../types";
import { ThemePreviewCategory } from "./themePreview";

export default function ColorwayInfoModal({
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
    return (
        <ModalRoot {...modalProps} className="colorwayCreator-modal">
            <ModalHeader>
                <Text variant="heading-lg/semibold" tag="h1">
                    Colorway Details: {colorwayProps.name}
                </Text>
            </ModalHeader>
            <ModalContent>
                <div className="colorwayInfo-wrapper">
                    <div className="colorwayInfo-colorSwatches">
                        {colors.map(color => {
                            return (
                                <div
                                    className="colorwayInfo-colorSwatch"
                                    style={{
                                        backgroundColor: colorwayProps[color],
                                    }}
                                    onClick={() => {
                                        Clipboard.copy(colorwayProps[color]);
                                        Toasts.show({
                                            message:
                                                "Copied color successfully",
                                            type: 1,
                                            id: "copy-colorway-color-notify",
                                        });
                                    }}
                                ></div>
                            );
                        })}
                    </div>
                    <div className="colorwayInfo-row colorwayInfo-author">
                        <Forms.FormTitle style={{ marginBottom: 0 }}>
                            Author:
                        </Forms.FormTitle>
                        <Button
                            color={Button.Colors.PRIMARY}
                            size={Button.Sizes.MEDIUM}
                            look={Button.Looks.FILLED}
                            onClick={() => {
                                openUserProfile(colorwayProps.authorID);
                            }}
                        >
                            {colorwayProps.author}
                        </Button>
                    </div>
                    <div className="colorwayInfo-row colorwayInfo-css">
                        <Forms.FormTitle style={{ marginBottom: 0 }}>
                            CSS:
                        </Forms.FormTitle>
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
                    ></ThemePreviewCategory>
                </div>
            </ModalContent>
            {discrimProps === true ? (
                <ModalFooter>
                    <Button
                        style={{ marginLeft: 8 }}
                        color={Button.Colors.RED}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.FILLED}
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
                        Delete Colorway
                    </Button>
                    <Button
                        style={{ marginLeft: 8 }}
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.FILLED}
                        onClick={() => {
                            const stringToHex = (str: string) => {
                                let hex = "";
                                for (let i = 0; i < str.length; i++) {
                                    const charCode = str.charCodeAt(i);
                                    const hexValue = charCode.toString(16);

                                    // Pad with zeros to ensure two-digit representation
                                    hex += hexValue.padStart(2, "0");
                                }
                                return hex;
                            };
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
                    <Button
                        style={{ marginLeft: 8 }}
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.FILLED}
                        onClick={() => {
                            Clipboard.copy(colorwayProps["dc-import"]);
                            Toasts.show({
                                message: "Copied CSS to Clipboard",
                                type: 1,
                                id: "copy-colorway-css-notify",
                            });
                        }}
                    >
                        Copy CSS
                    </Button>
                    <Button
                        style={{ marginLeft: 8 }}
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.FILLED}
                        onClick={() => {
                            modalProps.onClose();
                        }}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            ) : (
                <div className="colorwaySelector-noDisplay"></div>
            )}
        </ModalRoot>
    );
}
