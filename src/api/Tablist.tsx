import { Channel } from "discord-types/general";
import ErrorBoundary from "@components/ErrorBoundary";
//import { Logger } from "@utils/Logger";

//const logger = new Logger("Tablist"); useless

export interface ExpressionMate {
    CHAT_INPUT_BUTTON_CLASSNAME: string;
    expressionPickerViewType: object;
    expressionPickerWidths: { MIN: "min", MAX: "max"; };
    MIN_EXPRESSION_PICKER_WIDTH: number; // what's really matter here
}

export interface TablistButtonProps {
    id?: string;
    "aria-controls": string;
    "aria-selected": boolean;
    isActive: boolean;
    viewType: string;
    children: string | JSX.Element;
    autoFocus?: boolean;
    [key: string]: any;
}

export interface TablistPanelProps {
    selectedTab: string;
    channel: Channel;
    expressionMate: ExpressionMate;
}

export type TablistButtonComponent = (props: TablistButtonProps) => JSX.Element | null;
export type TablistPanelComponent = (props: TablistPanelProps) => JSX.Element | null;


export interface TablistItem {
    tab: string,
    Component: TablistPanelComponent;
    autoFocus?: boolean;
}

const TablistComponents = new Map<string, TablistItem>();


export const addTablistButton = (id: string, tab: string, PanelComponent: TablistPanelComponent, autoFocus?: boolean) => TablistComponents.set(id, { tab: tab, Component: PanelComponent, autoFocus: autoFocus });
export const removeTablistButton = (id: string) => TablistComponents.delete(id);


export function* RenderButtons(TablistButtonComponent: TablistButtonComponent, selectedTab: string) {
    for (const [id, { tab }] of TablistComponents) {
        yield (<TablistButtonComponent
            id={id + "-picker-tab"}
            aria-controls={id + "-picker-tab-panel"}
            aria-selected={id === selectedTab}
            viewType={id}
            isActive={id === selectedTab}
        >{tab}</TablistButtonComponent>);
    }
}

export function* TabPanels(selectedTab: string, expressionMate: ExpressionMate, channel: Channel) {
    for (const [id, { Component }] of TablistComponents) {
        if (id !== selectedTab) { continue; }
        let PanelComponent: TablistPanelComponent = Component;
        yield (<ErrorBoundary><PanelComponent selectedTab={selectedTab} channel={channel} expressionMate={expressionMate} /></ErrorBoundary>);
    }
}
