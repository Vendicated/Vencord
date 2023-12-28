/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { copyWithToast } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Button, showToast, Text, Toasts } from "@webpack/common";
import { type ReactNode } from "react";
import { UserstyleHeader } from "usercss-meta";

import { SettingBooleanComponent, SettingColorComponent, SettingNumberComponent, SettingRangeComponent, SettingSelectComponent, SettingTextComponent } from "./components";

interface UserCSSSettingsModalProps {
    modalProps: ModalProps;
    theme: UserstyleHeader;
}

export function UserCSSSettingsModal({ modalProps, theme }: UserCSSSettingsModalProps) {
    // @ts-expect-error UseSettings<> can't determine this is a valid key
    const themeSettings = useSettings(["userCssVars"], false).userCssVars[theme.id];

    const controls: ReactNode[] = [];

    for (const [name, varInfo] of Object.entries(theme.vars)) {
        switch (varInfo.type) {
            case "text": {
                controls.push(
                    <SettingTextComponent
                        label={varInfo.label}
                        name={name}
                        themeSettings={themeSettings}
                    />
                );
                break;
            }

            case "checkbox": {
                controls.push(
                    <SettingBooleanComponent
                        label={varInfo.label}
                        name={name}
                        themeSettings={themeSettings}
                    />
                );
                break;
            }

            case "color": {
                controls.push(
                    <SettingColorComponent
                        label={varInfo.label}
                        name={name}
                        themeSettings={themeSettings}
                    />
                );
                break;
            }

            case "number": {
                controls.push(
                    <SettingNumberComponent
                        label={varInfo.label}
                        name={name}
                        themeSettings={themeSettings}
                    />
                );
                break;
            }

            case "select": {
                controls.push(
                    <SettingSelectComponent
                        label={varInfo.label}
                        name={name}
                        options={varInfo.options}
                        default={varInfo.default}
                        themeSettings={themeSettings}
                    />
                );
                break;
            }

            case "range": {
                controls.push(
                    <SettingRangeComponent
                        label={varInfo.label}
                        name={name}
                        default={varInfo.default}
                        min={varInfo.min}
                        max={varInfo.max}
                        step={varInfo.step}
                        themeSettings={themeSettings}
                    />
                );
                break;
            }
        }
    }

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader separator={false}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Settings for {theme.name}</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Flex flexDirection="column" style={{ gap: 12, marginBottom: 16 }}>
                    <div className="vc-settings-usercss-ie-grid">
                        <Button size={Button.Sizes.SMALL} onClick={() => {
                            copyWithToast(JSON.stringify(themeSettings), "Copied theme settings to clipboard.");
                        }}>Export</Button>
                        <Button size={Button.Sizes.SMALL} onClick={async () => {
                            const clip = (await navigator.clipboard.read())[0];

                            if (!clip) return showToast("Your clipboard is empty.", Toasts.Type.FAILURE);

                            if (!clip.types.includes("text/plain"))
                                return showToast("Your clipboard doesn't have valid settings data.", Toasts.Type.FAILURE);

                            try {
                                var potentialSettings: Record<string, string> =
                                    JSON.parse(await clip.getType("text/plain").then(b => b.text()));
                            } catch (e) {
                                return showToast("Your clipboard doesn't have valid settings data.", Toasts.Type.FAILURE);
                            }

                            for (const [key, value] of Object.entries(potentialSettings)) {
                                if (Object.prototype.hasOwnProperty.call(themeSettings, key))
                                    themeSettings[key] = value;
                            }

                            showToast("Imported theme settings from clipboard.", Toasts.Type.SUCCESS);
                        }}>Import</Button>
                    </div>
                    {controls}
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}
