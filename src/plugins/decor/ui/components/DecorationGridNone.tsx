/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NoEntrySignIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { getIntlMessage } from "@utils/discord";
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
        <Paragraph
            size="xs"
            style={{ color: "var(--text-strong, var(--text-default))" }}
        >
            {getIntlMessage("NONE")}
        </Paragraph>
    </DecorationGridItem >;
}
