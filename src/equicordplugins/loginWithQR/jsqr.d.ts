/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare module "jsqr" {
    import jsQR, { QRCode } from "jsqr/dist";

    export default jsQR;
    export { QRCode };
}
