/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ContextMenu } from "@webpack/common";
import discordifyDecoration from "plugins/decor/lib/utils/discordifyDecoration";

import { DecorationGridDecoration } from ".";
import DecorationContextMenu from "./DecorationContextMenu";

interface DecorDecorationGridDecorationProps {
    decoration: any;
    isSelected: boolean;
    onSelect: () => void;
    style: any;
}
export default function DecorDecorationGridDecoration(props) {
    return <DecorationGridDecoration
        {...props}
        onContextMenu={e => {
            ContextMenu.open(e, () => (
                <DecorationContextMenu
                    decoration={props.decoration}
                />
            ));
        }}
        avatarDecoration={discordifyDecoration(props.decoration)}
    />;
}
