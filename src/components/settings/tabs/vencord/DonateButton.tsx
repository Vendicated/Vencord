/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { DonateButton, InviteButton } from "@components/settings/DonateButton";
import BadgeAPI from "@plugins/_api/badges";
import { DONOR_ROLE_ID, VC_GUILD_ID } from "@utils/constants";
import { GuildMemberStore } from "@webpack/common";

export const isDonor = (userId: string) => !!(
    BadgeAPI.getDonorBadges(userId)?.length > 0
    || GuildMemberStore?.getMember(VC_GUILD_ID, userId)?.roles.includes(DONOR_ROLE_ID)
);

export function DonateButtonComponent({ donated = false }) {
    return (
        <Flex>
            <DonateButton
                equicord={true}
                className={!donated ? "vc-donate-support-button" : ""}
                style={{ marginTop: "1em" }} />
            <InviteButton
                className={!donated ? "vc-invite-support-button" : ""}
                style={{ marginTop: "1em" }} />
        </Flex>
    );
}
