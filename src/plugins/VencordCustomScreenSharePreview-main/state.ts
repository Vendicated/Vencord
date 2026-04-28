/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

type StreamingState = {
    isStreaming: boolean;
    isSendingCustomStreamPreview: boolean;
    lastStreamPreviewSend: number;
    resendStreamPreviewIntervalId: number | null;
};

type Listener<T> = (value: T) => void;

class CustomStreamPreviewStateManager {
    private state: StreamingState = {
        isStreaming: false,
        isSendingCustomStreamPreview: false,
        lastStreamPreviewSend: 0,
        resendStreamPreviewIntervalId: null,
    };

    private listeners = new Set<() => void>();

    private fieldListeners: Partial<{
        [K in keyof StreamingState]: Set<Listener<any>>;
    }> = {};

    private selectorListeners = new Set<{
        selector: (state: StreamingState) => any;
        prevValue: any;
        callback: (value: any) => void;
    }>();

    getState(): StreamingState {
        return { ...this.state };
    }

    setState(partial: Partial<StreamingState>): void {
        const prevState = this.state;
        const newState = { ...this.state, ...partial };
        this.state = newState;

        const changed = Object.keys(partial).some(
            key => (newState as any)[key] !== (prevState as any)[key]
        );

        if (!changed) return;

        this.listeners.forEach(fn => fn());

        for (const key in partial) {
            const k = key as keyof StreamingState;
            const newVal = newState[k];
            const oldVal = prevState[k];

            if (newVal !== oldVal) {
                const listeners = this.fieldListeners[k];
                if (listeners) {
                    listeners.forEach(fn => fn(newVal));
                }
            }
        }

        for (const entry of this.selectorListeners) {
            const next = entry.selector(newState);

            if (next !== entry.prevValue) {
                entry.prevValue = next;
                entry.callback(next);
            }
        }
    }

    subscribe(callback: (state: StreamingState) => void): () => void {
        const wrapper = () => callback(this.getState());
        this.listeners.add(wrapper);

        return () => this.listeners.delete(wrapper);
    }

    subscribeToField<K extends keyof StreamingState>(
        field: K,
        callback: (value: StreamingState[K]) => void
    ): () => void {
        const listeners = this.getOrCreateFieldListeners(field);
        listeners.add(callback);

        return () => listeners.delete(callback);
    }

    subscribeWithSelector<T>(
        selector: (state: StreamingState) => T,
        callback: (value: T) => void
    ): () => void {
        const entry = {
            selector,
            prevValue: selector(this.state),
            callback
        };

        this.selectorListeners.add(entry);

        return () => this.selectorListeners.delete(entry);
    }

    reset(): void {
        this.setState({
            isStreaming: false,
            isSendingCustomStreamPreview: false,
            lastStreamPreviewSend: 0,
            resendStreamPreviewIntervalId: null,
        });
    }

    private getOrCreateFieldListeners<K extends keyof StreamingState>(field: K): Set<Listener<StreamingState[K]>> {
        if (!this.fieldListeners[field]) {
            this.fieldListeners[field] = new Set<Listener<StreamingState[K]>>() as Set<Listener<any>>;
        }

        return this.fieldListeners[field]! as Set<Listener<StreamingState[K]>>;
    }
}

export const CustomStreamPreviewState = new CustomStreamPreviewStateManager();
