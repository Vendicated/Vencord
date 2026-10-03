/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/lazyReact";
import { React } from "@webpack/common";

export const NotesDataIcon = LazyComponent(() => React.memo(() => {
    return (
        <svg stroke="currentColor" width="24" height="24" viewBox="1 1 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M10.0002 4H7.2002C6.08009 4 5.51962 4 5.0918 4.21799C4.71547 4.40973 4.40973 4.71547 4.21799 5.0918C4 5.51962 4 6.08009 4 7.2002V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2839 19.7822 18.9076C20 18.4802 20 17.921 20 16.8031V14M16 5L10 11V14H13L19 8M16 5L19 2L22 5L19 8M16 5L19 8" />
        </svg>
    );
}));

export const SaveIcon = LazyComponent(() => React.memo(() => {
    return (
        <svg width="32" height="32" viewBox="-4 -4 32 32">
            <path fill="#fff" fill-rule="evenodd" clip-rule="evenodd" d="M18.1716 1C18.702 1 19.2107 1.21071 19.5858 1.58579L22.4142 4.41421C22.7893 4.78929 23 5.29799 23 5.82843V20C23 21.6569 21.6569 23 20 23H4C2.34315 23 1 21.6569 1 20V4C1 2.34315 2.34315 1 4 1H18.1716ZM4 3C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21L5 21L5 15C5 13.3431 6.34315 12 8 12L16 12C17.6569 12 19 13.3431 19 15V21H20C20.5523 21 21 20.5523 21 20V6.82843C21 6.29799 20.7893 5.78929 20.4142 5.41421L18.5858 3.58579C18.2107 3.21071 17.702 3 17.1716 3H17V5C17 6.65685 15.6569 8 14 8H10C8.34315 8 7 6.65685 7 5V3H4ZM17 21V15C17 14.4477 16.5523 14 16 14L8 14C7.44772 14 7 14.4477 7 15L7 21L17 21ZM9 3H15V5C15 5.55228 14.5523 6 14 6H10C9.44772 6 9 5.55228 9 5V3Z" />
        </svg>
    );
}));

export const DeleteIcon = LazyComponent(() => React.memo(() => {
    return (
        <svg width="32" height="32" viewBox="-4 -4 32 32">
            <path fill="#fff" d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
        </svg>
    );
}));

export const RefreshIcon = LazyComponent(() => React.memo(() => {
    return (
        <svg width="32" height="32" viewBox="-4 -4 32 32" fill="none">
            <path stroke-linejoin="round" stroke-linecap="round" stroke="#fff" stroke-width="2" d="M21 3V8M21 8H16M21 8L18 5.29168C16.4077 3.86656 14.3051 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.2832 21 19.8675 18.008 20.777 14" />
        </svg>
    );
}));

export const PopupIcon = LazyComponent(() => React.memo(() => {
    return (
        <svg width="32" height="32" viewBox="-4 -4 32 32">
            <path fill="#fff" d="M10 5V3H5.375C4.06519 3 3 4.06519 3 5.375V18.625C3 19.936 4.06519 21 5.375 21H18.625C19.936 21 21 19.936 21 18.625V14H19V19H5V5H10Z" />
            <path fill="#fff" d="M21 2.99902H14V4.99902H17.586L9.29297 13.292L10.707 14.706L19 6.41302V9.99902H21V2.99902Z" />
        </svg>
    );
}));

export const CrossIcon = LazyComponent(() => React.memo(() => {
    return (
        <svg width="32px" height="32px" viewBox="-3.2 -3.2 38.40 38.40">
            <rect fill="#dc3545" x="-3.2" y="-3.2" width="38.40" height="38.40" rx="19.2" />
            <path fill="#fff" d="M18.8,16l5.5-5.5c0.8-0.8,0.8-2,0-2.8l0,0C24,7.3,23.5,7,23,7c-0.5,0-1,0.2-1.4,0.6L16,13.2l-5.5-5.5 c-0.8-0.8-2.1-0.8-2.8,0C7.3,8,7,8.5,7,9.1s0.2,1,0.6,1.4l5.5,5.5l-5.5,5.5C7.3,21.9,7,22.4,7,23c0,0.5,0.2,1,0.6,1.4 C8,24.8,8.5,25,9,25c0.5,0,1-0.2,1.4-0.6l5.5-5.5l5.5,5.5c0.8,0.8,2.1,0.8,2.8,0c0.8-0.8,0.8-2.1,0-2.8L18.8,16z" />
        </svg>
    );
}));

export const ProblemIcon = LazyComponent(() => React.memo(() => {
    return (
        <svg width="32px" height="32px" viewBox="0 0 1024 1024">
            <rect fill="#fbbd04" x="0" y="0" width="1024" height="1024" rx="512" />
            <path fill="#fff" d="M512 254.08a140.16 140.16 0 0 0-140.672 139.392 32.128 32.128 0 0 0 64.32 0c0-42.112 33.536-75.136 76.352-75.136 42.112 0 76.352 34.56 76.352 76.992 0 16-22.912 38.976-43.2 59.2-30.592 30.592-65.28 65.28-65.28 111.744v45.888a32.128 32.128 0 1 0 64.256 0v-45.888c0-19.84 23.68-43.52 46.464-66.304 29.056-29.056 62.08-62.016 62.08-104.64A141.12 141.12 0 0 0 512 254.08z m-48.192 500.928a48.192 48.192 0 1 0 96.384 0 48.192 48.192 0 0 0-96.384 0z" />
        </svg>
    );
}));

export const SuccessIcon = LazyComponent(() => React.memo(() => {
    return (
        <svg width="32px" height="32px" viewBox="0.55 2.3 15.834375 15.834375">
            <circle fill="#fff" cx="8.5" cy="10.25" r="6.5" />
            <path fill="#28a745" d="M16.417 10.283A7.917 7.917 0 1 1 8.5 2.366a7.916 7.916 0 0 1 7.917 7.917zm-4.105-4.498a.791.791 0 0 0-1.082.29l-3.828 6.63-1.733-2.08a.791.791 0 1 0-1.216 1.014l2.459 2.952a.792.792 0 0 0 .608.285.83.83 0 0 0 .068-.003.791.791 0 0 0 .618-.393L12.6 6.866a.791.791 0 0 0-.29-1.081z" />
        </svg>
    );
}));
