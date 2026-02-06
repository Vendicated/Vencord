/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ButtonProps } from "@components/Button";
import { Button } from "@components/Button";
import { Heart } from "@components/Heart";

export default function DonateButton({
    variant,
    ...props
}: Partial<ButtonProps>) {
    return (
        <Button
            {...props}
            type="button"
            variant={variant}
            onClick={() => VencordNative.native.openExternal("https://github.com/sponsors/Vendicated")}
            className="vc-donate-button"
        >
            <Heart />
            Donate
        </Button>
    );
}
