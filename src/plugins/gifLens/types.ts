/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FC,RefObject } from "react";

export interface Gif {
    format: number;
    src: string;
    width: number;
    height: number;
    order: number;
    url: string;
}

export interface IndexedGifRecord {
    url: string;
    src?: string;
    ocrText: string;
    slugTokens: string[];
    timestamp: number;
}

export interface SearchBarComponentProps {
    ref?: RefObject<any>;
    autoFocus?: boolean;
    size?: string;
    onChange: (query: string) => void;
    onClear: () => void;
    query: string;
    placeholder: string;
    className?: string;
}

export type TSearchBarComponent = FC<SearchBarComponentProps>;

export interface GifPickerInstance {
    dead?: boolean;
    state: {
        resultType?: string;
    };
    props: {
        favCopy?: Gif[];
        favorites?: Gif[];
    };
    forceUpdate: () => void;
}

export interface IndexingProgress {
    total: number;
    completed: number;
    currentUrl: string;
    isIndexing: boolean;
    isPaused: boolean;
    activeThreads: number;
}

export type ProgressListener = (progress: IndexingProgress) => void;
