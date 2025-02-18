/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModalLazy } from "@utils/modal";

import { checkPassword } from "../data";
import { ModalType, PasswordModal } from "./modal";

export async function openAccessModal(channelId: string, cb: (success: boolean) => void) {
    await openModalLazy(async () => {
        return modalProps => <PasswordModal modalProps={modalProps} channelId={channelId} type={ModalType.Access} callback={async password => {
            if (password) {
                cb(await checkPassword(password, channelId));
            } else {
                cb(false);
            }
        }} />;
    });
}
