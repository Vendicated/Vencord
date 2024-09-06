/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useState } from "..";

export default function ({
    items = [],
    container = ({ children }) => <>{children}</>
}: {
    items: { name: string, component: () => JSX.Element; }[];
    container?: ({ children }) => JSX.Element;
}) {
    const [active, setActive] = useState(items[0].name);
    return <>
        {container({
            children: <div className="colorwaysMenuTabs">
                {items.map(item => {
                    return <div className={`colorwaysMenuTab ${active === item.name ? "active" : ""}`} onClick={() => {
                        setActive(item.name);
                    }}>{item.name}</div>;
                })}
            </div>
        })}
        {items.map(item => {
            const Component = item.component;
            return active === item.name ? <Component /> : null;
        })}
    </>;
}
