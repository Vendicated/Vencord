/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles.css";

import { classNameFactory } from "@api/Styles";
import { DeleteIcon } from "@components/Icons";
import { useUserDecorationsStore } from "plugins/decor/lib/stores/UserDecorationsStore";
import { Alerts, ContextMenu, Menu } from "webpack/common";

const cl = classNameFactory("vc-decor-");

export default function DecorationContextMenu({ decoration }) {
    const { delete: deleteDecoration } = useUserDecorationsStore();
    return <Menu.Menu
        navId={cl("decoration-context-menu")}
        onClose={ContextMenu.close}
        aria-label="Decoration Options"
    >
        <Menu.MenuItem
            id={cl("decoration-context-menu-delete")}
            label="Delete Decoration"
            icon={DeleteIcon}
            color="danger"
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
    </Menu.Menu>;
}
