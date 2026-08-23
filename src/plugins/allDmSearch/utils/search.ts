import { ChannelStore, RelationshipStore, RestAPI, UserStore } from '@webpack/common';
import { SearchMessageResult, SearchPersonResult, SearchProgress } from '../types.js';

// In-memory LRU session cache for search queries
const searchCache = new Map<string, { timestamp: number; results: SearchMessageResult[] }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Format timestamp to clean Discord-like relative format (e.g., 3m, 2h, 4d, 12w)
 */
export function formatRelativeTime(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 52) return `${diffWeeks}w`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y`;
}

/**
 * Get readable display name for a DM or Group DM channel
 */
export function getChannelDisplayName(channel: any): string {
  if (!channel) return 'Direct Message';
  if (channel.name && channel.name.trim()) return channel.name;

  if (channel.recipients && Array.isArray(channel.recipients)) {
    const currentUserId = UserStore.getCurrentUser()?.id;
    const names = channel.recipients
      .filter((id: string) => id !== currentUserId)
      .map((id: string) => {
        const user = UserStore.getUser(id);
        if (!user) return null;
        return (RelationshipStore as any)?.getNickname?.(id) || user.globalName || user.username;
      })
      .filter(Boolean);

    if (names.length > 0) return names.join(', ');
  }

  return 'Direct Message';
}

/**
 * Get user avatar URL safely
 */
export function getUserAvatarUrl(user: any, size = 80): string {
  if (!user) return 'https://cdn.discordapp.com/embed/avatars/0.png';
  if (user.avatar) {
    const isAnimated = typeof user.avatar === 'string' && user.avatar.startsWith('a_');
    const ext = isAnimated ? 'gif' : 'webp';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
  }
  const defaultIdx = Number(BigInt(user.id || '0') >> 22n) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIdx}.png`;
}

/**
 * Search People (Friends, DM participants, Known Users)
 */
export function searchPeople(query: string): SearchPersonResult[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const results: SearchPersonResult[] = [];
  const seenUserIds = new Set<string>();
  const currentUserId = UserStore.getCurrentUser()?.id;

  // 1. Gather all DM partners
  const privateChannels = ChannelStore.getSortedPrivateChannels?.() || [];
  for (const chan of privateChannels) {
    if (!chan.recipients || !Array.isArray(chan.recipients)) continue;
    for (const rId of chan.recipients) {
      if (rId === currentUserId || seenUserIds.has(rId)) continue;
      const user = UserStore.getUser(rId);
      if (!user) continue;

      const username = user.username?.toLowerCase() || '';
      const globalName = user.globalName?.toLowerCase() || '';
      const nickname = (RelationshipStore as any)?.getNickname?.(rId)?.toLowerCase() || '';

      if (username.includes(clean) || globalName.includes(clean) || nickname.includes(clean)) {
        seenUserIds.add(rId);
        results.push({
          id: rId,
          username: user.username,
          displayName: user.globalName || user.username,
          avatarUrl: getUserAvatarUrl(user),
          channelId: chan.id,
          isFriend: (RelationshipStore as any)?.isFriend?.(rId) || false,
        });
      }
    }
  }

  // 2. Gather from general UserStore
  const allUsers = UserStore.getUsers?.() || {};
  for (const id in allUsers) {
    if (id === currentUserId || seenUserIds.has(id)) continue;
    const user = allUsers[id];
    if (!user || user.bot) continue;

    const username = user.username?.toLowerCase() || '';
    const globalName = user.globalName?.toLowerCase() || '';

    if (username.includes(clean) || globalName.includes(clean)) {
      seenUserIds.add(id);
      results.push({
        id,
        username: user.username,
        displayName: user.globalName || user.username,
        avatarUrl: getUserAvatarUrl(user),
        isFriend: (RelationshipStore as any)?.isFriend?.(id) || false,
      });
    }
  }

  return results.slice(0, 50);
}

/**
 * Execute search across accessible DM channels with high concurrency, instant result streaming, and caching
 */
export async function searchAllDMs(
  query: string,
  options: {
    maxResults: number;
    searchGroupDms: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: SearchProgress) => void;
    onBatchResults?: (results: SearchMessageResult[]) => void;
  }
): Promise<SearchMessageResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // Check in-memory cache
  const cacheKey = `${cleanQuery.toLowerCase()}_${options.searchGroupDms}_${options.maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    options.onBatchResults?.(cached.results);
    return cached.results;
  }

  // 1. Gather all accessible DM channels
  const allPrivate = ChannelStore.getSortedPrivateChannels?.() || [];
  const targetChannels = allPrivate.filter((c: any) => {
    if (c.isDM && c.isDM()) return true;
    if (c.isGroupDM && c.isGroupDM()) return options.searchGroupDms;
    return false;
  });

  const totalChannels = targetChannels.length;
  if (totalChannels === 0) return [];

  let searchedCount = 0;
  const allResults: SearchMessageResult[] = [];
  const seenMessageIds = new Set<string>();

  // Report initial progress
  options.onProgress?.({
    totalChannels,
    searchedChannels: 0,
    foundCount: 0,
    isSearching: true,
  });

  // Fast Worker Pool: 8 concurrent workers with instant result streaming
  const CONCURRENCY = 8;
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < targetChannels.length) {
      if (options.signal?.aborted || allResults.length >= options.maxResults) {
        break;
      }

      const chan = targetChannels[currentIndex++];
      const chanName = getChannelDisplayName(chan);

      try {
        const res = await RestAPI.get({
          url: `/channels/${chan.id}/messages/search`,
          query: {
            content: cleanQuery,
          },
        });

        if (options.signal?.aborted) break;

        const body = res?.body;
        if (body && Array.isArray(body.messages)) {
          let hasNewResults = false;

          for (const msgGroup of body.messages) {
            const msg = Array.isArray(msgGroup) ? msgGroup[0] : msgGroup;
            if (!msg || !msg.id || seenMessageIds.has(msg.id)) continue;

            seenMessageIds.add(msg.id);
            hasNewResults = true;

            const hasMedia =
              (msg.attachments && msg.attachments.length > 0) ||
              (msg.embeds && msg.embeds.some((e: any) => e.type === 'image' || e.type === 'video' || e.type === 'gifv'));

            const hasLink =
              (msg.content && /(https?:\/\/[^\s]+)/i.test(msg.content)) ||
              (msg.embeds && msg.embeds.some((e: any) => e.type === 'link' || e.url));

            const author = msg.author || {};
            const authorDisplayName = author.global_name || author.globalName || author.username || 'User';

            allResults.push({
              id: msg.id,
              channelId: chan.id,
              channelName: chanName,
              isGroupDM: Boolean(chan.isGroupDM && chan.isGroupDM()),
              author: {
                id: author.id,
                username: author.username || 'unknown',
                displayName: authorDisplayName,
                avatarUrl: getUserAvatarUrl(author),
              },
              content: msg.content || '',
              timestamp: msg.timestamp,
              relativeTime: formatRelativeTime(msg.timestamp),
              attachments: (msg.attachments || []).map((a: any) => ({
                id: a.id,
                filename: a.filename || a.name || 'attachment',
                url: a.url || a.proxy_url,
                proxy_url: a.proxy_url,
                size: a.size,
                content_type: a.content_type,
              })),
              embeds: (msg.embeds || []).map((e: any) => ({
                title: e.title,
                description: e.description,
                type: e.type,
                url: e.url,
                author: e.author ? { name: e.author.name, icon_url: e.author.icon_url } : undefined,
                color: e.color,
              })),
              hasMedia: Boolean(hasMedia),
              hasLink: Boolean(hasLink),
            });
          }

          // Live stream new results immediately to UI
          if (hasNewResults && options.onBatchResults && !options.signal?.aborted) {
            const sorted = [...allResults].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            options.onBatchResults(sorted);
          }
        }
      } catch (err: any) {
        if (err?.status === 429) {
          const retryAfter = (err?.body?.retry_after || 1) * 1000;
          await new Promise((r) => setTimeout(r, Math.min(retryAfter, 2000)));
        }
      } finally {
        searchedCount++;
        options.onProgress?.({
          totalChannels,
          searchedChannels: searchedCount,
          currentChannelName: chanName,
          foundCount: allResults.length,
          isSearching: searchedCount < totalChannels && !options.signal?.aborted,
        });
      }
    }
  }

  // Run worker pool
  const workers = Array.from({ length: Math.min(CONCURRENCY, targetChannels.length) }, () => worker());
  await Promise.all(workers);

  // Final sort descending by timestamp (newest first)
  allResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const finalResults = allResults.slice(0, options.maxResults);

  // Cache final results
  searchCache.set(cacheKey, { timestamp: Date.now(), results: finalResults });

  options.onProgress?.({
    totalChannels,
    searchedChannels: totalChannels,
    foundCount: finalResults.length,
    isSearching: false,
  });

  return finalResults;
}
