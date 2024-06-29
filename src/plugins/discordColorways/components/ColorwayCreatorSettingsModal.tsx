/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { findByProps } from "@webpack";
import { Button, Forms, ScrollerThin, Switch, Text, useState } from "@webpack/common";

import { getPreset } from "../css";

export default function ({ modalProps, onSettings, presetId, hasTintedText, hasDiscordSaturation }: { modalProps: ModalProps, presetId: string, hasTintedText: boolean, hasDiscordSaturation: boolean, onSettings: ({ presetId, tintedText, discordSaturation }: { presetId: string, tintedText: boolean, discordSaturation: boolean; }) => void; }) {
    const [tintedText, setTintedText] = useState<boolean>(hasTintedText);
    const [discordSaturation, setDiscordSaturation] = useState<boolean>(hasDiscordSaturation);
    const [preset, setPreset] = useState<string>(presetId);
    const { radioBar, item: radioBarItem, itemFilled: radioBarItemFilled, radioPositionLeft } = findByProps("radioBar");
    return <ModalRoot {...modalProps} className="colorwaysPresetPicker">
        <ModalHeader><Text variant="heading-lg/semibold" tag="h1">Creator Settings</Text></ModalHeader>
        <ModalContent className="colorwaysPresetPicker-content">
            <Forms.FormTitle>
                Presets:
            </Forms.FormTitle>
            <ScrollerThin orientation="vertical" paddingFix style={{ paddingRight: "2px", marginBottom: "20px", maxHeight: "250px" }}>
                {Object.values(getPreset()).map(pre => {
                    return <div className={`${radioBarItem} ${radioBarItemFilled}`} aria-checked={preset === pre.id}>
                        <div
                            className={`${radioBar} ${radioPositionLeft}`}
                            style={{ padding: "10px" }}
                            onClick={() => {
                                setPreset(pre.id);
                            }}>
                            <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                {preset === pre.id && <circle cx="12" cy="12" r="5" className="radioIconForeground-3wH3aU" fill="currentColor" />}
                            </svg>
                            <Text variant="eyebrow" tag="h5">{pre.name}</Text>
                        </div>
                    </div>;
                })}
            </ScrollerThin>
            <Switch value={tintedText} onChange={setTintedText}>Use colored text</Switch>
            <Switch value={discordSaturation} onChange={setDiscordSaturation} hideBorder style={{ marginBottom: "0" }}>Use Discord's saturation</Switch>
        </ModalContent>
        <ModalFooter>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.BRAND_NEW}
                size={Button.Sizes.MEDIUM}
                onClick={() => {
                    onSettings({ presetId: preset, discordSaturation: discordSaturation, tintedText: tintedText });
                    modalProps.onClose();
                }}
            >
                Finish
            </Button>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.PRIMARY}
                size={Button.Sizes.MEDIUM}
                look={Button.Looks.OUTLINED}
                onClick={() => {
                    modalProps.onClose();
                }}
            >
                Cancel
            </Button>
        </ModalFooter>
    </ModalRoot>;
}
