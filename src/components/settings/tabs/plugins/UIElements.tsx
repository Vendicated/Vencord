/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./UIElements.css";

import { classNameFactory } from "@api/Styles";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalContent, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Clickable, Switch, Text } from "@webpack/common";

import Plugins from "~plugins";

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

function UIElementsModal(props: ModalProps) {
    const allPlugins = Object.values(Plugins);

    const pluginsWithChatBarButtons = allPlugins
        .filter(p => p.renderChatBarButton && Vencord.Plugins.isPluginEnabled(p.name));
    const pluginsWithMessagePopoverButton = allPlugins
        .filter(p => p.renderMessagePopoverButton && Vencord.Plugins.isPluginEnabled(p.name));

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalContent>
                <section>
                    <Text tag="h3" variant="heading-xl/bold" className={Margins.bottom16}>Chat Bar Buttons</Text>
                    {pluginsWithChatBarButtons.map(p => (
                        <Switch
                            value={true}
                            onChange={() => { }}
                            key={p.name}
                            hideBorder
                        >
                            {p.name}
                        </Switch>
                    ))}
                </section>

                <section>
                    <Text tag="h3" variant="heading-xl/bold" className={classes(Margins.bottom16, Margins.top16)}>Message Hover Bar Buttons</Text>
                    {pluginsWithMessagePopoverButton.map(p => (
                        <Switch
                            value={true}
                            onChange={() => { }}
                            key={p.name}
                            hideBorder
                        >
                            {p.name}
                        </Switch>
                    ))}
                </section>
            </ModalContent>
        </ModalRoot>
    );
}
