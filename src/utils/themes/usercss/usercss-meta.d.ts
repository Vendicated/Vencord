/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare module "usercss-meta" {
    import { Simplify } from "type-fest";

    export type UserCSSVariable = Simplify<{ name: string; label: string; } & (
        | {
            type: "text";
            default: string;
        }
        | {
            type: "color";
            // Hex, rgb(), rgba()
            default: string;
        }
        | {
            type: "checkbox";
            default: boolean;
        }
        | {
            type: "range";
            default: number;
            min?: number;
            max?: number;
            step?: number;
            units?: string;
        }
        | {
            type: "number";
            default: number;
        }
        | {
            type: "select";
            default: string;
            options: { name: string; label: string; value: string; }[];
        }
    )>;

    export interface UserstyleHeader {
        /**
         * The unique ID of the UserCSS style.
         *
         * @vencord Specific to Vencord, not part of the original module.
         */
        id: string;

        /**
         * The file name of the UserCSS style.
         *
         * @vencord Specific to Vencord, not part of the original module.
         */
        fileName: string;

        /**
         * The required plugins for this style.
         *
         * @vencord Specific to Vencord, not part of the original module.
         * @see {@link vc-requiredPlugins}
         */
        requiredPlugins?: string[];

        /**
         * The name of your style.
         *
         * The combination of {@link name} and {@link namespace} must be unique.
         */
        name: string;
        /**
         * The namespace of the style. Helps to distinguish between styles with the same name.
         *
         * The combination of {@link name} and {@link namespace} must be unique.
         */
        namespace: string;
        /**
         * The version of your style.
         */
        version: string;

        /**
         * A short significant description.
         */
        description?: string;
        /**
         * The author of the style.
         */
        author?: string;
        /**
         * The project's homepage.
         *
         * This is not an update URL. See {@link updateURL}.
         */
        homepageURL?: string;
        /**
         * The URL the user can report issues to the style author.
         */
        supportURL?: string;
        /**
         * The URL used when updating the style.
         */
        updateURL?: string;
        /**
         * The SPDX license identifier for this style. If none is included, the style is assumed to be All Rights Reserved.
         */
        license?: string;
        /**
         * The CSS preprocessor used to write this style.
         */
        preprocessor?: "default" | "uso" | "less" | "stylus";

        /**
         * A list of variables the style defines.
         */
        vars: Record<string, UserCSSVariable>;

        /**
         * Required plugins for this style to work. Comma-separated list of plugin names.
         *
         * @vencord This is a Vencord-specific extension, however we wish for this to become a standard for client mods
         *          to implement, hence the more generic namespaced name.
         */
        "vc-requiredPlugins"?: string;
    }

    type UserCSSParseOptions = {
        allowErrors: boolean;
        unknownKey: "assign";
    };

    export function parse(text: string, options: UserCSSParseOptions): { metadata: UserstyleHeader; errors: { code: string; args: any; }[]; };
}
