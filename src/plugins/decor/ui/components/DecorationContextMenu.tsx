/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CopyIcon, DeleteIcon } from "@components/Icons";
import { Decoration } from "@plugins/decor/lib/api";
import { useCurrentUserDecorationsStore } from "@plugins/decor/lib/stores/CurrentUserDecorationsStore";
import { cl } from "@plugins/decor/ui";
import { copyToClipboard } from "@utils/clipboard";
import { openModal } from "@utils/modal";
import { ContextMenuApi, Menu, UserStore } from "@webpack/common";
import { ConfirmModal } from "@webpack/common/modalV2";

export default function DecorationContextMenu({ decoration }: { decoration: Decoration; }) {
    const { delete: deleteDecoration } = useCurrentUserDecorationsStore();

    return <Menu.Menu
        navId={cl("decoration-context-menu")}
        onClose={ContextMenuApi.closeContextMenu}
        aria-label="Decoration Options"
    >
        <Menu.MenuItem
            id={cl("decoration-context-menu-copy-hash")}
            label="Copy Decoration Hash"
            icon={CopyIcon}
            action={() => copyToClipboard(decoration.hash)}
        />
        {decoration.authorId === UserStore.getCurrentUser().id &&
            <Menu.MenuItem
                id={cl("decoration-context-menu-delete")}
                label="Delete Decoration"
                color="danger"
                icon={DeleteIcon}
                action={() => openModal(props => (
                    <ConfirmModal
                        {...props}
                        title="Delete Decoration"
                        subtitle={`Are you sure you want to delete ${decoration.alt}?`}
                        confirmText="Delete"
                        cancelText="Cancel"
                        onConfirm={() => {
                            deleteDecoration(decoration);
                        }}
                    />
                ))}
            />
        }
    </Menu.Menu>;
}
