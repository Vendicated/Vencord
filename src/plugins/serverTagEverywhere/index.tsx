/*
* Vencord, a Discord client mod
* Copyright (c) 2026 Vendicated and contributors
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

const GuildTagComponent = findComponentByCodeLazy("badgeSize", "guildBadge", "guildId", "guildTag", "inline");

const settings = definePluginSettings({
  serverTooltip: {
    type: OptionType.BOOLEAN,
    description: "Show Server Tag in server tooltip.",
    default: true,
    restartNeeded: true
  },
  serverHeader: {
    type: OptionType.BOOLEAN,
    description: "Show Server Tag in server header.",
    default: true,
    restartNeeded: true
  },
  appTitleBar: {
    type: OptionType.BOOLEAN,
    description: "Show Server Tag in title bar.",
    default: true,
    restartNeeded: true
  },
  // Thing in the bottom-left.
  userNameTag: {
    type: OptionType.BOOLEAN,
    description: "Show Server Tag in current user name tag (in the bottom-left corner).",
    default: true,
    restartNeeded: true
  },
  friendsList: {
    type: OptionType.BOOLEAN,
    description: "Show Server Tag in friends list.",
    default: true,
    restartNeeded: true
  },
});

export default definePlugin({
  name: "ServerTagEverywhere",
  description: "Shows server tag everywhere plausible.",
  authors: [Devs.oatsfx],
  tags: ["Appearance"],
  settings,
  patches: [
    {
      find: "GuildTooltip - ",
      replacement: {
        match: /,children:(\i).name\}\)/,
        replace: "$&,$self.renderTooltip($1)"
      },
      predicate: () => settings.store.serverTooltip
    },
    {
      find: "favorite-guild-header-add-context",
      replacement: {
        match: /guild:(\i)\}\)\]\}\),/,
        replace: "$&$self.renderDefault($1),"
      },
      predicate: () => settings.store.serverHeader
    },
    {
      find: "?\"BACK_FORWARD_NAVIGATION\":",
      replacement: {
        match: /guild_id,(\i)=(.+?)getGuild\((\i)\),\[(\i)\]\),/,
        replace: "$&vcGuild = $1,"
      },
      predicate: () => settings.store.appTitleBar
    },
    {
      find: "?\"BACK_FORWARD_NAVIGATION\":",
      replacement: {
        match: /children:(\i)\}\)\]/,
        replace: "style:{display:\"flex\",alignItems:\"center\"},children:[$1, $self.renderTitleBar(vcGuild)]})]"
      },
      predicate: () => settings.store.appTitleBar
    },
    {
      find: ".DISPLAY_NAME_STYLES_COACHMARK)",
      replacement: {
        match: /children:\(0,(\i).jsx\)\((\i).(\i),\{userN(.+?)\}\)/,
        replace: "children:[(0,$1.jsx)($2.$3,{userN$4}),$self.renderUser(this.props.currentUser)]"
      },
      predicate: () => settings.store.userNameTag
    },
    {
      find: "location:\"DiscordTag\"",
      replacement: {
        match: /(\i).displayNameStyles:null,displayNameStylesType:(\i)/,
        replace: "$&,user:$1"
      },
      predicate: () => settings.store.friendsList
    },
    // {
    //   find: "location:\"DiscordTag\"",
    //   replacement: {
    //     match: /let{primary:(\i),secondary:(\i)/,
    //     replace: "let{primary:$1,secondary:secondary,user:user"
    //   }
    // },
    {
      find: "location:\"DiscordTag\"",
      replacement: {
        match: /let{primary:(\i),secondary:(\i)(.+?);/,
        replace: "let{primary:$1,secondary:$2,user:user$3;let second=$2;"
      }
    },
    // {
    //   find: "location:\"DiscordTag\"",
    //   replacement: {
    //     match: /,children:\[(.+?),null/,
    //     replace: ",children:[$1,secondary!==undefined?$self.renderFriendsList(user):undefined,null"
    //   },
    //   predicate: () => settings.store.friendsList
    // },
    {
      find: "location:\"DiscordTag\"",
      replacement: {
        match: /,children:\[(.+?),null(.+?)]/,
        replace: ",children:second!==undefined?[$1,$self.renderFriendsList(user),null$2]:[$1,null$2]"
      }
    }
  ],

  renderTooltip: ErrorBoundary.wrap((guild) =>
    guild.profile &&
    <div style={{ marginLeft: "4px" }}>
      <GuildTagComponent guildTag={guild.profile.tag} guildId={guild.id} guildBadge={guild.profile.badge} inline />
    </div>, { noop: true }),
  renderTitleBar: ErrorBoundary.wrap(guild =>
    guild.profile &&
    <div style={{ marginLeft: "6px" }}>
      <GuildTagComponent guildTag={guild.profile.tag} guildId={guild.id} guildBadge={guild.profile.badge} inline />
    </div>, { noop: true }),
  renderDefault: ErrorBoundary.wrap(guild =>
    guild.profile &&
    <GuildTagComponent guildTag={guild.profile.tag} guildId={guild.id} guildBadge={guild.profile.badge} inline />, { noop: true }),
  renderUser: ErrorBoundary.wrap(user =>
    user.primaryGuild?.identityEnabled &&
    <GuildTagComponent guildTag={user.primaryGuild.tag} guildId={user.primaryGuild.identityGuildId} guildBadge={user.primaryGuild.badge} inline />, { noop: true }),
  renderFriendsList: ErrorBoundary.wrap(user =>
    user.primaryGuild?.identityEnabled &&
    <div style={{ marginLeft: "5px" }}>
      <GuildTagComponent guildTag={user.primaryGuild.tag} guildId={user.primaryGuild.identityGuildId} guildBadge={user.primaryGuild.badge} inline />
    </div>, { noop: true }),
});