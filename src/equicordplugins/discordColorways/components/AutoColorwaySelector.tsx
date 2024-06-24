/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { findByProps } from "@webpack";
import { Button, Forms, Text, useState } from "@webpack/common";

import { getAutoPresets } from "../css";

export default function ({ modalProps, onChange, autoColorwayId = "" }: { modalProps: ModalProps, onChange: (autoPresetId: string) => void, autoColorwayId: string; }) {
    const [autoId, setAutoId] = useState(autoColorwayId);
    const { radioBar, item: radioBarItem, itemFilled: radioBarItemFilled, radioPositionLeft } = findByProps("radioBar");
    return <ModalRoot {...modalProps}>
        <ModalHeader>
            <Text variant="heading-lg/semibold" tag="h1">
                Auto Preset Settings
            </Text>
        </ModalHeader>
        <ModalContent>
            <div className="dc-info-card" style={{ marginTop: "1em" }}>
                <strong>About the Auto Colorway</strong>
                <span>The auto colorway allows you to use your system's accent color in combination with a selection of presets that will fully utilize it.</span>
            </div>
            <div style={{ marginBottom: "20px" }}>
                <Forms.FormTitle>Presets:</Forms.FormTitle>
                {Object.values(getAutoPresets()).map(autoPreset => {
                    return <div className={`${radioBarItem} ${radioBarItemFilled}`} aria-checked={autoId === autoPreset.id}>
                        <div
                            className={`${radioBar} ${radioPositionLeft}`}
                            style={{ padding: "10px" }}
                            onClick={() => {
                                setAutoId(autoPreset.id);
                            }}>
                            <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                {autoId === autoPreset.id && <circle cx="12" cy="12" r="5" className="radioIconForeground-3wH3aU" fill="currentColor" />}
                            </svg>
                            <Text variant="eyebrow" tag="h5">{autoPreset.name}</Text>
                        </div>
                    </div>;
                })}
            </div>
        </ModalContent>
        <ModalFooter>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.BRAND_NEW}
                size={Button.Sizes.MEDIUM}
                onClick={() => {
                    DataStore.set("activeAutoPreset", autoId);
                    onChange(autoId);
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
