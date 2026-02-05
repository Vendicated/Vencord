/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModalLazy } from "@utils/modal";

import { setPassword } from "../data";
import { isChannelCurrent, reloadChannel } from "../utils";
import { ModalType, PasswordModal } from "./modal";

export async function openLockModal(channelId: string) {
    await openModalLazy(async () => {
        return modalProps => <PasswordModal modalProps={modalProps} channelId={channelId} type={ModalType.Lock} callback={password => {
            if (password) {
                setPassword(channelId, password);
                if (isChannelCurrent(channelId)) {
                    reloadChannel();
                }
            }
        }} />;
    });
}
