/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findComponentByCodeLazy } from "@webpack";
import { Button, Forms, Text, useMemo, useState } from "@webpack/common";

import { getColor, resetColor, setColor } from "../colors";
import { TAG_NAMES, TAGS } from "../tag";
import { CustomColoredTag } from "../types";
import { hex2number, number2hex } from "../util/hex";
import { ColorlessCrownIcon, HalfedCrownIcon } from "./Icons";

const ColorPicker = findComponentByCodeLazy(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");

const SUGGESTED_COLORS = [
    "#AA6000", "#E0E0E0", "#D9A02D", "#0BDA51", "#5865F2",
    "#5865F2", "#C41E3A", "#BF40BF", "#5D3FD3", "#B2BEB5",
];

export default function ColorSettings() {
    return (
        <div>
            <Forms.FormTitle tag="h3">Custom Tags Color</Forms.FormTitle>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-around",
                }}
            >
                {
                    ([TAGS.MODERATOR, TAGS.ADMINISTRATOR, TAGS.BOT, TAGS.WEBHOOK] as CustomColoredTag[]).map(tag => {
                        const [curColor, setCurColor] = useState(hex2number(getColor(tag)));
                        const crownStyle = useMemo<React.CSSProperties>(() => {
                            return {
                                display: "flex",
                                position: "relative",
                                width: "16px",
                                height: "16px",
                                alignSelf: "center",
                                color: number2hex(curColor)
                            };
                        }, [curColor]);

                        return (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "4px"
                                }}
                            >
                                <Text
                                    variant="heading-md/normal"
                                >
                                    {TAG_NAMES[tag]}
                                </Text>
                                <div
                                    style={{
                                        display: "inline-flex",
                                        marginBottom: "4px",
                                        gap: "4px",
                                    }}
                                >
                                    <span
                                        style={crownStyle}
                                    >
                                        <ColorlessCrownIcon />
                                    </span>
                                    {
                                        tag !== TAGS.WEBHOOK ? null : <span
                                            style={crownStyle}
                                        >
                                            <ColorlessCrownIcon />
                                            {
                                                <HalfedCrownIcon />
                                            }
                                        </span>
                                    }
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "4px",
                                    }}
                                >
                                    <ColorPicker
                                        color={curColor}
                                        onChange={setCurColor}
                                        showEyeDropper={false}
                                        SUGGESTED_COLORS={SUGGESTED_COLORS}
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "4px",
                                        }}
                                    >
                                        <Button
                                            size={Button.Sizes.NONE}
                                            color={Button.Colors.GREEN}
                                            style={{
                                                width: "50px",
                                                height: "100%",
                                                padding: "0 4px",
                                            }}
                                            onClick={() => setColor(tag, number2hex(curColor))}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size={Button.Sizes.NONE}
                                            color={Button.Colors.RED}
                                            style={{
                                                width: "50px",
                                                height: "auto",
                                                padding: "0 4px",
                                            }}
                                            onClick={() => {
                                                resetColor(tag);
                                                setCurColor(hex2number(getColor(tag)));
                                            }}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        </div>
    );
}
