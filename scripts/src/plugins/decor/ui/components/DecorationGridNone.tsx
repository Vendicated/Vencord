/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NoEntrySignIcon } from "@components/Icons";
import { getIntlMessage } from "@utils/discord";
import { Text } from "@webpack/common";
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
            color="text-strong"
        >
            {getIntlMessage("NONE")}
        </Text>
    </DecorationGridItem >;
}
