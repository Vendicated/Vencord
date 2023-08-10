/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// eslint-disable-next-line path-alias/no-relative
import { findByPropsLazy, waitFor } from "../webpack";

export let React: typeof import("react");
export let useState: typeof React.useState;
export let useEffect: typeof React.useEffect;
export let useMemo: typeof React.useMemo;
export let useRef: typeof React.useRef;
export let useReducer: typeof React.useReducer;
export let useCallback: typeof React.useCallback;

export const ReactDOM: typeof import("react-dom") & typeof import("react-dom/client") = findByPropsLazy("createPortal", "render");

waitFor("useState", m => {
    React = m;
    ({ useEffect, useState, useMemo, useRef, useReducer, useCallback } = React);
});
