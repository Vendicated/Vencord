/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Text, useEffect, useState } from "@webpack/common";

import type { UserEntry } from ".";
import AddUser from "./components/AddUser";
import Entry from "./components/Entry";

type Props = {
    data: UserEntry[];
    setValue(e: UserEntry[]): void;
};

export default function SettingsComponent(props: Props) {
    const [data, setData] = useState(props.data);

    useEffect(() => {
        props.setValue(data);
    }, [data]);

    return <>
        <table className="vc-bedtimes-settings">
            <thead>
                <th><Text variant="text-xs/semibold">User</Text></th>
                <th><Text variant="text-xs/semibold">Bed Time Start</Text></th>
                <th><Text variant="text-xs/semibold">Bed Time End</Text></th>
            </thead>
            <tbody>
                {data.map((e, i) => (
                    <Entry
                        i={i}
                        setData={setData}
                        key={e[0]}
                        userId={e[0]}
                        startTime={e[1]}
                        endTime={e[2]}
                    />
                ))}
                <tr>
                    <td>
                        <AddUser data={data} setData={setData} />
                    </td>
                </tr>
            </tbody>
        </table>
    </>;
}
