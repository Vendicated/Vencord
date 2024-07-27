/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Margins } from "@utils/margins";
import { Forms } from "@webpack/common";

export const settingsAboutComponent = () => (
    <Forms.FormSection>
        <Forms.FormTitle tag="h3">Usage</Forms.FormTitle>
        <Forms.FormText>
            After enabling this plugin, you will see custom theme colors and effects in the profiles of others using this plugin.
            <div className={Margins.top8}>
                <b>To set your own profile theme colors and effect:</b>
            </div>
            <ol
                className={Margins.bottom8}
                style={{ listStyle: "decimal", paddingLeft: "40px" }}
            >
                <li>Go to your profile settings</li>
                <li>Use the FPTE Builder to choose your profile theme colors and effect</li>
                <li>Click the "Copy FPTE" button</li>
                <li>Paste the invisible text anywhere in your About Me</li>
            </ol>
        </Forms.FormText>
    </Forms.FormSection>
);
