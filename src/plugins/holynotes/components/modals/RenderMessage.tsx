/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy, findByProps, findByPropsLazy } from "@webpack";
import { ContextMenuApi, FluxDispatcher, Menu, NavigationRouter, React } from "@webpack/common";
import noteHandler from "plugins/holynotes/noteHandler";
import { HolyNotes } from "plugins/holynotes/types";

const { message, groupStart, cozyMessage } = findByPropsLazy("cozyMessage");
const User = findByCodeLazy("isClyde(){");
const Message = findByCodeLazy("isEdited(){");
const Channel = findByCodeLazy("ChannelRecordBase");

export default ({
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

    console.log(note, notebook, updateParent, fromDeleteModal, closeModal);

    const render = (
        <div
            className="holy-note"
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
            {/* <ChannelMessage
                className={`holy-render ${message} ${groupStart} ${cozyMessage}`}
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
            /> */}

        </div>
    );

    console.log(render);
};

const NoteContextMenu = (props) => {
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
                </Menu.Menu>);
        }}></div>
    );
};
