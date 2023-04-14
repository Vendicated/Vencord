/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import { ModalContent, ModalFooter, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findByProps, findStoreLazy } from "@webpack";
import { Button, Text } from "@webpack/common";

const UserGuildSettingsStore = findStoreLazy("UserGuildSettingsStore");

function NoDMNotificationsModal({ modalProps }: { modalProps: ModalProps; }) {
    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalContent>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", "alignItems": "center", textAlign: "center", height: "100%", padding: "8px 0", gap: "16px" }}>
                    <Text variant="text-lg/semibold">You seem to have been affected by a bug that caused DM notifications to be muted and break if you used the MuteNewGuild plugin.</Text>
                    <Text variant="text-lg/semibold">If you haven't received any notifications for private messages, this is why. This issue is now fixed, so they should work again. Please verify, and in case they are still broken, ask for help in the Vencord support channel!</Text>
                    <Text variant="text-lg/semibold">We're very sorry for any inconvenience caused by this issue :(</Text>
                </div>
            </ModalContent>
            <ModalFooter>
                <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                    <Button
                        onClick={modalProps.onClose}
                        size={Button.Sizes.MEDIUM}
                        color={Button.Colors.BRAND}
                    >
                        Understood!
                    </Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
}

export default definePlugin({
    name: "MuteNewGuild",
    description: "Mutes newly joined guilds",
    authors: [Devs.Glitch, Devs.Nuckyz],
    patches: [
        {
            find: ",acceptInvite:function",
            replacement: {
                match: /INVITE_ACCEPT_SUCCESS.+?;(\i)=null.+?;/,
                replace: (m, guildId) => `${m}$self.handleMute(${guildId});`
            }
        }
    ],

    handleMute(guildId: string | null) {
        if (guildId === "@me" || guildId === "null" || guildId == null) return;
        findByProps("updateGuildNotificationSettings").updateGuildNotificationSettings(guildId, { muted: true, suppress_everyone: true, suppress_roles: true });
    },

    start() {
        const [isMuted, isEveryoneSupressed, isRolesSupressed] = [UserGuildSettingsStore.isMuted(null), UserGuildSettingsStore.isSuppressEveryoneEnabled(null), UserGuildSettingsStore.isSuppressRolesEnabled(null)];

        if (isMuted || isEveryoneSupressed || isRolesSupressed) {
            findByProps("updateGuildNotificationSettings").updateGuildNotificationSettings(null, { muted: false, suppress_everyone: false, suppress_roles: false });

            openModal(modalProps => <NoDMNotificationsModal modalProps={modalProps} />);
        }
    }
});
