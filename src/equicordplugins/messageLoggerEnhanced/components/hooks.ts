/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from "@webpack/common";

import { countMessagesByStatusIDB, countMessagesIDB, DBMessageRecord, DBMessageStatus, getDateStortedMessagesByStatusIDB } from "../db";
import { doesMatch, tokenizeQuery } from "../utils/parseQuery";
import { LogTabs } from "./LogsModal";

function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// this is so shit
export function useMessages(query: string, currentTab: LogTabs, sortNewest: boolean, numDisplayedMessages: number) {
    // only for initial load
    const [pending, setPending] = useState(true);
    const [messages, setMessages] = useState<DBMessageRecord[]>([]);
    const [statusTotal, setStatusTotal] = useState<number>(0);
    const [total, setTotal] = useState<number>(0);

    const debouncedQuery = useDebouncedValue(query, 300);

    useEffect(() => {
        countMessagesIDB().then(x => setTotal(x));
    }, [pending]);

    useEffect(() => {
        let isMounted = true;

        const loadMessages = async () => {
            const status = getStatus(currentTab);

            if (debouncedQuery === "") {
                const [messages, statusTotal] = await Promise.all([
                    getDateStortedMessagesByStatusIDB(sortNewest, numDisplayedMessages, status),
                    countMessagesByStatusIDB(status),
                ]);


                if (isMounted) {
                    setMessages(messages);
                    setStatusTotal(statusTotal);
                }

                setPending(false);
            } else {
                const allMessages = await getDateStortedMessagesByStatusIDB(sortNewest, Number.MAX_SAFE_INTEGER, status);
                const { queries, rest } = tokenizeQuery(debouncedQuery);

                const filteredMessages = allMessages.filter(record => {
                    for (const query of queries) {
                        const matching = doesMatch(query.key, query.value, record.message);
                        if (query.negate ? matching : !matching) {
                            return false;
                        }
                    }

                    return rest.every(r =>
                        record.message.content.toLowerCase().includes(r.toLowerCase())
                    );
                });

                if (isMounted) {
                    setMessages(filteredMessages);
                    setStatusTotal(Number.MAX_SAFE_INTEGER);
                }
                setPending(false);
            }
        };

        loadMessages();

        return () => {
            isMounted = false;
        };

    }, [debouncedQuery, sortNewest, numDisplayedMessages, currentTab, pending]);


    return { messages, statusTotal, total, pending, reset: () => setPending(true) };
}


function getStatus(currentTab: LogTabs) {
    switch (currentTab) {
        case LogTabs.DELETED:
            return DBMessageStatus.DELETED;
        case LogTabs.EDITED:
            return DBMessageStatus.EDITED;
        default:
            return DBMessageStatus.GHOST_PINGED;
    }
}
