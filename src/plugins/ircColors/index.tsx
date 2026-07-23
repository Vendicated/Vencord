/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { hash as h64 } from "@intrnl/xxhash64";
import { Devs } from "@utils/constants";
import definePlugin, { defineDefault, OptionType } from "@utils/types";
import { ColorPicker, useMemo, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    lightness: {
        description: "Lightness, in %. Change if the colors are too light or too dark",
        type: OptionType.NUMBER,
        default: 70,
    },
    useMyOwnColor: {
        description: "Use a custom color for yourself",
        restartNeeded: false,
        type: OptionType.BOOLEAN,
        default: false
    },
    myColor: {
        description: "Set your own color",
        type: OptionType.COMPONENT,
        component: () => {
            const { useMyOwnColor, myColor } = settings.use(["useMyOwnColor", "myColor"]);

            return (
                useMyOwnColor
                    ? <ColorPicker
                        color={myColor.color}
                        onChange={(color: number) => {
                            myColor.color = color;
                        }}
                    />
                    : <></>
            );
        },
        default: defineDefault({
            color: 0xFF0000,
        }),
    },
    memberListColors: {
        description: "Replace role colors in the member list",
        restartNeeded: true,
        type: OptionType.BOOLEAN,
        default: true
    },
    applyColorOnlyToUsersWithoutColor: {
        description: "Apply colors only to users who don't have a predefined color",
        restartNeeded: false,
        type: OptionType.BOOLEAN,
        default: false
    },
    applyColorOnlyInDms: {
        displayName: "Apply Color Only In DMs",
        description: "Apply colors only in direct messages; do not apply colors in servers.",
        restartNeeded: false,
        type: OptionType.BOOLEAN,
        default: false
    }
});

// Calculate a CSS color string based on the user ID
function calculateNameColorForUser(id?: string) {
    const { lightness } = settings.use(["lightness"]);
    const idHash = useMemo(() => id ? h64(id) : null, [id]);

    return idHash && `hsl(${idHash % 360n}, 100%, ${lightness}%)`;
}

function hexToHSL(hexCode: number) {
    // Hex => RGB normalized to 0-1
    const r = (hexCode >> 16 & 0xFF) / 255;
    const g = (hexCode >> 8 & 0xFF) / 255;
    const b = (hexCode & 0xFF) / 255;

    // RGB => HSL
    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);
    const delta = cMax - cMin;

    let hue: number;
    let saturation: number;
    let lightness: number;

    lightness = (cMax + cMin) / 2;

    if (delta === 0) {
        // If r=g=b then the only thing that matters is lightness
        hue = 0;
        saturation = 0;
    } else {
        // Magic
        saturation = delta / (1 - Math.abs(2 * lightness - 1));

        if (cMax === r) {
            hue = ((g - b) / delta) % 6;
        } else if (cMax === g) {
            hue = (b - r) / delta + 2;
        } else {
            hue = (r - g) / delta + 4;
        }

        hue *= 60;
        if (hue < 0) {
            hue += 360;
        }
    }

    // Move saturation and lightness from 0-1 to 0-100
    saturation *= 100;
    lightness *= 100;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default definePlugin({
    name: "IrcColors",
    description: "Makes username colors in chat unique, like in IRC clients",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Grzesiek11, Devs.jamesbt365],
    settings,

    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                // Override colorString with our custom color and disable gradients if applying the custom color.
                match: /(?<=colorString:\i,colorStrings:\i,colorRoleName:\i.*?}=)(\i),/,
                replace: "$self.wrapMessageColorProps($1, arguments[0]),"
            }
        },
        {
            find: "#{intl::GUILD_OWNER}),children:",
            replacement: {
                match: /(?<=roleName:\i,)colorString:/,
                replace: "colorString:$self.calculateNameColorForListContext(arguments[0]),originalColor:"
            },
            predicate: () => settings.store.memberListColors
        }
    ],

    wrapMessageColorProps(colorProps: { colorString: string, colorStrings?: Record<"primaryColor" | "secondaryColor" | "tertiaryColor", string>; }, context: any) {
        try {
            const colorString = this.calculateNameColorForMessageContext(context);
            if (colorString === colorProps.colorString) {
                return colorProps;
            }

            return {
                ...colorProps,
                colorString,
                colorStrings: colorProps.colorStrings && {
                    primaryColor: colorString,
                    secondaryColor: undefined,
                    tertiaryColor: undefined
                }
            };
        } catch (e) {
            console.error("Failed to calculate message color strings:", e);
            return colorProps;
        }
    },

    calculateNameColorForMessageContext(context: any) {
        const userId: string | undefined = context?.message?.author?.id;
        const colorString = context?.author?.colorString;
        const color = calculateNameColorForUser(userId);
        const myId = UserStore.getCurrentUser().id;

        // Color preview in role settings
        if (context?.message?.channel_id === "1337" && userId === "313337")
            return colorString;

        if (settings.store.applyColorOnlyInDms && !context?.channel?.isPrivate()) {
            return colorString;
        }

        if (settings.store.useMyOwnColor && userId === myId) {
            return hexToHSL(settings.store.myColor.color);
        }

        return (!settings.store.applyColorOnlyToUsersWithoutColor || !colorString)
            ? color
            : colorString;
    },

    calculateNameColorForListContext(context: any) {
        try {
            const id = context?.user?.id;
            const colorString = context?.colorString;
            const color = calculateNameColorForUser(id);

            if (settings.store.applyColorOnlyInDms && context?.guildId !== undefined) {
                return colorString;
            }

            return (!settings.store.applyColorOnlyToUsersWithoutColor || !colorString)
                ? color
                : colorString;
        } catch (e) {
            console.error("Failed to calculate name color for list context:", e);
        }
    }
});
