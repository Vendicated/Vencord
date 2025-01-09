/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { JSX } from "react";

const OverFlowIcon = ({ width = 24, height = 24, color = "var(--interactive-normal)", className, ...rest }) => (
    <svg
        {...rest}
        width={width}
        height={height}
        viewBox="0 0 16 16"
        className={className}
    >
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.45329 8.53891L3.26217 13.7844C2.95995 14.0719 2.49772 14.0719 2.21328 13.7844C1.92883 13.497 1.92883 13.0299 2.21328 12.7245L6.88884 7.99999L2.21328 3.27543C1.92883 2.988 1.92883 2.50297 2.21328 2.21555C2.49772 1.92812 2.95995 1.92812 3.26217 2.21555L8.45329 7.47903C8.73774 7.76645 8.73774 8.23352 8.45329 8.53891Z"
            fill={color}
        />
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M14.4533 8.53891L9.26217 13.7844C8.95995 14.0719 8.49772 14.0719 8.21328 13.7844C7.92883 13.497 7.92883 13.0299 8.21328 12.7245L12.8888 7.99999L8.21328 3.27543C7.92883 2.988 7.92883 2.50297 8.21328 2.21555C8.49772 1.92812 8.95995 1.92812 9.26217 2.21555L14.4533 7.47903C14.7377 7.76645 14.7377 8.23352 14.4533 8.53891Z"
            fill={color}
        />
    </svg>
);

export default OverFlowIcon;
export const SvgOverFlowIcon = OverFlowIcon as unknown as (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
