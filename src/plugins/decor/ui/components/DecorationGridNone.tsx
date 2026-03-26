/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NoEntrySignIcon } from "@components/Icons";
import { getIntlMessage } from "@utils/discord";
import { BaseText } from "@components/BaseText";
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
        <BaseText
            size="xs" weight="normal"
            color="text-strong"
        >
            {getIntlMessage("NONE")}
        </BaseText>
    </DecorationGridItem >;
}
