/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { FormSwitch } from "@components/FormSwitch";
import definePlugin from "@utils/types";
import type { Channel, RenderModalProps } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { ChannelStore, Menu, Modal, openModal, PermissionsBits, PermissionStore, RestAPI, showToast, TextInput, useState } from "@webpack/common";

const DuplicateCategoryModal = ErrorBoundary.wrap(({ category, ...props }: RenderModalProps & { category: Channel; }) => {
    const [name, setName] = useState(category.name);
    const [copyPermissions, setCopyPermissions] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function createCategory() {
        if (saving || !name.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const source = ChannelStore.getChannel(category.id);
            if (!source || source.type !== ChannelType.GUILD_CATEGORY)
                throw new Error("The original category no longer exists.");
            await RestAPI.post({
                url: `/guilds/${source.guild_id}/channels`,
                body: {
                    name: name.trim(),
                    type: ChannelType.GUILD_CATEGORY,
                    permission_overwrites: copyPermissions ? Object.values(source.permissionOverwrites).map(overwrite => ({
                        id: overwrite.id,
                        type: overwrite.type,
                        allow: String(overwrite.allow),
                        deny: String(overwrite.deny)
                    })) : []
                }
            });
            props.onClose();
            showToast({ text: "Category created.", variant: "success" });
        } catch (error) {
            setError(error instanceof Error ? error.message : "Could not create the category. Check your permissions and try again.");
            setSaving(false);
        }
    }

    return (
        <Modal
            {...props}
            title="Duplicate Category"
            size="sm"
            notice={error ? { message: error, type: "critical" } : undefined}
            actions={[
                { text: "Cancel", variant: "secondary", onClick: props.onClose, disabled: saving },
                { text: "Create Category", variant: "primary", onClick: createCategory, loading: saving, disabled: saving || !name.trim() }
            ]}
        >
            <form onSubmit={event => { event.preventDefault(); void createCategory(); }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }} htmlFor="vc-duplicate-category-name">Category Name</label>
                <TextInput
                    id="vc-duplicate-category-name"
                    autoFocus
                    value={name}
                    maxLength={100}
                    disabled={saving}
                    placeholder="New Category"
                    onChange={setName}
                />
            </form>
            <div style={{ marginTop: 16 }}>
                <FormSwitch
                    title={<><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4, verticalAlign: "-2px" }}><path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2ZM9 6a3 3 0 0 1 6 0v2H9Zm9 14H6V10h12Z" /></svg>Copy Permissions</>}
                    description="Copy the original category's permissions to the new category. Turn this off to use the server's default permissions."
                    value={copyPermissions}
                    onChange={setCopyPermissions}
                    disabled={saving}
                    hideBorder
                />
            </div>
        </Modal>
    );
}, { noop: false });

const patchCategoryMenu: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    try {
        if (channel?.type !== ChannelType.GUILD_CATEGORY || !PermissionStore.can(PermissionsBits.MANAGE_CHANNELS, channel)) return;
        const editIds = ["edit-channel", "edit-category"];
        const group = findGroupChildrenByChildId(editIds, children);
        if (!group) return;
        const editIndex = group.findIndex(item => editIds.includes(item?.props?.id));
        if (group.some(item => item?.props?.id === "vc-duplicate-category")) return;
        group.splice(editIndex + 1, 0,
            <Menu.MenuItem
                id="vc-duplicate-category"
                key="vc-duplicate-category"
                label="Duplicate Category"
                action={() => openModal(props => <DuplicateCategoryModal {...props} category={channel} />)}
            />
        );
    } catch (error) {
        console.error("[DuplicateCategory] Could not add category menu item", error);
    }
};

export default definePlugin({
    name: "DuplicateCategory",
    description: "Adds an option to duplicate a category with the same permissions.",
    tags: ["Utility"],
    authors: [{ name: "wreckware", id: 892246841016590386n }],
    contextMenus: {
        "channel-context": patchCategoryMenu,
        "channel-category-context": patchCategoryMenu
    }
});
