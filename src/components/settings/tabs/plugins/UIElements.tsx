/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./UIElements.css";

import { ChatBarButtonMap } from "@api/ChatButtons";
import { MessagePopoverButtonMap } from "@api/MessagePopover";
import { SettingsPluginUiElements, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { PlaceholderIcon } from "@components/Icons";
import { Switch } from "@components/Switch";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalContent, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { IconComponent } from "@utils/types";
import { Clickable, Text } from "@webpack/common";


const cl = classNameFactory("vc-plugin-ui-elements-");

export function UIElementsButton() {
    return (
        <Clickable
            className={cl("button")}
            onClick={() => openModal(modalProps => <UIElementsModal {...modalProps} />)}
        >
            <div className={cl("button-description")}>
                <Text variant="text-md/semibold">
                    Manage plugin UI elements
                </Text>
                <Text variant="text-xs/normal">
                    Allows you to hide buttons you don't like
                </Text>
            </div>
            <svg
                className={cl("button-arrow")}
                aria-hidden="true"
                viewBox="0 0 24 24"
            >
                <path fill="currentColor" d="M9.3 5.3a1 1 0 0 0 0 1.4l5.29 5.3-5.3 5.3a1 1 0 1 0 1.42 1.4l6-6a1 1 0 0 0 0-1.4l-6-6a1 1 0 0 0-1.42 0Z" />
            </svg>
        </Clickable >
    );
}

function Section(props: {
    title: string;
    description: string;
    settings: SettingsPluginUiElements;
    buttonMap: Map<string, { icon: IconComponent; }>;
}) {
    const { buttonMap, description, title, settings } = props;

    return (
        <section>
            <Text tag="h3" variant="heading-xl/bold">{title}</Text>
            <Text variant="text-sm/normal" className={classes(Margins.top8, Margins.bottom20)}>{description}</Text>

            <div className={cl("switches")}>
                {buttonMap.entries().map(([name, { icon }]) => {
                    const Icon = icon ?? PlaceholderIcon;
                    return (
                        <Text variant="text-md/semibold" key={name} className={cl("switches-row")}>
                            <Icon height={20} width={20} />
                            {name}
                            <Switch
                                checked={settings[name]?.enabled ?? true}
                                onChange={v => {
                                    settings[name] ??= {} as any;
                                    settings[name].enabled = v;
                                }}
                            />
                        </Text>
                    );
                })}
            </div>
        </section>
    );
}

function UIElementsModal(props: ModalProps) {
    const { uiElements } = useSettings();

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalContent className={cl("modal-content")}>
                <Section
                    title="Chatbar Buttons"
                    description="These buttons appear in the chat input."
                    buttonMap={ChatBarButtonMap}
                    settings={uiElements.chatBarButtons}
                />
                <Section
                    title="Message Popover Buttons"
                    description="These buttons appear when you hover over a message."
                    buttonMap={MessagePopoverButtonMap}
                    settings={uiElements.messagePopoverButtons}
                />
            </ModalContent>
        </ModalRoot>
    );
}
