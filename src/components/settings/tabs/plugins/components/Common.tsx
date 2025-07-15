/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Margins } from "@utils/margins";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { DefinedSettings, PluginOptionBase } from "@utils/types";
import { Forms } from "@webpack/common";
import { PropsWithChildren } from "react";

interface SettingBaseProps<T> {
    option: T;
    onChange(newValue: any): void;
    pluginSettings: {
        [setting: string]: any;
        enabled: boolean;
    };
    id: string;
    definedSettings?: DefinedSettings;
}

export type SettingProps<T extends PluginOptionBase> = SettingBaseProps<T>;
export type ComponentSettingProps<T extends Omit<PluginOptionBase, "description" | "placeholder">> = SettingBaseProps<T>;

export function resolveError(isValidResult: boolean | string) {
    if (typeof isValidResult === "string") return isValidResult;

    return isValidResult ? null : "Invalid input provided";
}

interface SettingsSectionProps extends PropsWithChildren {
    name: string;
    description: string;
    error: string | null;
}

export function SettingsSection({ name, description, error, children }: SettingsSectionProps) {
    return (
        <Forms.FormSection>
            <Forms.FormTitle>{wordsToTitle(wordsFromCamel(name))}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom20} type="description">{description}</Forms.FormText>
            {children}
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
}
