/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Channel } from "discord-types/general";
import { JSX } from "react";

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
}

const ExpressionPickerComponents = new Map<string, ExpressionPickerTabItem>();


export const addExpressionPickerTab = (id: string, tab: string, PanelComponent: ExpressionPickerPanelComponent) => ExpressionPickerComponents.set(id, { tab: tab, Component: PanelComponent });
export const removeExpressionPickerTab = (id: string) => ExpressionPickerComponents.delete(id);

export function RenderTabButtons(ExpressionPickerButtonComponent: ExpressionPickerButtonComponent, selectedTab: string) {
    return Array.from(ExpressionPickerComponents, ([id, { tab }]) => (
        <ErrorBoundary key={`vc-expression-picker-button-${id}`}>
            <ExpressionPickerButtonComponent
                id={`${id}-picker-tab`}
                aria-controls={`${id}-picker-tab-panel`}
                aria-selected={id === selectedTab}
                viewType={id}
                isActive={id === selectedTab}
            >
                {tab}
            </ExpressionPickerButtonComponent>
        </ErrorBoundary>
    ));
}

export function TabPanels(selectedTab: string, channel: Channel) {
    return Array.from(ExpressionPickerComponents, ([id, { Component }]) => (
        id === selectedTab &&
        <ErrorBoundary key={`vc-expression-picker-panel-${id}`}>
            <Component selectedTab={selectedTab} channel={channel} />
        </ErrorBoundary>
    ));
}
