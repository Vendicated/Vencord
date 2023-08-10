/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const VencordFragment = /* #__PURE__*/ Symbol.for("react.fragment");
export let VencordCreateElement =
    (...args) => (VencordCreateElement = Vencord.Webpack.Common.React.createElement)(...args);
