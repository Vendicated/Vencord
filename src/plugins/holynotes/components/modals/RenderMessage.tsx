/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { ModalProps } from "@utils/modal";
import { findByCode, findByProps } from "@webpack";
import { ContextMenuApi, FluxDispatcher, Menu, NavigationRouter, React } from "@webpack/common";
import noteHandler from "plugins/holynotes/noteHandler";
import { HolyNotes } from "plugins/holynotes/types";


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
    const ChannelMessage = findByProps("ThreadStarterChatMessage").default;
    const { message, groupStart, cozyMessage } = findByProps("cozyMessage");
    const User = findByCode("isClyde(){");
    const Message = findByCode("isEdited(){");
    const Channel = findByProps("ChannelRecordBase").ChannelRecordBase;

    const [isHoldingDelete, setHoldingDelete] = React.useState(false);

    React.useEffect(() => {
        const deleteHandler = (e: { key: string; type: string; }) =>
            e.key.toLowerCase() === "delete" && setHoldingDelete(e.type.toLowerCase() === "keydown");

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
                if (isHoldingDelete && !fromDeleteModal) {
                    noteHandler.deleteNote(note.id, notebook);
                    updateParent?.();
                }
            }}
            onContextMenu={(event: any) => {
                if (!fromDeleteModal)
                    // @ts-ignore
                    return open(event, (props: any) => (
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
                className={classes("vc-holy-render", message, groupStart, cozyMessage)}
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
                    new Message(
                        Object.assign(
                            { ...note },
                            {
                                author: new User({ ...note.author }),
                                timestamp: new Date(note.timestamp),
                                embeds: note.embeds.map((embed: { timestamp: string | number | Date; }) =>
                                    embed.timestamp
                                        ? Object.assign(embed, {
                                            // @ts-ignore
                                            timestamp: new Moment(new Date(embed.timestamp)),
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
        <div onContextMenu={e => {
            ContextMenuApi.openContextMenu(e, () =>
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
                    />
                    <Menu.MenuItem
                        label="Delete Note"
                        id="delete"
                        action={() => {
                            noteHandler.deleteNote(note.id, notebook);
                            updateParent?.();
                        }}
                    />
                </Menu.Menu>
            );
        }}></div>
    );
};
