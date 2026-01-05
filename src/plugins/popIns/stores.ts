import { findByPropsLazy, findStoreLazy } from "@webpack";

import { ApplicationStreamingStore, ApplicationStreamPreviewStore, ExtendedWindowStore } from "./types";

// Lazy store access - stores are loaded when first accessed
export const StreamingStore: ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
export const StreamPreviewStore: ApplicationStreamPreviewStore = findStoreLazy("ApplicationStreamPreviewStore");

// WindowStore needs special handling - find by props to ensure we get the correct store
export let WindowStore: ExtendedWindowStore;

try {
    WindowStore = findByPropsLazy("getWindow", "getWindowKeys");
} catch (e) {
    // WindowStore initialization failed
}
