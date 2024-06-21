/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, useSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { CopyIcon, PasteIcon, ResetIcon } from "@components/Icons";
import { copyWithToast } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { showToast, Text, Toasts, Tooltip } from "@webpack/common";
import { type ReactNode } from "react";
import { UserstyleHeader } from "usercss-meta";

import { SettingBooleanComponent, SettingColorComponent, SettingNumberComponent, SettingRangeComponent, SettingSelectComponent, SettingTextComponent } from "./components";

interface UserCSSSettingsModalProps {
    modalProps: ModalProps;
    theme: UserstyleHeader;
    onSettingsReset: () => void;
}

function ExportButton({ themeSettings }: { themeSettings: Settings["userCssVars"][""]; }) {
    return <Tooltip text={"Copy theme settings"}>
        {({ onMouseLeave, onMouseEnter }) => (
            <div
                style={{ cursor: "pointer" }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}

                onClick={() => {
                    copyWithToast(JSON.stringify(themeSettings), "Copied theme settings to clipboard.");
                }}>
                <CopyIcon />
            </div>
        )}
    </Tooltip>;
}

function ImportButton({ themeSettings }: { themeSettings: Settings["userCssVars"][""]; }) {
    return <Tooltip text={"Paste theme settings"}>
        {({ onMouseLeave, onMouseEnter }) => (
            <div
                style={{ cursor: "pointer" }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}

                onClick={async () => {
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

                    showToast("Pasted theme settings from clipboard.", Toasts.Type.SUCCESS);
                }}>
                <PasteIcon />
            </div>
        )}
    </Tooltip>;
}

interface ResetButtonProps {
    themeSettings: Settings["userCssVars"];
    themeId: string;
    close: () => void;
    onReset: () => void;
}

function ResetButton({ themeSettings, themeId, close, onReset }: ResetButtonProps) {
    return <Tooltip text={"Reset settings to default"}>
        {({ onMouseLeave, onMouseEnter }) => (
            <div
                style={{ cursor: "pointer" }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}

                onClick={async () => {
                    await close(); // close the modal first to stop rendering
                    delete themeSettings[themeId];
                    onReset();
                }}>
                <ResetIcon />
            </div>
        )}
    </Tooltip>;
}

export function UserCSSSettingsModal({ modalProps, theme, onSettingsReset }: UserCSSSettingsModalProps) {
    // @ts-expect-error UseSettings<> can't determine this is a valid key
    const { userCssVars } = useSettings(["userCssVars"], false);

    const themeVars = userCssVars[theme.id];

    const controls: ReactNode[] = [];

    for (const [name, varInfo] of Object.entries(theme.vars)) {
        switch (varInfo.type) {
            case "text": {
                controls.push(
                    <SettingTextComponent
                        label={varInfo.label}
                        name={name}
                        themeSettings={themeVars}
                    />
                );
                break;
            }

            case "checkbox": {
                controls.push(
                    <SettingBooleanComponent
                        label={varInfo.label}
                        name={name}
                        themeSettings={themeVars}
                    />
                );
                break;
            }

            case "color": {
                controls.push(
                    <SettingColorComponent
                        label={varInfo.label}
                        name={name}
                        themeSettings={themeVars}
                    />
                );
                break;
            }

            case "number": {
                controls.push(
                    <SettingNumberComponent
                        label={varInfo.label}
                        name={name}
                        themeSettings={themeVars}
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
                        themeSettings={themeVars}
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
                        themeSettings={themeVars}
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
                <Flex style={{ gap: 4, marginRight: 4 }} className="vc-settings-usercss-ie-buttons">
                    <ExportButton themeSettings={themeVars} />
                    <ImportButton themeSettings={themeVars} />
                    <ResetButton themeSettings={userCssVars} themeId={theme.id} close={modalProps.onClose} onReset={onSettingsReset} />
                </Flex>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Flex flexDirection="column" style={{ gap: 12, marginBottom: 16 }}>
                    {controls}
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}
