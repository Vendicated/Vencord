/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ContextMenuApi } from "@webpack/common";
import type { HTMLProps } from "react";

import { Decoration } from "../../lib/api";
import { decorationToAvatarDecoration } from "../../lib/utils/decoration";
import { DecorationGridDecoration } from ".";
import DecorationContextMenu from "./DecorationContextMenu";

interface DecorDecorationGridDecorationProps extends HTMLProps<HTMLDivElement> {
    decoration: Decoration;
    isSelected: boolean;
    onSelect: () => void;
}

export default function DecorDecorationGridDecoration(props: DecorDecorationGridDecorationProps) {
    const { decoration } = props;

    return <DecorationGridDecoration
        {...props}
        onContextMenu={e => {
            ContextMenuApi.openContextMenu(e, () => (
                <DecorationContextMenu
                    decoration={decoration}
                />
            ));
        }}
        avatarDecoration={decorationToAvatarDecoration(decoration)}
    />;
}
