/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PlusIcon } from "@components/Icons";
import { ChannelStore, Clickable, Dialog, Popout, ScrollerThin, Text, TextInput, useMemo, UserStore, useState } from "@webpack/common";

import { UserEntry } from "..";

type Props = {
    data: UserEntry[];
    setData: React.Dispatch<React.SetStateAction<UserEntry[]>>;
};

export default function AddUser(props: Props) {
    const [show, setShow] = useState(false);
    const [searchStr, setSearchStr] = useState("");

    useMemo(() => {
        setSearchStr("");
    }, [show]);

    const userList = useMemo(() => {
        const ids = ChannelStore.getDMUserIds();
        const sets: {
            name: string;
            id: string;
            avatar: string;
        }[] = ids.map(id => {
            const user = UserStore.getUser(id);

            return {
                name: user.username,
                id: user.id,
                avatar: user.getAvatarURL(undefined, undefined, true)
            };
        });

        return sets;
    }, []);

    // Filter out users that match the current search query and aren't already added
    const filteredList = useMemo(() => {
        return userList.filter(({ name, id }) =>
            name.includes(searchStr)
            && props.data.every(([existingId]) => id !== existingId)
        );
    }, [searchStr, show]);

    return <Popout
        shouldShow={show}
        position="top"
        onRequestClose={() => setShow(false)}
        renderPopout={() => (
            <Dialog
                className="vc-bedtimes-popout"
            >
                <Text variant="heading-md/bold">
                    Select a User
                </Text>
                <Text variant="text-sm/normal" className="vc-bedtimes-popout-subtext">
                    User not appearing here? Open a DM with them!
                </Text>

                <TextInput
                    placeholder="Search for a user"
                    inputMode="search"
                    value={searchStr}
                    onChange={val => setSearchStr(val)}
                />
                <ScrollerThin className="vc-bedtimes-popout-scroller">
                    {filteredList.map(({ name, id, avatar }) =>
                        <Clickable
                            className="vc-bedtimes-user"
                            onClick={() => {
                                props.setData(data => ([...data, [id, "01:00", "02:00"]]));
                                setShow(false);
                            }}
                        >
                            <img
                                className="vc-bedtimes-avatar"
                                src={avatar}
                                alt=""
                                loading="lazy"
                            />

                            <Text variant="text-sm/medium" className="vc-bedtimes-username">{name}</Text>
                        </Clickable>
                    )}
                </ScrollerThin>
            </Dialog>
        )}
    >
        {(_, { isShown }) => (
            <Clickable onClick={() => setShow(!isShown)}>
                <Text variant="text-sm/normal" className="vc-bedtimes-addUser">
                    <PlusIcon /> Add User
                </Text>
            </Clickable>
        )}
    </Popout>;
}
