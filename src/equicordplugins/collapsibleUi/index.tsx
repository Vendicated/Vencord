/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelToolbarButton } from "@api/HeaderBar";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { ContextMenuApi, Menu } from "@webpack/common";
import type { ReactNode, SVGProps } from "react";

import { PanelId, panelRegistry, settings, toolbarPanelOrder } from "./settings";
import managedStyle from "./style.css?managed";

const cl = classNameFactory("vc-collapsible-ui-");

type StateStore = ReturnType<typeof settings.use>;

function PanelsIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" {...props}>
            <path fill="currentColor" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H3V5Zm0 5h6v11H5a2 2 0 0 1-2-2V10Zm8 0h10v9a2 2 0 0 1-2 2H11V10Zm2-5h8v3h-8V5Z" />
        </svg>
    );
}

function getStateClasses(store: StateStore) {
    const classNames = [cl("state"), cl(`collapsed-size-${store.collapsedSize}`), cl(`transition-${store.transitionMs}`)];

    for (const panelId of toolbarPanelOrder) {
        const panel = panelRegistry[panelId];
        if (store[panel.collapsedKey]) classNames.push(cl(`${panel.classId}-collapsed`));
    }

    return classes(...classNames);
}

function togglePanel(panelId: PanelId) {
    const key = panelRegistry[panelId].collapsedKey;
    settings.store[key] = !settings.store[key];
}

const ToolbarMenu = ErrorBoundary.wrap(({ onClose }: { onClose(): void; }) => {
    const store = settings.use();

    return (
        <Menu.Menu navId="vc-collapsible-ui-toolbar-menu" onClose={onClose} aria-label="Collapsible UI">
            {toolbarPanelOrder.map(panelId => {
                const panel = panelRegistry[panelId];
                const collapsed = store[panel.collapsedKey];

                return (
                    <Menu.MenuCheckboxItem
                        key={panelId}
                        id={`vc-collapsible-ui-${panel.classId}`}
                        label={panel.label}
                        checked={!collapsed}
                        action={() => togglePanel(panelId)}
                    />
                );
            })}
        </Menu.Menu>
    );
}, { noop: true });

const ToolbarButtons = ErrorBoundary.wrap(() => {
    const store = settings.use();
    const anyCollapsed = toolbarPanelOrder.some(panelId => store[panelRegistry[panelId].collapsedKey]);

    return (
        <>
            <span aria-hidden className={getStateClasses(store)} style={{ display: "none" }} />
            <ChannelToolbarButton
                icon={PanelsIcon}
                tooltip="Collapsible UI"
                aria-label="Collapsible UI"
                selected={anyCollapsed}
                onClick={event => ContextMenuApi.openContextMenu(event, () => <ToolbarMenu onClose={ContextMenuApi.closeContextMenu} />)}
                onContextMenu={event => ContextMenuApi.openContextMenu(event, () => <ToolbarMenu onClose={ContextMenuApi.closeContextMenu} />)}
            />
        </>
    );
}, { noop: true });

const ChatButtonsRow = ErrorBoundary.wrap(({ buttons }: { buttons: ReactNode[]; }) => {
    const { chatButtonsCollapsed } = settings.use();

    if (buttons.length === 0) return <>{buttons}</>;

    return (
        <div
            className={classes(
                cl("chat-buttons"),
                chatButtonsCollapsed && cl("chat-buttons-collapsed")
            )}
        >
            <div className={cl("chat-buttons-items")}>
                {buttons}
            </div>
        </div>
    );
}, { noop: true });

export default definePlugin({
    name: "CollapsibleUI",
    description: "Native collapsible channel, member, chat button, and user area surfaces.",
    tags: ["Appearance", "Customisation", "Chat", "Servers"],
    dependencies: ["HeaderBarAPI"],
    authors: [EquicordDevs.benjii],
    searchTerms: ["ui", "sidebar", "layout"],
    managedStyle,
    settings,

    headerBarButton: {
        icon: PanelsIcon,
        location: "channeltoolbar",
        priority: 25,
        render: () => <ToolbarButtons />,
    },

    patches: [
        {
            find: ".DISPLAY_NAME_STYLES_COACHMARK)",
            replacement: {
                match: /className:(\i\.\i),(?=style:(\i),children:\[)/,
                replace: "className:$self.userAreaControlsClass($1),"
            }
        },
        {
            find: '"sticker")',
            replacement: {
                match: /(?<="div",\{.{0,15}children:)(.+?)\}/,
                replace: "$self.wrapChatButtons($1)}"
            }
        }
    ],

    wrapChatButtons(buttons: ReactNode[]) {
        if (!Array.isArray(buttons) || buttons.length === 0) return buttons;
        return <ChatButtonsRow buttons={buttons} />;
    },

    userAreaControlsClass(className: string) {
        return classes(className, cl("user-area-controls"));
    },
});
