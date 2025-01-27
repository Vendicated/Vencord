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
    containerWidth: number;
    channel: Channel;
}

export type ExpressionPickerButtonComponent = (props: ExpressionPickerButtonProps) => JSX.Element;
export type ExpressionPickerPanelComponent = (props: ExpressionPickerPanelProps) => JSX.Element | null;


export interface ExpressionPickerTabItem {
    title: string,
    Component: ExpressionPickerPanelComponent;
}

export type ExpressionPickerTabs = ExpressionPickerTabItem | Array<ExpressionPickerTabItem> | ExpressionPickerPanelComponent;

const ExpressionPickerComponents = new Map<string, ExpressionPickerTabItem>();


export const addExpressionPickerTab = (id: string, title: string, PanelComponent: ExpressionPickerPanelComponent) => ExpressionPickerComponents.set(id, { title: title, Component: PanelComponent });
export const removeExpressionPickerTab = (id: string) => ExpressionPickerComponents.delete(id);

export function RenderTabButtons(ExpressionPickerButtonComponent: ExpressionPickerButtonComponent, selectedTab: string) {
    return Array.from(ExpressionPickerComponents, ([id, { title }]) => (
        <ErrorBoundary key={`vc-expression-picker-button-${id}`}>
            <ExpressionPickerButtonComponent
                id={`${id}-picker-tab`}
                aria-controls={`${id}-picker-tab-panel`}
                aria-selected={id === selectedTab}
                viewType={id}
                isActive={id === selectedTab}
            >
                {title}
            </ExpressionPickerButtonComponent>
        </ErrorBoundary>
    ));
}

export function TabPanels(selectedTab: string, channel: Channel, containerWidth: number) {
    return Array.from(ExpressionPickerComponents, ([id, { Component }]) => (
        id === selectedTab &&
        <ErrorBoundary key={`vc-expression-picker-panel-${id}`}>
            <Component channel={channel} containerWidth={containerWidth} />
        </ErrorBoundary>
    ));
}
