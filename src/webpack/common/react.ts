/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy, findByPropsLazy, waitFor } from "@webpack";

export let React: typeof import("react");
export let useState: typeof React.useState;
export let useEffect: typeof React.useEffect;
export let useLayoutEffect: typeof React.useLayoutEffect;
export let useMemo: typeof React.useMemo;
export let useRef: typeof React.useRef;
export let useReducer: typeof React.useReducer;
export let useCallback: typeof React.useCallback;

export const ReactDOM: typeof import("react-dom") = findByPropsLazy("createPortal");
// 299 is an error code used in createRoot and createPortal
export const createRoot: typeof import("react-dom/client").createRoot = findByCodeLazy("(299));", ".onRecoverableError");

waitFor("useState", m => {
    React = m;
    ({ useEffect, useState, useLayoutEffect, useMemo, useRef, useReducer, useCallback } = React);
});
