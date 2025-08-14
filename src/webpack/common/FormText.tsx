/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as t from "@vencord/discord-types";

import { Text } from "./components";

// TODO: replace with our own component soon
export const FormText: t.FormText = function FormText(props) {
    const variant = props.variant || "text-sm/normal";
    return (
        <Text
            variant={variant}
            {...props}
        >
            {props.children}
        </Text>
    );
} as any;

// @ts-expect-error
FormText.Types = {};
