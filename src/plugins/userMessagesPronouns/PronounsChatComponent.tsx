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

import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { fetchUserProfile, getCurrentChannel, getIntlMessage } from "@utils/discord";
import { classes } from "@utils/misc";
import { Message } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Tooltip, useEffect, UserProfileStore, UserStore } from "@webpack/common";

import { settings } from "./settings";
import { useFormattedPronouns } from "./utils";

const TimestampClasses = findCssClassesLazy("timestampInline", "timestamp");
const MessageDisplayCompact = getUserSettingLazy("textAndImages", "messageDisplayCompact")!;

const fetchingIds = new Set<string>();

async function fetchWithRetry(id: string, guildId: string | undefined) {
    try {
        await fetchUserProfile(id, { guild_id: guildId });
    } catch (e: any) {
        if (e?.status === 429) {
            await new Promise(r => setTimeout(r, (e?.body?.retry_after ?? 10) * 1000));
            await fetchWithRetry(id, guildId);
        }
    } finally {
        fetchingIds.delete(id);
    }
}

const AUTO_MODERATION_ACTION = 24;

function shouldShow(message: Message): boolean {
    if (message.author.bot || message.author.system || message.type === AUTO_MODERATION_ACTION)
        return false;
    if (!settings.store.showSelf && message.author.id === UserStore.getCurrentUser().id)
        return false;

    return true;
}

function PronounsChatComponent({ message }: { message: Message; }) {
    const pronouns = useFormattedPronouns(message.author.id);

    useEffect(() => {
        const { id } = message.author;
        if (!settings.store.autoFetch || UserProfileStore.getUserProfile(id) || fetchingIds.has(id)) return;
        fetchingIds.add(id);
        fetchWithRetry(id, getCurrentChannel()?.getGuildId());
    }, [message.author.id]);

    return pronouns && (
        <Tooltip text={getIntlMessage("USER_PROFILE_PRONOUNS")}>
            {tooltipProps => (
                <span
                    {...tooltipProps}
                    className={classes(TimestampClasses.timestampInline, TimestampClasses.timestamp)}
                >• {pronouns}</span>
            )}
        </Tooltip>
    );
}

export const PronounsChatComponentWrapper = ErrorBoundary.wrap(({ message }: { message: Message; }) => {
    return shouldShow(message)
        ? <PronounsChatComponent message={message} />
        : null;
}, { noop: true });

export const CompactPronounsChatComponentWrapper = ErrorBoundary.wrap(({ message }: { message: Message; }) => {
    const compact = MessageDisplayCompact.useSetting();

    if (!compact || !shouldShow(message)) {
        return null;
    }

    return <PronounsChatComponent message={message} />;
}, { noop: true });
