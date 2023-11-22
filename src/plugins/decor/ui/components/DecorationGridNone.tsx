/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NoEntrySignIcon } from "@components/Icons";
import { i18n, Text } from "@webpack/common";
import { HTMLProps } from "react";

import { DecorationGridItem } from ".";

type DecorationGridNoneProps = HTMLProps<HTMLDivElement> & {
    isSelected: boolean;
    onSelect: () => void;
};

export default function DecorationGridNone(props: DecorationGridNoneProps) {
    return <DecorationGridItem
        {...props}
    >
        <NoEntrySignIcon />
        <Text
            variant="text-xs/normal"
            color="header-primary"
        >
            {i18n.Messages.NONE}
        </Text>
    </DecorationGridItem >;
}
