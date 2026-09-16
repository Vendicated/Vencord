/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Message, User } from "@vencord/discord-types";
import { FluxDispatcher, MessageStore, UserStore } from "@webpack/common";

import pluginStyle from "./automodRelay.css?managed";

const AUTOMOD_BOT_ID = "1025510202952323092";
const MESSAGE_TYPE_AUTO_MODERATION_ACTION = 24;

const syntheticMessageBuffer = new Map<string, Record<string, unknown>[]>();
const logger = new Logger("AutoModRelay");

interface AutoModEmbedField {
  name?: string;
  value?: string;
}

interface AutoModEmbed {
  description?: string;
  fields?: AutoModEmbedField[];
}

interface ParsedAutoModAlert {
  targetChannelId: string;
  messageContent: string;
}

function createSyntheticLocalMessage(
  channelId: string,
  author: User | Record<string, unknown>,
  content: string,
  timestamp: string | Date
) {
  return {
    id: `automod-relay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    channel_id: channelId,
    author,
    content,
    type: 0,
    flags: 0,
    isAutoModRelay: true,
    timestamp: new Date(timestamp).toISOString(),
    state: "SENT",
    attachments: [],
    embeds: [],
    mentions: [],
    mention_roles: [],
    pinned: false,
    tts: false,
    loggingName: null
  };
}

function isAutoModAlert(message: Message): boolean {
  return (
    (message.type as number) === MESSAGE_TYPE_AUTO_MODERATION_ACTION ||
    message.author?.id === AUTOMOD_BOT_ID
  );
}

function parseAutoModEmbed(embed: AutoModEmbed): ParsedAutoModAlert | null {
  if (!embed.fields || !embed.description) return null;

  const fields: Record<string, string> = Object.fromEntries(
    embed.fields
      .filter((f): f is { name: string; value: string; } => Boolean(f.name && f.value))
      .map(f => [f.name, f.value])
  );

  const targetChannelId = fields.channel_id;
  if (!targetChannelId) return null;

  return {
    targetChannelId,
    messageContent: embed.description,
  };
}

function resolveAuthor(message: Message): User | Record<string, unknown> | null {
  if (!message.author?.username) return null;

  const cachedUser = UserStore.getUser(message.author.id);
  if (cachedUser) return cachedUser;

  return {
    id: message.author.id,
    username: message.author.username,
    globalName: message.author.globalName,
    discriminator: "0",
    avatar: message.author.avatar,
    bot: false,
    system: false,
  };
}

function handleMessageCreate({ message }: { message: Message; }) {
  try {
    if (!isAutoModAlert(message)) return;

    const embed = message.embeds?.[0] as AutoModEmbed | undefined;
    if (!embed) return;

    const autoModEmbedInfo = parseAutoModEmbed(embed);
    if (!autoModEmbedInfo) return;

    const author = resolveAuthor(message);
    if (!author) return;

    logger.info(`Relaying event for ${author.username} to channel ${autoModEmbedInfo.targetChannelId}`);

    const syntheticMsg = createSyntheticLocalMessage(
      autoModEmbedInfo.targetChannelId,
      author,
      autoModEmbedInfo.messageContent,
      message.timestamp
    );

    const channelBuffer = syntheticMessageBuffer.get(autoModEmbedInfo.targetChannelId) ?? [];
    channelBuffer.push(syntheticMsg);
    syntheticMessageBuffer.set(autoModEmbedInfo.targetChannelId, channelBuffer);

    FluxDispatcher.dispatch({
      type: "MESSAGE_CREATE",
      channelId: autoModEmbedInfo.targetChannelId,
      message: syntheticMsg,
      optimistic: false,
    });
  } catch (e) {
    logger.error("Error parsing and relaying AutoMod message", e);
  }
}

function handleLoadMessagesSuccess({ channelId }: { channelId: string; }) {
  const buffered = syntheticMessageBuffer.get(channelId);
  if (!buffered || buffered.length === 0) return;

  // Defer execution briefly to ensure MessageStore finishes standard cache population
  setTimeout(() => {
    for (const msg of buffered) {
      if (!MessageStore.getMessage(channelId, msg.id as string)) {
        FluxDispatcher.dispatch({
          type: "MESSAGE_CREATE",
          channelId,
          message: msg,
          optimistic: false
        });
      }
    }
  }, 50);
}

export default definePlugin({
  name: "AutoModRelay",
  description: "Relays AutoMod blocked content locally in the channel where it was blocked.",
  tags: ["Chat", "Utility"],
  authors: [{ name: "rad_rabbit", id: 254771832022892544n }],

  start() {
    enableStyle(pluginStyle);
    FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageCreate);
    FluxDispatcher.subscribe("LOAD_MESSAGES_SUCCESS", handleLoadMessagesSuccess);
  },

  stop() {
    disableStyle(pluginStyle);
    FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageCreate);
    FluxDispatcher.unsubscribe("LOAD_MESSAGES_SUCCESS", handleLoadMessagesSuccess);
    syntheticMessageBuffer.clear();
  }
});
