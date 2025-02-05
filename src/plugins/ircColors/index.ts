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
import { ChannelStore, GuildMemberStore, SelectedChannelStore } from "@webpack/common";

function calculateHSLforId(id: string) {
    // No hooks: this also runs outside React components.
    return {
        hue: Number(h64(id + settings.store.seed) % 360n),
        saturation: settings.store.saturation,
        lightness: settings.store.lightness
    };
}

// https://stackoverflow.com/a/44134328
function hslToHex(hue, saturation, lightness) {
    lightness /= 100;
    const a = saturation * Math.min(lightness, 1 - lightness) / 100;
    const f = n => {
        const k = (n + hue / 30) % 12;
        const color = lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, "0"); // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function calculateNameColorForUser(id?: string) {
    if (!id) return null;
    const { hue, saturation, lightness } = calculateHSLforId(id);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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

export default definePlugin({
    name: "IrcColors",
    description: "Makes username colors in chat unique, like in IRC clients",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Grzesiek11, Devs.jamesbt365, Devs.hen],
    settings,

    patches: [
        {
            find: '"Result cannot be null because the message is not null"',
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

    calculateHSLforId,
    resolveUsedColor(userId: string) {
        const channelId = SelectedChannelStore.getChannelId();
        const channel = ChannelStore.getChannel(channelId);
        const colorString = channel?.guild_id
            ? GuildMemberStore.getMember(channel.guild_id, userId)?.colorString
            : undefined;

        if (settings.store.applyColorOnlyInDms && !channel?.isPrivate()) return colorString;
        if (settings.store.applyColorOnlyToUsersWithoutColor && colorString) return colorString;

        const { hue, lightness, saturation } = calculateHSLforId(userId);

        return hslToHex(hue, saturation, lightness);
    },
    calculateNameColorForMessageContext(context: any) {
        const userId: string | undefined = context?.message?.author?.id;
        const colorString = context?.author?.colorString;
        const color = userId ? this.resolveUsedColor(userId) : null;

        // Color preview in role settings
        if (context?.message?.channel_id === "1337" && userId === "313337")
            return colorString;

        if (settings.store.applyColorOnlyInDms && !context?.channel?.isPrivate()) {
            return colorString;
        }

        return (!settings.store.applyColorOnlyToUsersWithoutColor || !colorString)
            ? color
            : colorString;
    },

    calculateNameColorForListContext(context: any) {
        try {
            const id = context?.user?.id;
            const colorString = context?.colorString;
            const color = id ? this.resolveUsedColor(id) : null;

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
