/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Text } from "@webpack/common";
import type { ReactNode } from "react";
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
                <Flex flexDirection="column" style={{ gap: 12, marginBottom: 16 }}>{controls}</Flex>
            </ModalContent>
        </ModalRoot>
    );
}
