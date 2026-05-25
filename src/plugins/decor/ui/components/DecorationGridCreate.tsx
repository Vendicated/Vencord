/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PlusIcon } from "@components/Icons";
import { getIntlMessage } from "@utils/discord";
import { HTMLProps } from "react";

import { BaseText } from "@components/BaseText";
import { DecorationGridItem } from ".";

type DecorationGridCreateProps = HTMLProps<HTMLDivElement> & {
    onSelect: () => void;
};

export default function DecorationGridCreate(props: DecorationGridCreateProps) {
    return <DecorationGridItem
        {...props}
        isSelected={false}
    >
        <PlusIcon />
        <BaseText
            size="xs"
            color="text-strong"
        >
            {getIntlMessage("CREATE")}
        </BaseText>
    </DecorationGridItem >;
}
