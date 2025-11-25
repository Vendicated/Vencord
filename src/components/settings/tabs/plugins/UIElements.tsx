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
import { BaseText } from "@components/BaseText";
import { Card } from "@components/Card";
import { PlaceholderIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalContent, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { IconComponent } from "@utils/types";
import { Clickable } from "@webpack/common";


const cl = classNameFactory("vc-plugin-ui-elements-");

export function UIElementsButton() {
    return (
        <Clickable onClick={() => openModal(modalProps => <UIElementsModal {...modalProps} />)}>
            <Card className={cl("button")} defaultPadding>
                <div className={cl("button-description")}>
                    <Paragraph size="md" weight="semibold">
                        Manage plugin UI elements
                    </Paragraph>
                    <Paragraph size="xs">
                        Allows you to hide buttons you don't like
                    </Paragraph>
                </div>
                <svg
                    className={cl("button-arrow")}
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                >
                    <path fill="currentColor" d="M9.3 5.3a1 1 0 0 0 0 1.4l5.29 5.3-5.3 5.3a1 1 0 1 0 1.42 1.4l6-6a1 1 0 0 0 0-1.4l-6-6a1 1 0 0 0-1.42 0Z" />
                </svg>
            </Card>
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
            <BaseText tag="h3" size="xl" weight="bold">{title}</BaseText>
            <Paragraph size="sm" className={classes(Margins.top8, Margins.bottom20)}>{description}</Paragraph>

            <div className={cl("switches")}>
                {Array.from(buttonMap, ([name, { icon }]) => {
                    const Icon = icon ?? PlaceholderIcon;
                    return (
                        <Paragraph size="md" weight="semibold" key={name} className={cl("switches-row")}>
                            <Icon height={20} width={20} />
                            {name}
                            <Switch
                                checked={settings[name]?.enabled ?? true}
                                onChange={v => {
                                    settings[name] ??= {} as any;
                                    settings[name].enabled = v;
                                }}
                            />
                        </Paragraph>
                    );
                })}
            </div>
        </section>
    );
}

function UIElementsModal(props: ModalProps) {
    const { uiElements } = useSettings(["uiElements.*"]);

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalContent className={cl("modal-content")}>
                <Section
                    title="Chatbar Buttons"
                    description="These are the buttons on the right side of the chat input bar"
                    buttonMap={ChatBarButtonMap}
                    settings={uiElements.chatBarButtons}
                />
                <Section
                    title="Message Popover Buttons"
                    description="These are the floating buttons on the right when you hover over a message"
                    buttonMap={MessagePopoverButtonMap}
                    settings={uiElements.messagePopoverButtons}
                />
            </ModalContent>
        </ModalRoot>
    );
}
