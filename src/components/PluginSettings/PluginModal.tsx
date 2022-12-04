/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { useSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { OptionType, Plugin } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, Forms, React, Text, Tooltip } from "@webpack/common";

import {
    ISettingElementProps,
    SettingBooleanComponent,
    SettingCustomComponent,
    SettingNumericComponent,
    SettingSelectComponent,
    SettingSliderComponent,
    SettingTextComponent
} from "./components";

const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");

interface PluginModalProps extends ModalProps {
    plugin: Plugin;
    onRestartNeeded(): void;
}

const Components: Record<OptionType, React.ComponentType<ISettingElementProps<any>>> = {
    [OptionType.STRING]: SettingTextComponent,
    [OptionType.NUMBER]: SettingNumericComponent,
    [OptionType.BIGINT]: SettingNumericComponent,
    [OptionType.BOOLEAN]: SettingBooleanComponent,
    [OptionType.SELECT]: SettingSelectComponent,
    [OptionType.SLIDER]: SettingSliderComponent,
    [OptionType.COMPONENT]: SettingCustomComponent
};

export default function PluginModal({ plugin, onRestartNeeded, onClose, transitionState }: PluginModalProps) {
    const pluginSettings = useSettings().plugins[plugin.name];

    const [tempSettings, setTempSettings] = React.useState<Record<string, any>>({});

    const [errors, setErrors] = React.useState<Record<string, boolean>>({});
    const [saveError, setSaveError] = React.useState<string | null>(null);

    const canSubmit = () => Object.values(errors).every(e => !e);

    async function saveAndClose() {
        if (!plugin.options) {
            onClose();
            return;
        }

        if (plugin.beforeSave) {
            const result = await Promise.resolve(plugin.beforeSave(tempSettings));
            if (result !== true) {
                setSaveError(result);
                return;
            }
        }

        let restartNeeded = false;
        for (const [key, value] of Object.entries(tempSettings)) {
            const option = plugin.options[key];
            pluginSettings[key] = value;
            option?.onChange?.(value);
            if (option?.restartNeeded) restartNeeded = true;
        }
        if (restartNeeded) onRestartNeeded();
        onClose();
    }

    function renderSettings() {
        if (!pluginSettings || !plugin.options) {
            return <Forms.FormText>There are no settings for this plugin.</Forms.FormText>;
        }

        const options = Object.entries(plugin.options).map(([key, setting]) => {
            function onChange(newValue: any) {
                setTempSettings(s => ({ ...s, [key]: newValue }));
            }

            function onError(hasError: boolean) {
                setErrors(e => ({ ...e, [key]: hasError }));
            }

            const Component = Components[setting.type];
            return (
                <Component
                    id={key}
                    key={key}
                    option={setting}
                    onChange={onChange}
                    onError={onError}
                    pluginSettings={pluginSettings}
                />
            );
        });

        return <Flex flexDirection="column" style={{ gap: 12 }}>{options}</Flex>;
    }

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.DYNAMIC}>
            <ModalHeader separator={false}>
                <Text variant="heading-lg/semibold">{plugin.name}</Text>
            </ModalHeader>
            <ModalContent style={{ marginBottom: 8, minWidth: "30vw", minHeight: "20vh" }}>
                {!!plugin.settingsAboutComponent && (
                    <div style={{ marginBottom: 8 }}>
                        <Forms.FormSection>
                            <ErrorBoundary message="An error occurred while rendering this plugin's custom InfoComponent">
                                <plugin.settingsAboutComponent />
                            </ErrorBoundary>
                        </Forms.FormSection>
                    </div>
                )}
                <Forms.FormSection>
                    {renderSettings()}
                </Forms.FormSection>
            </ModalContent>
            <ModalFooter>
                <Flex flexDirection="column" style={{ width: "100%" }}>
                    <Flex style={{ marginLeft: "auto" }}>
                        <Button
                            onClick={onClose}
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.RED}
                        >
                            Cancel
                        </Button>
                        <Tooltip text="You must fix all errors before saving" shouldShow={!canSubmit()}>
                            {({ onMouseEnter, onMouseLeave }) => (
                                <Button
                                    size={Button.Sizes.SMALL}
                                    color={Button.Colors.BRAND}
                                    onClick={saveAndClose}
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                    disabled={!canSubmit()}
                                >
                                    Save & Close
                                </Button>
                            )}
                        </Tooltip>
                    </Flex>
                    {saveError && <Text variant="text-md/semibold" style={{ color: "var(--text-danger)" }}>Error while saving: {saveError}</Text>}
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}
