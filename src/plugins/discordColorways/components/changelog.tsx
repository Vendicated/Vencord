/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, Text } from "@webpack/common";
import { HTMLProps } from "react";

function Cli({ ...props }: HTMLProps<HTMLLIElement>) {
    return <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "14px", marginBottom: 0 }}><li className="colorwaysChangelog-li">{props.children}</li></Text>;
}


export function Changelog({ added = ["Nothing new"], changed = ["Nothing new"], fixed = ["Nothing new"] }: { added?: String[], changed?: String[], fixed?: String[]; }) {
    return <div className="colorwaysSelector-changelog">
        <Forms.FormTitle style={{ marginBottom: 0 }}>Added:</Forms.FormTitle>
        <ul>
            {added.map(t => {
                return <Cli>{t}</Cli>;
            })}
        </ul>
        <Forms.FormTitle style={{ marginBottom: 0 }}>Changed:</Forms.FormTitle>
        <ul>
            {changed.map(t => {
                return <Cli>{t}</Cli>;
            })}
        </ul>
        <Forms.FormTitle style={{ marginBottom: 0 }}>Fixed:</Forms.FormTitle>
        <ul>
            {fixed.map(t => {
                return <Cli>{t}</Cli>;
            })}
        </ul>
    </div>;
}
