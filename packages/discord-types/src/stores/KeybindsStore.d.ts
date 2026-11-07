import { FluxStore } from "..";

/** 0 = keyboard key, 1 = mouse button, 2 = keyboard modifier key, 3 = gamepad button */
export type KeyComboType = 0 | 1 | 2 | 3;
/** 1 = windows, 2 = macos, 3 = linux, 4 = browser */
export type KeyComboEnvironment = 1 | 2 | 3 | 4;
export type KeyCombo = [type: KeyComboType, keyCode: number, environment?: KeyComboEnvironment];

export interface Keybind {
    id: string;
    action: string;
    shortcut: KeyCombo[];
    enabled: boolean;
    managed: boolean;
    params: Record<string, unknown>;
    /** input mode context, set on managed push to talk keybinds */
    context?: string;
}

export interface WaylandPortalShortcutState {
    eventId: number;
    bound: boolean;
    matchesTrigger?: boolean;
}

export class KeybindsStore extends FluxStore {
    /** keyed by keybind id */
    getUserAgnosticState(): Record<string, Keybind>;
    hasKeybind(type: KeyComboType, keyCode: number, environment?: KeyComboEnvironment): boolean;
    hasExactKeybind(shortcut: KeyCombo[]): boolean;
    getKeybindForAction(action: string, managedOnly?: boolean, enabledOnly?: boolean): Keybind | null;
    getOverlayKeybind(): Keybind;
    getOverlayChatKeybind(): Keybind | null;
    isWaylandPortalActive(): boolean;
    isWaylandPortalEligibleShortcut(shortcut: KeyCombo[]): boolean;
    getWaylandPortalShortcutState(keybindId: string): WaylandPortalShortcutState | null;
}
