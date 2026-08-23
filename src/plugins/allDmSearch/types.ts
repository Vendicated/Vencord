import { User } from '@vencord/discord-types';

export type SearchTab = 'messages' | 'people' | 'media' | 'links';

export interface SearchAttachment {
  id: string;
  filename: string;
  url: string;
  proxy_url?: string;
  size?: number;
  content_type?: string;
}

export interface SearchEmbed {
  title?: string;
  description?: string;
  type?: string;
  url?: string;
  author?: { name?: string; icon_url?: string };
  color?: number;
}

export interface SearchMessageResult {
  id: string;
  channelId: string;
  channelName: string;
  isGroupDM: boolean;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  content: string;
  timestamp: string;
  relativeTime: string;
  attachments: SearchAttachment[];
  embeds: SearchEmbed[];
  hasMedia: boolean;
  hasLink: boolean;
}

export interface SearchPersonResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  channelId?: string;
  isFriend: boolean;
  status?: string;
}

export interface SearchProgress {
  totalChannels: number;
  searchedChannels: number;
  currentChannelName?: string;
  foundCount: number;
  isSearching: boolean;
}
