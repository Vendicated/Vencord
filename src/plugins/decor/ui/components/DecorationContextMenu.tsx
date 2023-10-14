/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles.css";

import { classNameFactory } from "@api/Styles";
import { CopyIcon, DeleteIcon } from "@components/Icons";
import { Alerts, Clipboard, ContextMenu, Menu, UserStore } from "webpack/common";

import { useCurrentUserDecorationsStore } from "../../lib/stores/CurrentUserDecorationsStore";

const cl = classNameFactory("vc-decor-");

export default function DecorationContextMenu({ decoration }) {
    const { delete: deleteDecoration } = useCurrentUserDecorationsStore();
    return <Menu.Menu
        navId={cl("decoration-context-menu")}
        onClose={ContextMenu.close}
        aria-label="Decoration Options"
    >
        <Menu.MenuItem
            id={cl("decoration-context-menu-copy-hash")}
            label="Copy Decoration Hash"
            icon={CopyIcon}
            action={() => Clipboard.copy(decoration.hash)}
        />
        {decoration.authorId === UserStore.getCurrentUser().id &&
            <Menu.MenuItem
                id={cl("decoration-context-menu-delete")}
                label="Delete Decoration"
                color="danger"
                icon={DeleteIcon}
                action={() => Alerts.show({
                    title: "Delete Decoration",
                    body: `Are you sure you want to delete ${decoration.alt}?`,
                    confirmText: "Delete",
                    confirmColor: cl("delete-decoration-danger-btn"),
                    cancelText: "Cancel",
                    onConfirm() {
                        deleteDecoration(decoration);
                    }
                })}
            />
        }
    </Menu.Menu>;
}
