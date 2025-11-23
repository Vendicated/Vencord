/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VimActions } from "./vimActions";
import { Mode, VimStore } from "./vimStore";

class Vim {
    handleKey(key: string): { block: boolean; } {
        const state = VimStore.getState();

        if (state.mode === Mode.INSERT) {
            if (key === "Escape") {
                VimStore.setMode(Mode.NORMAL);
                return { block: true };
            }
            return { block: false };
        }

        if (!isNaN(Number(key))) {
            const digit = Number(key);
            const newCount = (state.count ?? 0) * 10 + digit;
            VimStore.setCount(newCount);
            return { block: true };
        }

        if (state.buffer === "g") {
            if (key === "g") {
                VimStore.resetBuffer();
                VimActions.scrollTop();
                return { block: true };
            }
            if (key === "o") {
                VimStore.resetBuffer();
                VimActions.openQuickSwitcher();
                return { block: true };
            }

            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "g") {
            VimStore.setBuffer("g");
            VimStore.startTimeout(1500, () => VimStore.resetBuffer());
            return { block: true };
        }

        const count = state.count ?? 1;

        if (key === "j") {
            VimActions.scrollDown(count);
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "k") {
            VimActions.scrollUp(count);
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "G") {
            VimActions.scrollBottom();
            VimStore.resetBuffer();
            return { block: true };
        }

        if (key === "i") {
            VimStore.setMode(Mode.INSERT);
            return { block: true };
        }

        return { block: true };
    }
}

export const vim = new Vim();
