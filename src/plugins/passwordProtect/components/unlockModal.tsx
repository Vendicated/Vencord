/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModalLazy } from "@utils/modal";

import { checkPassword, removePassword } from "../data";
import { isChannelCurrent, reloadChannel } from "../utils";
import { ModalType, PasswordModal } from "./modal";

export async function openUnlockModal(channelId: string) {
    await openModalLazy(async () => {
        return modalProps => <PasswordModal modalProps={modalProps} channelId={channelId} type={ModalType.Unlock} callback={async password => {
            if (password) {
                if (await checkPassword(password, channelId)) {
                    removePassword(channelId);
                    if (isChannelCurrent(channelId)) {
                        reloadChannel();
                    }
                }
            }
        }} />;
    });
}
