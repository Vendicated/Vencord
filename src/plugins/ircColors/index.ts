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
import definePlugin, { OptionType } from "@utils/types";
import { GuildMember, Role } from "@vencord/discord-types";

type ColorProps = Pick<GuildMember | Role, "colorString" | "colorStrings">;

// https://stackoverflow.com/a/44134328
// Role Color Everywhere expects colorString to be hex, so...
function hslToHex(hue: number, saturation: number, lightness: number) {
    lightness /= 100;
    const a = saturation * Math.min(lightness, 1 - lightness) / 100;
    const f = (n: number) => {
        const k = (n + hue / 30) % 12;
        const color = lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        // Clip RGB, not HSL, so extended saturation and lightness still affect the color.
        return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

const settings = definePluginSettings({
    lightness: {
        description: "Lightness, in %. Change if the colors are too light or too dark",
        type: OptionType.NUMBER,
        default: 70,
    },
    saturation: {
        description: "Saturation, in %. Change if the colors are too vibrant or dull",
        type: OptionType.NUMBER,
        default: 100
    },
    seed: {
        description: "Changing this will shuffle everyone's username color to a new color",
        type: OptionType.STRING,
        default: "",
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

export function getUserColor(userId: string | undefined, { colorString, isPrivate }: { colorString?: string | null; isPrivate: boolean; }) {
    if (!Vencord.Plugins.isPluginEnabled("IrcColors")) return colorString;
    if (settings.store.applyColorOnlyInDms && !isPrivate) return colorString;
    if (settings.store.applyColorOnlyToUsersWithoutColor && colorString) return colorString;
    if (!userId) return colorString;

    const { lightness, saturation, seed } = settings.store;
    const hue = Number(h64(userId + seed) % 360n);

    return hslToHex(hue, saturation, lightness);
}

export default definePlugin({
    name: "IrcColors",
    description: "Makes username colors in chat unique, like in IRC clients",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Grzesiek11, Devs.jamesbt365, Devs.hen],
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
        },
        // Activity bar
        {
            find: "Masks.CONTENT_INVENTORY_CARD_FACE_PILE_AVATAR",
            replacement: {
                match: /\{colorString:.+?\}/,
                replace: "$self.wrapAuthorColorProps($&,arguments[0])"
            },
            predicate: () => settings.store.memberListColors
        },
    ],

    wrapColorProps(colorProps: ColorProps, colorString: ColorProps["colorString"] | null) {
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
    },

    wrapMessageColorProps(colorProps: ColorProps, context: any) {
        try {
            return this.wrapColorProps(colorProps, this.calculateNameColorForMessageContext(context));
        } catch (e) {
            console.error("Failed to calculate message color strings:", e);
            return colorProps;
        }
    },

    wrapAuthorColorProps(colorProps: ColorProps, context: { entry: { author_id: string; }; guildId?: string; }) {
        try {
            const colorString = getUserColor(context.entry.author_id, {
                colorString: colorProps.colorString,
                isPrivate: context.guildId == null
            });
            return this.wrapColorProps(colorProps, colorString);
        } catch (e) {
            console.error("Failed to calculate author color strings:", e);
            return colorProps;
        }
    },

    calculateNameColorForMessageContext(context: any) {
        const userId: string | undefined = context?.message?.author?.id;
        const colorString = context?.author?.colorString;

        // Color preview in role settings
        if (context?.message?.channel_id === "1337" && userId === "313337")
            return colorString;

        return getUserColor(userId, {
            colorString,
            isPrivate: context?.channel?.isPrivate() ?? false
        });
    },

    calculateNameColorForListContext(context: any) {
        try {
            return getUserColor(context?.user?.id, {
                colorString: context?.colorString,
                isPrivate: context?.guildId === undefined
            });
        } catch (e) {
            console.error("Failed to calculate name color for list context:", e);
        }
    }
});
