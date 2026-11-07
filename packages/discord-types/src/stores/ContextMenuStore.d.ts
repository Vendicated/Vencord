import { ReactNode } from "react";

import { FluxStore } from "..";
import { Theme } from "./ThemeStore";

export interface ContextMenuConfig {
    context: string;
    enableSpellCheck?: boolean;
    onClose?(): void;
    align?: string;
    position?: string;
    disableClickTrap?: boolean;
    repositionOnContentChange?: boolean;
}

export interface ContextMenuRenderProps {
    position: string;
    theme: Theme;
    onHeightUpdate(): void;
    config: ContextMenuConfig;
    target: EventTarget;
    context: string;
}

export interface ContextMenu {
    render: ((props: ContextMenuRenderProps) => ReactNode) | undefined;
    renderLazy: (() => Promise<(props: ContextMenuRenderProps) => ReactNode>) | undefined;
    target: EventTarget;
    rect: DOMRect;
    config: ContextMenuConfig;
}

export class ContextMenuStore extends FluxStore {
    isOpen(): boolean;
    /** incremented on every open */
    get version(): number;
    getContextMenu(): ContextMenu | null;
    /** returns false if no menu was open */
    close(): boolean;
}
