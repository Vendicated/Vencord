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


export function Changelog({ added = [], changed = [], fixed = [] }: { added?: String[], changed?: String[], fixed?: String[]; }) {
    return <div className="colorwaysSelector-changelog">
        {added.length > 0 ? <>
            <Forms.FormTitle style={{ marginBottom: 0 }} className="colorwaysSelector-changelogHeader colorwaysSelector-changelogHeader_added">Added</Forms.FormTitle>
            <ul style={{ margin: "4px 0 8px 20px" }}>
                {added.map(t => {
                    return <Cli>{t}</Cli>;
                })}
            </ul>
        </> : <></>}
        {changed.length > 0 ? <>
            <Forms.FormTitle style={{ marginBottom: 0 }} className="colorwaysSelector-changelogHeader colorwaysSelector-changelogHeader_changed">Changed</Forms.FormTitle>
            <ul style={{ margin: "4px 0 8px 20px" }}>
                {changed.map(t => {
                    return <Cli>{t}</Cli>;
                })}
            </ul>
        </> : <></>}
        {fixed.length > 0 ? <>
            <Forms.FormTitle style={{ marginBottom: 0 }} className="colorwaysSelector-changelogHeader colorwaysSelector-changelogHeader_fixed">Fixed</Forms.FormTitle>
            <ul style={{ margin: "4px 0 8px 20px" }}>
                {fixed.map(t => {
                    return <Cli>{t}</Cli>;
                })}
            </ul>
        </> : <></>}
    </div>;
}
