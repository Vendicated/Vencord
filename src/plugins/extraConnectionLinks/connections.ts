/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Cooper/coopeeo, Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// This file is for types of the connection items

type ConnectionUrlLink = /\$\{(?:id|name)\}/;



// test

const test: ConnectionUrlLink = "oogabooga${name}";
const testFail: ConnectionUrlLink = "oogabooga";