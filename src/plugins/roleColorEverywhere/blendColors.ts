/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function blendColors(color1hex: string, color2hex: string, percentage: number) {
    // check input
    color1hex = color1hex || "#000000";
    color2hex = color2hex || "#ffffff";
    percentage = percentage || 0.5;

    // 2: check to see if we need to convert 3 char hex to 6 char hex, else slice off hash
    //      the three character hex is just a representation of the 6 hex where each character is repeated
    //      ie: #060 => #006600 (green)
    if (color1hex.length === 4)
        color1hex = color1hex[1] + color1hex[1] + color1hex[2] + color1hex[2] + color1hex[3] + color1hex[3];
    else
        color1hex = color1hex.substring(1);
    if (color2hex.length === 4)
        color2hex = color2hex[1] + color2hex[1] + color2hex[2] + color2hex[2] + color2hex[3] + color2hex[3];
    else
        color2hex = color2hex.substring(1);

    // 3: we have valid input, convert colors to rgb
    const color1rgb = [parseInt(color1hex[0] + color1hex[1], 16), parseInt(color1hex[2] + color1hex[3], 16), parseInt(color1hex[4] + color1hex[5], 16)];
    const color2rgb = [parseInt(color2hex[0] + color2hex[1], 16), parseInt(color2hex[2] + color2hex[3], 16), parseInt(color2hex[4] + color2hex[5], 16)];

    // 4: blend
    const color3rgb = [
        (1 - percentage) * color1rgb[0] + percentage * color2rgb[0],
        (1 - percentage) * color1rgb[1] + percentage * color2rgb[1],
        (1 - percentage) * color1rgb[2] + percentage * color2rgb[2]
    ];

    // 5: convert to hex
    const color3hex = "#" + intToHex(color3rgb[0]) + intToHex(color3rgb[1]) + intToHex(color3rgb[2]);

    return color3hex;
}

/*
    convert a Number to a two character hex string
    must round, or we will end up with more digits than expected (2)
    note: can also result in single digit, which will need to be padded with a 0 to the left
    @param: num         => the number to conver to hex
    @returns: string    => the hex representation of the provided number
*/
function intToHex(num: number) {
    var hex = Math.round(num).toString(16);
    if (hex.length === 1)
        hex = "0" + hex;
    return hex;
}
