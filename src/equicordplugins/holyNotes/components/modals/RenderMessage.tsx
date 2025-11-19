/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CopyIcon, DeleteIcon, IDIcon, LinkIcon, OpenExternalIcon } from "@components/Icons";
import { makeDummyUser } from "@components/settings/tabs/plugins/PluginModal";
import { MessageType } from "@equicordplugins/holyNotes";
import { noteHandler } from "@equicordplugins/holyNotes/NoteHandler";
import { HolyNotes } from "@equicordplugins/holyNotes/types";
import { copyToClipboard } from "@utils/clipboard";
import { classes } from "@utils/misc";
import { ModalProps } from "@utils/modal";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ContextMenuApi, FluxDispatcher, Menu, NavigationRouter, React } from "@webpack/common";

const messageClasses = findByPropsLazy("message", "groupStart", "cozyMessage");
const Channel = findByCodeLazy("computeLurkerPermissionsAllowList(){");
const ChannelMessage = findComponentByCodeLazy("Message must not be a thread");

export const RenderMessage = ({
    note,
    notebook,
    updateParent,
    fromDeleteModal,
    closeModal,
}: {
    note: HolyNotes.Note;
    notebook: string;
    updateParent?: () => void;
    fromDeleteModal: boolean;
    closeModal?: () => void;
}) => {
    const isHoldingDeleteRef = React.useRef(false);
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    React.useEffect(() => {
        const deleteHandler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "delete") return;
            const newState = e.type === "keydown";
            if (isHoldingDeleteRef.current !== newState) {
                isHoldingDeleteRef.current = newState;
                forceUpdate();
            }
        };

        document.addEventListener("keydown", deleteHandler);
        document.addEventListener("keyup", deleteHandler);

        return () => {
            document.removeEventListener("keydown", deleteHandler);
            document.removeEventListener("keyup", deleteHandler);
        };
    }, []);

    return (
        <div
            className="vc-holy-note"
            style={{
                marginBottom: "8px",
                marginTop: "8px",
                paddingTop: "4px",
                paddingBottom: "4px",
            }}
            onClick={() => {
                if (isHoldingDeleteRef.current && !fromDeleteModal) {
                    noteHandler.deleteNote(note.id, notebook);
                    updateParent?.();
                }
            }}
            onContextMenu={(event: any) => {
                if (!fromDeleteModal)
                    // @ts-ignore
                    return ContextMenuApi.openContextMenu(event, (props: any) => (
                        // @ts-ignore
                        <NoteContextMenu
                            {...Object.assign({}, props, { onClose: close })}
                            note={note}
                            notebook={notebook}
                            updateParent={updateParent}
                            closeModal={closeModal}
                        />
                    ));
            }}
        >
            <ChannelMessage
                className={classes("vc-holy-render", messageClasses?.message, messageClasses?.groupStart, messageClasses?.cozyMessage)}
                key={note.id}
                groupId={note.id}
                id={note.id}
                compact={false}
                isHighlight={false}
                isLastItem={false}
                renderContentOnly={false}
                // @ts-ignore
                channel={new Channel({ id: "holy-notes" })}
                message={
                    new MessageType(
                        Object.assign(
                            { ...note },
                            {
                                author: makeDummyUser(note?.author),
                                timestamp: new Date(note?.timestamp),
                                // @ts-ignore
                                embeds: note?.embeds?.map((embed: { timestamp: string | number | Date; }) =>
                                    embed.timestamp
                                        ? Object.assign(embed, {
                                            timestamp: new Date(embed.timestamp),
                                        })
                                        : embed,
                                ),
                            },
                        ),
                    )
                }
            />

        </div>
    );
};

const NoteContextMenu = (
    props: ModalProps & {
        updateParent?: () => void;
        notebook: string;
        note: HolyNotes.Note;
        closeModal?: () => void;
    }) => {
    const { note, notebook, updateParent, closeModal } = props;

    return (
        <Menu.Menu
            navId="holynotes"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Holy Notes"
        >
            <Menu.MenuItem
                label="Jump To Message"
                id="jump"
                action={() => {
                    NavigationRouter.transitionTo(`/channels/${note.guild_id ?? "@me"}/${note.channel_id}/${note.id}`);
                    closeModal?.();
                }}
                icon={OpenExternalIcon}
            />
            <Menu.MenuItem
                label="Copy Text"
                id="copy-text"
                action={() => copyToClipboard(note.content)}
                icon={CopyIcon}
            />
            {note?.attachments.length ? (
                <Menu.MenuItem
                    label="Copy Attachment URL"
                    id="copy-url"
                    action={() => copyToClipboard(note.attachments[0].url)}
                    icon={LinkIcon}
                />) : null}
            <Menu.MenuItem
                label="Copy ID"
                id="copy-id"
                action={() => copyToClipboard(note.id)}
                icon={IDIcon}
            />
            {Object.keys(noteHandler.getAllNotes()).length !== 1 ? (
                <Menu.MenuItem
                    label="Move Note"
                    id="move-note"
                >
                    {Object.keys(noteHandler.getAllNotes()).map((key: string) => {
                        if (key !== notebook) {
                            return (
                                <Menu.MenuItem
                                    key={key}
                                    label={`Move to ${key}`}
                                    id={key}
                                    action={() => {
                                        noteHandler.moveNote(note, notebook, key);
                                        updateParent?.();
                                    }}
                                />
                            );
                        }
                    })}
                </Menu.MenuItem>
            ) : null}
            <Menu.MenuItem
                color="danger"
                label="Delete Note"
                id="delete"
                action={() => {
                    noteHandler.deleteNote(note.id, notebook);
                    updateParent?.();
                }}
                icon={DeleteIcon}
            />
        </Menu.Menu>
    );

};
