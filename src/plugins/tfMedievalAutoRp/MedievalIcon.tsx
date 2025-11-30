/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { IconComponent } from "@utils/types";

import { cl } from "./utils"; // Assuming utils.ts will exist for classNames

export const MedievalIcon: IconComponent = ({ height = 18, width = 18, className, color = "currentColor" }) => {
    return (
        <svg
            viewBox="0 0 96 96"
            version="1.1"
            height={height}
            width={width}
            className={classes(cl("icon"), className)}
            fill={color}
        >
            <g id="TF2_Logo">
                <g transform="matrix(1.35646,0,0,1.35646,-15.5698,-25.6444)">
                    <path d="M12.695,45.067C16.619,30.514 29.603,19.662 45.213,18.943L42.768,39.883C38.728,41.031 35.381,43.834 33.509,47.512L12.695,45.067ZM61.429,50.792C60.472,46.798 57.912,43.424 54.468,41.389L56.924,20.358C71.238,24.601 81.778,37.663 82.235,53.236L61.429,50.792ZM81.042,63.488C77.153,77.955 64.313,88.772 48.836,89.624L51.291,68.602C55.193,67.395 58.416,64.634 60.234,61.044L81.042,63.488ZM32.293,57.761C33.272,61.883 35.957,65.348 39.559,67.366L37.113,88.315C22.633,84.167 11.941,71.016 11.493,55.318L32.293,57.761Z" />
                </g>
            </g>
        </svg>
    );
};
