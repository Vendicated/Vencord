/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

process.emit = (originalEmit => function (name, data) {
    if (name === "warning" && data?.name === "ExperimentalWarning")
        return false;

    return originalEmit.apply(process, arguments);
})(process.emit);
