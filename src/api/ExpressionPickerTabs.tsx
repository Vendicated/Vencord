/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Channel } from "discord-types/general";

export interface ExpressionPickerButtonProps {
    id?: string;
    "aria-controls": string;
    "aria-selected": boolean;
    isActive: boolean;
    viewType: string;
    children: string | JSX.Element;
    autoFocus?: boolean;
    [key: string]: any;
}

export interface ExpressionPickerPanelProps {
    selectedTab: string;
    channel: Channel;
}

export type ExpressionPickerButtonComponent = (props: ExpressionPickerButtonProps) => JSX.Element | null;
export type ExpressionPickerPanelComponent = (props: ExpressionPickerPanelProps) => JSX.Element | null;


export interface ExpressionPickerTabItem {
    tab: string,
    Component: ExpressionPickerPanelComponent;
    autoFocus?: boolean;
}

const ExpressionPickerComponents = new Map<string, ExpressionPickerTabItem>();


export const addExpressionPickerTabButton = (id: string, tab: string, PanelComponent: ExpressionPickerPanelComponent, autoFocus?: boolean) => ExpressionPickerComponents.set(id, { tab: tab, Component: PanelComponent, autoFocus: autoFocus });
export const removeExpressionPickerTabButton = (id: string) => ExpressionPickerComponents.delete(id);


export function* RenderTabButtons(ExpressionPickerButtonComponent: ExpressionPickerButtonComponent, selectedTab: string) {
    for (const [id, { tab }] of ExpressionPickerComponents) {
        yield (<ErrorBoundary><ExpressionPickerButtonComponent
            id={id + "-picker-tab"}
            aria-controls={id + "-picker-tab-panel"}
            aria-selected={id === selectedTab}
            viewType={id}
            isActive={id === selectedTab}
        >{tab}</ExpressionPickerButtonComponent></ErrorBoundary>);
    }
}

export function* TabPanels(selectedTab: string, channel: Channel) {
    for (const [id, { Component }] of ExpressionPickerComponents) {
        if (id !== selectedTab) { continue; }
        const PanelComponent: ExpressionPickerPanelComponent = Component;
        yield (<ErrorBoundary><PanelComponent selectedTab={selectedTab} channel={channel} /></ErrorBoundary>);
    }
}
