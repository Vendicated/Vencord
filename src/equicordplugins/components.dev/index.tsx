/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ComponentsIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { Devs } from "@utils/constants";
import { removeFromArray } from "@utils/misc";
import definePlugin, { StartAt } from "@utils/types";
import { SettingsRouter } from "@webpack/common";

import { ChipProps, ColorPickerProps, ManaBaseRadioGroupProps, ManaCalendarProps, ManaComboboxProps, ManaDatePickerProps, ManaSwitchProps, SimpleErrorBoundaryProps, SkeletonProps, StandaloneRadioIndicatorProps } from "./components";
import ComponentsTab from "./components/ComponentsTab";

export let Skeleton: React.ComponentType<SkeletonProps>;
export let Chip: React.ComponentType<ChipProps>;
export let StandaloneRadioIndicator: React.ComponentType<StandaloneRadioIndicatorProps>;
export let ManaCombobox: React.ComponentType<ManaComboboxProps>;
export let ManaBaseRadioGroup: React.ComponentType<ManaBaseRadioGroupProps>;
export let ManaDatePicker: React.ComponentType<ManaDatePickerProps>;
export let ManaCalendar: React.ComponentType<ManaCalendarProps>;
export let ManaSwitch: React.ComponentType<ManaSwitchProps>;
export let SimpleErrorBoundary: React.ComponentType<SimpleErrorBoundaryProps>;
export let ColorPicker: React.ComponentType<ColorPickerProps>;

export default definePlugin({
    name: "Components",
    description: "Adds a new tab to settings to browse Discord components.",
    tags: ["Appearance", "Customisation", "Console", "Developers", "Organisation"],
    authors: [Devs.prism],
    dependencies: ["Settings"],
    patches: [
        {
            find: /withHeader:\i=!0,size:/,
            replacement: {
                match: /(?=function (\i)\(\i\)\{.{0,50}withHeader:\i=!0)/,
                replace: "$self.Skeleton=$1;"
            }
        },
        {
            find: '="grayLight"}',
            replacement: {
                match: /(?=function (\i)\(\i\)\{.{0,25}="grayLight"\})/,
                replace: "$self.Chip=$1;"
            }
        },
        {
            find: ".standaloneRadioIndicator,",
            replacement: {
                match: /(?=function (\i)\(\i\)\{.{0,15}disabled:\i,isSelected:\i\})/,
                replace: "$self.StandaloneRadioIndicator=$1;"
            }
        },
        {
            find: "#{intl::AUTOCOMPLETE_NO_RESULTS_BODY}",
            replacement: {
                match: /(?<=data-listbox-item-id".*?itemToString:\i\}\);)(?=function (\i)\(\i\)\{)/,
                replace: "$self.ManaCombobox=$1;"
            }
        },
        {
            find: '"data-mana-component":"BaseRadioGroup"',
            replacement: {
                match: /(?=function (\i)\(\i\)\{.{0,400}"data-mana-component":"BaseRadioGroup")/,
                replace: "$self.ManaBaseRadioGroup=$1;"
            }
        },
        {
            find: '"data-mana-component":"date-picker"',
            replacement: {
                match: /(?=function (\i)\(\i\)\{.{0,60},placeholderValue:\i)/,
                replace: "$self.ManaDatePicker=$1;"
            }
        },
        {
            find: '"data-mana-component":"calendar"',
            replacement: {
                match: /(?=function (\i)\(\i\)\{.{0,400}"data-mana-component":"calendar")/,
                replace: "$self.ManaCalendar=$1;"
            }
        },
        {
            find: '"data-mana-component":"switch"',
            replacement: {
                match: /(?=function (\i)\(\i\)\{.{0,50}focusProps:\i,hasIcon:)/,
                replace: "$self.ManaSwitch=$1;"
            }
        },
        {
            find: '"data-mana-component":"switch"',
            replacement: {
                match: /(?=function (\i)\(\i\)\{.{0,50}focusProps:\i,hasIcon:)/,
                replace: "$self.ManaSwitch=$1;"
            }
        },
        {
            find: "#{intl::zksHZO::raw}",
            replacement: {
                match: /(?=class (\i).{0,90}getDerivedStateFromError)/,
                replace: "$self.SimpleErrorBoundary=$1;"
            }
        },
        {
            find: "#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}),focusProps:",
            replacement: {
                match: /(?=function (\i)\(\i\)\{let\{onChange:\i,onClose:\i,[^}]+?showEyeDropper:)/,
                replace: "$self.setColorPicker($1);"
            }
        },
    ],
    set Skeleton(value: any) {
        Skeleton = value;
    },
    set Chip(value: any) {
        Chip = value;
    },
    set StandaloneRadioIndicator(value: any) {
        StandaloneRadioIndicator = value;
    },
    set ManaCombobox(value: any) {
        ManaCombobox = value;
    },
    set ManaBaseRadioGroup(value: any) {
        ManaBaseRadioGroup = value;
    },
    set ManaDatePicker(value: any) {
        ManaDatePicker = value;
    },
    set ManaCalendar(value: any) {
        ManaCalendar = value;
    },
    set ManaSwitch(value: any) {
        ManaSwitch = value;
    },
    set SimpleErrorBoundary(value: any) {
        SimpleErrorBoundary = value;
    },
    set ColorPicker(value: any) {
        ColorPicker = value;
    },
    startAt: StartAt.WebpackReady,
    toolboxActions: {
        "Open Components Tab"() {
            SettingsRouter.openUserSettings("equicord_components_panel");
        },
    },
    start() {
        SettingsPlugin.customEntries.push({
            key: "equicord_components",
            title: "Components",
            Component: ComponentsTab,
            Icon: ComponentsIcon
        });
    },
    stop() {
        removeFromArray(SettingsPlugin.customEntries, e => e.key === "equicord_components");
    },
});
