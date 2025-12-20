/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCopyCooldown } from "@plugins/shikiCodeblocks.desktop/hooks/useCopyCooldown";

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
