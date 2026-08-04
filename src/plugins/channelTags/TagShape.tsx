/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/index";

import { DEFAULT_TAG_SHAPE, TagShape, TagShapes } from "./data";

let SHAPES: Record<TagShape, React.JSX.Element> | undefined;
const getShapes = () => SHAPES || (SHAPES = {
    [TagShapes.Square]: <path d="M3 1.99999996h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1" />,
    [TagShapes.Triangle]: <path d="m6.50000017 1.47590924 4.4185995 7.65323896a.57735027.57735027 0 0 1-.5.8660254l-8.8371992-2e-7a.57735027.57735027 0 0 1-.5-.8660254l4.4185997-7.65323878a.57735027.57735027 0 0 1 1 2e-8" />,
    [TagShapes.Circle]: <circle cx="6" cy="6" r="4.5" />,
    [TagShapes.Star]: <path d="m6.47970457 1.31657414 1.1566326 2.11560353a1.0561405 1.0561405 0 0 0 .7312135.5312577l2.0746613.3907402a.71072986.71072986 0 0 1 .385415 1.1861877l-1.4487643 1.5355704a1.0561405 1.0561405 0 0 0-.2792987.859593l.3077849 2.391411a.54671527.54671527 0 0 1-.7761781.5639263l-2.179256-1.0317075a1.0561405 1.0561405 0 0 0-.9038296 0l-2.1792562 1.0317075a.54671527.54671527 0 0 1-.7761781-.5639265l.2986582-2.3204975a1.2071647 1.2071647 0 0 0-.3192373-.9825117l-1.3996992-1.4835652a.71072986.71072986 0 0 1 .3854158-1.1861877l2.0746609-.39074a1.0561405 1.0561405 0 0 0 .7312135-.5312577l1.1566329-2.11560357a.54671527.54671527 0 0 1 .9594089 4e-8" />,
    [TagShapes.Spark]: <path d="m6.4692914 1.3831106.3372011 1.3969438a3.2727659 3.2727659 45.000002 0 0 2.4134531 2.4134533l1.3969434.3372011a.48276975.48276975 90.000002 0 1 0 .9385826l-1.3969434.3372011a3.2727659 3.2727659 135 0 0-2.4134533 2.4134531l-.3372011 1.3969434a.48276975.48276975.00000157 0 1-.9385826 0l-.3372011-1.3969434a3.2727659 3.2727659 45.000002 0 0-2.4134531-2.4134533l-1.3969438-.3372011a.48276975.48276975 90.000002 0 1 0-.9385826l1.3969438-.3372011a3.2727659 3.2727659 135 0 0 2.4134533-2.4134531l.3372011-1.3969438a.48276975.48276975.00000157 0 1 .9385826 0" />,
});

function getBorderColor(color: string) {
    return `color-mix(in oklab, ${color}, oklch(from ${color} round(0.9 - L) 0 0) 75%)`;
}

export function TagShapeIcon({
    className,
    color,
    tagShape = DEFAULT_TAG_SHAPE
}: {
    className?: string;
    color: string;
    tagShape?: TagShape;
}) {
    const borderColor = getBorderColor(color);
    const shape = getShapes()[tagShape];

    return (
        <svg
            aria-hidden="true"
            className={classes("vc-channel-tags-tag-shape", className)}
            viewBox="0 0 12 12"
            xmlns="http://www.w3.org/2000/svg"
            filter={`drop-shadow(1px 1px 0 ${borderColor}) drop-shadow(1px 1px 0 ${borderColor})`}
            transform="translate(-1 -1)"
        >
            <g fill={color} stroke={borderColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" paintOrder="markers stroke fill">
                {shape}
            </g>
        </svg>
    );
}
