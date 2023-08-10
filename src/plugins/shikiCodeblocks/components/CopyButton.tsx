/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCopyCooldown } from "../hooks/useCopyCooldown";

export interface CopyButtonProps extends React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
    content: string;
}

export function CopyButton({ content, ...props }: CopyButtonProps) {
    const [copyCooldown, copy] = useCopyCooldown(1000);

    return (
        <button
            {...props}
            style={{
                ...props.style,
                cursor: copyCooldown ? "default" : undefined,
            }}
            onClick={() => copy(content)}
        >
            {copyCooldown ? "Copied!" : "Copy"}
        </button>

    );
}
