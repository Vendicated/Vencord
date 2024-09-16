/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DeleteIcon } from "@components/Icons";
import { Clickable, Text, useMemo, UserStore } from "@webpack/common";

import { UserEntry } from "..";

type EntryProps = {
    i: number;
    setData: React.Dispatch<React.SetStateAction<UserEntry[]>>;
    userId: string;
    startTime: string;
    endTime: string;
};

export default function Entry({ i, setData, userId, startTime, endTime }: EntryProps) {
    const user = useMemo(() => UserStore.getUser(userId), [userId]);

    const remove = () => {
        setData(data => data.filter(([id]) => id !== userId));
    };
    const changeStartTime = (val: string) => {
        setData(data => {
            data[i][1] = val;
            return data;
        });
    };
    const changeEndTime = (val: string) => {
        setData(data => {
            data[i][2] = val;
            return data;
        });
    };

    return <tr>
        <td>
            <div className="vc-bedtimes-user-container">
                <div className="vc-bedtimes-user">
                    <img
                        className="vc-bedtimes-avatar"
                        src={user.getAvatarURL(undefined, undefined, true)}
                        alt=""
                    />

                    <Text variant="text-sm/medium" className="vc-bedtimes-username">{user.username}</Text>
                </div>
                <Clickable
                    className="vc-bedtimes-delete"
                    onClick={remove}
                >
                    <DeleteIcon />
                </Clickable>
            </div>
        </td>
        <td><input type="time" defaultValue={startTime} onChange={e => changeStartTime(e.target.value)} required /></td>
        <td><input type="time" defaultValue={endTime} onChange={e => changeEndTime(e.target.value)} required /></td>
    </tr>;
}
