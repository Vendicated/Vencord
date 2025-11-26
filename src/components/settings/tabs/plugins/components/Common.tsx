/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { BaseText } from "@components/BaseText";
import { Span } from "@components/Span";
import { classes } from "@utils/misc";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { DefinedSettings, PluginOptionBase } from "@utils/types";
import { PropsWithChildren } from "react";

export const cl = classNameFactory("vc-plugins-setting-");

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
    error?: string | null;
    inlineSetting?: boolean;
    tag?: "label" | "div";
}

export function SettingsSection({ tag: Tag = "div", name, description, error, inlineSetting, children }: SettingsSectionProps) {
    return (
        <Tag className={cl("section")}>
            <div className={classes(cl("content"), inlineSetting && cl("inline"))}>
                <div className={cl("label")}>
                    {name && <BaseText weight="medium" className={cl("title")}>{wordsToTitle(wordsFromCamel(name))}</BaseText>}
                    {description && <Span className={cl("description")}>{description}</Span>}
                </div>
                {children}
            </div>
            {error && <Span className={cl("error")}>{error}</Span>}
        </Tag>
    );
}
