/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export default function ({
    items = [],
    container = ({ children }) => <>{children}</>,
    onChange,
    active = ""
}: {
    items: { name: string, component: () => JSX.Element; }[];
    container?: ({ children }) => JSX.Element;
    onChange: (tab: string) => void;
    active: string;
}) {
    return <>
        {container({
            children: <div className="colorwaysMenuTabs">
                {items.map(item => {
                    return <div className={`colorwaysMenuTab ${active === item.name ? "active" : ""}`} onClick={() => onChange(item.name)}>{item.name}</div>;
                })}
            </div>
        })}
    </>;
}
