/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { JSX } from "react";

const component = (props: React.SVGProps<SVGSVGElement>): JSX.Element => (
    <svg viewBox="6 3.7 16 16" width={24} height={24} {...(props as React.SVGProps<SVGSVGElement>)}>
        <path
            fill="currentColor"
            d="M15.44,5H12.88v6.42L11.12,9.67,9.38,11.42V5H7a.58.58,0,0,0-.58.58V16.5a.56.56,0,0,0,.09.31l1.18,1.91a.55.55,0,0,0,.49.28H17a.58.58,0,0,0,.58-.58V8.48a.52.52,0,0,0-.07-.27L16,5.31A.6.6,0,0,0,15.44,5Zm.94,12.83H8.52l-.71-1.16h7.4a.58.58,0,0,0,.58-.59V7.41l.59,1.25Z"
        />
    </svg>
);

export default component;
export const Popover = component as unknown as (props: unknown) => JSX.Element;
