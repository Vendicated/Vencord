
# Vencord Report

## Bad Patches
- CustomScreenShare (had no effect)
  - ID: `65154`
  - Match: ```
           /(max:|\i=)4e6,/
           ```
- NotesSearcher (had no effect)
  - ID: `183139`
  - Match: ```
           /\.send\(8,{(?!nonce)/
           ```
- NotesSearcher (had no effect)
  - ID: `344651`
  - Match: ```
           /notFound:(\i)\.not_found(?!,nonce)/
           ```
- NotesSearcher (had no effect)
  - ID: `548570`
  - Match: ```
           /capabilities:(\i\.\i),/
           ```
- AllowedMentions (had no effect)
  - ID: `893718`
  - Match: ```
           /.hasConnectedBar]:\i/
           ```
- AllowedMentions (had no effect)
  - ID: `928477`
  - Match: ```
           /(?<=.Endpoints.CHANNEL_THREADS\((\i.id)\)\+"\?use_nested_fields=true".+?message:\{)/
           ```
- ExtraConnectionLinks (errored)
  - ID: `272053`
  - Match: ```
           /\(r/
           ```
  - Error: ```
           Unexpected token ':'
           ```
- ExtraConnectionLinks (errored)
  - ID: `272053`
  - Match: ```
           /\(r/
           ```
  - Error: ```
           Unexpected token ':'
           ```
- ExtraConnectionLinks (errored)
  - ID: `272053`
  - Match: ```
           /\(r/
           ```
  - Error: ```
           Unexpected token ':'
           ```
- EnhancedUserTags (had no effect)
  - ID: `515753`
  - Match: ```
           /decorators:\i.isSystemDM\(\).{1,80}}\):null/
           ```
- Hide Groups (had no effect)
  - ID: `515753`
  - Match: ```
           /\i.default=(\i)=>{let{.+}=\i,/
           ```
- Hide Groups (had no effect)
  - ID: `831218`
  - Match: ```
           /\(O\.default,{/
           ```
- ChannelTabs (had no effect)
  - ID: `176299`
  - Match: ```
           /(\?void 0:(\i)\.channelId.{0,120})\i\.Fragment,{/
           ```
- DiscordColorways (had no effect)
  - ID: `718813`
  - Match: ```
           /createPromise:\(\)=>([^:}]*?),webpackId:"\d+",name:(?!="CollectiblesShop")"[^"]+"/g
           ```
- AllowedMentions (found no module)
  - ID: `-`
  - Match: ```
           .AnalyticEvents.APPLICATION_COMMAND_VALIDATION_FAILED,
           ```
- AllowedMentions (found no module)
  - ID: `-`
  - Match: ```
           .stackedAttachedBar]:!
           ```
- AllowedMentions (found no module)
  - ID: `-`
  - Match: ```
           .Messages.REPLYING_TO.format({
           ```
- AllowedMentions (found no module)
  - ID: `-`
  - Match: ```
           .Messages.EVERYONE_POPOUT_BODY
           ```
- AllowedMentions (found no module)
  - ID: `-`
  - Match: ```
           .ComponentActions.FOCUS_COMPOSER_TITLE,
           ```
- BannersEverywhere (found no module)
  - ID: `-`
  - Match: ```
           .Messages.GUILD_OWNER,
           ```
- betterAutomod (found no module)
  - ID: `-`
  - Match: ```
           .Messages.GUILD_SETTINGS_AUTOMOD_MESSAGE_FILTER_DESCRIPTION
           ```
- BetterBanReasons (found no module)
  - ID: `-`
  - Match: ```
           Messages.BAN_MULTIPLE_CONFIRM_TITLE
           ```
- BetterQuickReact (found no module)
  - ID: `-`
  - Match: ```
           .ADD_REACTION_NAMED.format
           ```
- BetterScreenshare (found no module)
  - ID: `-`
  - Match: ```
           Messages.SCREENSHARE_RELAUNCH
           ```
- CustomScreenShare (found no module)
  - ID: `-`
  - Match: ```
           ApplicationStreamSettingRequirements)
           ```
- CustomScreenShare (found no module)
  - ID: `-`
  - Match: ```
           ApplicationStreamFPSButtonsWithSuffixLabel.map
           ```
- CustomScreenShare (found no module)
  - ID: `-`
  - Match: ```
           ApplicationStreamResolutionButtonsWithSuffixLabel.map
           ```
- CustomScreenShare (found no module)
  - ID: `-`
  - Match: ```
           ApplicationStreamResolutionButtonsWithSuffixLabel.map
           ```
- DiscordColorways (found no module)
  - ID: `-`
  - Match: ```
           Messages.USER_SETTINGS_WITH_BUILD_OVERRIDE.format
           ```
- DiscordColorways (found no module)
  - ID: `-`
  - Match: ```
           Messages.ACTIVITY_SETTINGS
           ```
- DiscordColorways (found no module)
  - ID: `-`
  - Match: ```
           Messages.ACTIVITY_SETTINGS
           ```
- DiscordColorways (found no module)
  - ID: `-`
  - Match: ```
           Messages.USER_SETTINGS_ACTIONS_MENU_LABEL
           ```
- DraggableEmotes (found no module)
  - ID: `-`
  - Match: ```
           .EMOJI_NAMES_WITH_FAVORITED
           ```
- EnhancedUserTags (found no module)
  - ID: `-`
  - Match: ```
           .Messages.GUILD_OWNER,
           ```
- EnhancedUserTags (found no module)
  - ID: `-`
  - Match: ```
           .WATCH_STREAM_WATCHING,
           ```
- EnhancedUserTags (found no module)
  - ID: `-`
  - Match: ```
           .Messages.USER_PROFILE_PRONOUNS
           ```
- FullUserInChatbox (found no module)
  - ID: `-`
  - Match: ```
           UNKNOWN_ROLE_PLACEHOLDER]
           ```
- KeywordNotify (found no module)
  - ID: `-`
  - Match: ```
           Messages.UNREADS_TAB_LABEL}
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           &&"AUDIO"
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           AnalyticEvents.MEDIA_DOWNLOAD_BUTTON_TAPPED
           ```
- MoreStickers (found no module)
  - ID: `-`
  - Match: ```
           STICKER_BUTTON_LABEL,
           ```
- MoreStickers (found no module)
  - ID: `-`
  - Match: ```
           .Messages.EXPRESSION_PICKER_GIF
           ```
- PhilsPluginLibrary (found no module)
  - ID: `-`
  - Match: ```
           Messages.ACCOUNT_A11Y_LABEL
           ```
- ServerProfilesToolbox (found no module)
  - ID: `-`
  - Match: ```
           .PROFILE_CUSTOMIZATION_GUILD_SELECT_TITLE
           ```
- SimplifiedProfileNotes (found no module)
  - ID: `-`
  - Match: ```
           /getRelationshipType.{0,800}\.Overlay.{0,200}Messages\.USER_POPOUT_ABOUT_ME/
           ```
- SVGEmbed (found no module)
  - ID: `-`
  - Match: ```
           .Messages.REMOVE_ATTACHMENT_BODY
           ```
- TextEmoji (found no module)
  - ID: `-`
  - Match: ```
           getSrc(){
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           .NITRO_BANNER,
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           =!1,canUsePremiumCustomization:
           ```
- WhosWatching (found no module)
  - ID: `-`
  - Match: ```
           this.isJoinableActivity()||
           ```

## Bad Webpack Finds
- ```
  findByProps("useAutomodRulesList")
  ```
- ```
  findByProps("UserSettingsDelay", "MAX_FAVORITES")
  ```
- ```
  findByProps("useDrag", "useDrop")
  ```
- ```
  findByCode(".Messages.DISCORD_SYSTEM_MESSAGE_BOT_TAG_TOOLTIP_OFFICIAL", ".SYSTEM_DM_TAG_OFFICIAL")
  ```
- ```
  findComponentByCode(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)")
  ```
- ```
  findByCode(".sv)()?(0,")
  ```
- ```
  findByCode("THREAD_CREATED?[]:(0,")
  ```
- ```
  findByProps("promptToUpload")
  ```
- ```
  findComponentByCode(".useEmojiSelectHandler)")
  ```
- ```
  findByProps("addReaction", "getReactors")
  ```
- ```
  extractAndLoadChunks(["name:"UserSettings""], /createPromise:.{0,20}el\("(.+?)"\).{0,50}"UserSettings"/)
  ```
- ```
  findByProps("setPendingNickname", "setPendingPronouns")
  ```
- ```
  findComponentByCode(".Messages.ROLE_ICON_ALT_TEXT")
  ```

## Bad Starts

## Discord Errors
- ```
  Cannot convert undefined or null to object
  Function.entries (<anonymous>)
  ```
- ```
  undefined is not iterable (cannot read property Symbol(Symbol.iterator))
  ```
- ```
  Cannot convert undefined or null to object
  Function.entries (<anonymous>)
  ```
- ```
  Cannot convert undefined or null to object
  Function.entries (<anonymous>)
  ```

## Ignored Discord Errors

{"description":"Here's the latest Vencord Report!","username":"Vencord Reporter","embeds":[{"title":"Bad Patches","description":"**__CustomScreenShare (had no effect):__**\nID: `65154`\nMatch: ```\n/(max:|\\i=)4e6,/\n```\n\n**__NotesSearcher (had no effect):__**\nID: `183139`\nMatch: ```\n/\\.send\\(8,{(?!nonce)/\n```\n\n**__NotesSearcher (had no effect):__**\nID: `344651`\nMatch: ```\n/notFound:(\\i)\\.not_found(?!,nonce)/\n```\n\n**__NotesSearcher (had no effect):__**\nID: `548570`\nMatch: ```\n/capabilities:(\\i\\.\\i),/\n```\n\n**__AllowedMentions (had no effect):__**\nID: `893718`\nMatch: ```\n/.hasConnectedBar]:\\i/\n```\n\n**__AllowedMentions (had no effect):__**\nID: `928477`\nMatch: ```\n/(?<=.Endpoints.CHANNEL_THREADS\\((\\i.id)\\)\\+\"\\?use_nested_fields=true\".+?message:\\{)/\n```\n\n**__ExtraConnectionLinks (errored):__**\nID: `272053`\nMatch: ```\n/\\(r/\n```\nError: ```\nUnexpected token ':'\n```\n\n**__ExtraConnectionLinks (errored):__**\nID: `272053`\nMatch: ```\n/\\(r/\n```\nError: ```\nUnexpected token ':'\n```\n\n**__ExtraConnectionLinks (errored):__**\nID: `272053`\nMatch: ```\n/\\(r/\n```\nError: ```\nUnexpected token ':'\n```\n\n**__EnhancedUserTags (had no effect):__**\nID: `515753`\nMatch: ```\n/decorators:\\i.isSystemDM\\(\\).{1,80}}\\):null/\n```\n\n**__Hide Groups (had no effect):__**\nID: `515753`\nMatch: ```\n/\\i.default=(\\i)=>{let{.+}=\\i,/\n```\n\n**__Hide Groups (had no effect):__**\nID: `831218`\nMatch: ```\n/\\(O\\.default,{/\n```\n\n**__ChannelTabs (had no effect):__**\nID: `176299`\nMatch: ```\n/(\\?void 0:(\\i)\\.channelId.{0,120})\\i\\.Fragment,{/\n```\n\n**__DiscordColorways (had no effect):__**\nID: `718813`\nMatch: ```\n/createPromise:\\(\\)=>([^:}]*?),webpackId:\"\\d+\",name:(?!=\"CollectiblesShop\")\"[^\"]+\"/g\n```\n\n**__AllowedMentions (found no module):__**\nID: `-`\nMatch: ```\n.AnalyticEvents.APPLICATION_COMMAND_VALIDATION_FAILED,\n```\n\n**__AllowedMentions (found no module):__**\nID: `-`\nMatch: ```\n.stackedAttachedBar]:!\n```\n\n**__AllowedMentions (found no module):__**\nID: `-`\nMatch: ```\n.Messages.REPLYING_TO.format({\n```\n\n**__AllowedMentions (found no module):__**\nID: `-`\nMatch: ```\n.Messages.EVERYONE_POPOUT_BODY\n```\n\n**__AllowedMentions (found no module):__**\nID: `-`\nMatch: ```\n.ComponentActions.FOCUS_COMPOSER_TITLE,\n```\n\n**__BannersEverywhere (found no module):__**\nID: `-`\nMatch: ```\n.Messages.GUILD_OWNER,\n```\n\n**__betterAutomod (found no module):__**\nID: `-`\nMatch: ```\n.Messages.GUILD_SETTINGS_AUTOMOD_MESSAGE_FILTER_DESCRIPTION\n```\n\n**__BetterBanReasons (found no module):__**\nID: `-`\nMatch: ```\nMessages.BAN_MULTIPLE_CONFIRM_TITLE\n```\n\n**__BetterQuickReact (found no module):__**\nID: `-`\nMatch: ```\n.ADD_REACTION_NAMED.format\n```\n\n**__BetterScreenshare (found no module):__**\nID: `-`\nMatch: ```\nMessages.SCREENSHARE_RELAUNCH\n```\n\n**__CustomScreenShare (found no module):__**\nID: `-`\nMatch: ```\nApplicationStreamSettingRequirements)\n```\n\n**__CustomScreenShare (found no module):__**\nID: `-`\nMatch: ```\nApplicationStreamFPSButtonsWithSuffixLabel.map\n```\n\n**__CustomScreenShare (found no module):__**\nID: `-`\nMatch: ```\nApplicationStreamResolutionButtonsWithSuffixLabel.map\n```\n\n**__CustomScreenShare (found no module):__**\nID: `-`\nMatch: ```\nApplicationStreamResolutionButtonsWithSuffixLabel.map\n```\n\n**__DiscordColorways (found no module):__**\nID: `-`\nMatch: ```\nMessages.USER_SETTINGS_WITH_BUILD_OVERRIDE.format\n```\n\n**__DiscordColorways (found no module):__**\nID: `-`\nMatch: ```\nMessages.ACTIVITY_SETTINGS\n```\n\n**__DiscordColorways (found no module):__**\nID: `-`\nMatch: ```\nMessages.ACTIVITY_SETTINGS\n```\n\n**__DiscordColorways (found no module):__**\nID: `-`\nMatch: ```\nMessages.USER_SETTINGS_ACTIONS_MENU_LABEL\n```\n\n**__DraggableEmotes (found no module):__**\nID: `-`\nMatch: ```\n.EMOJI_NAMES_WITH_FAVORITED\n```\n\n**__EnhancedUserTags (found no module):__**\nID: `-`\nMatch: ```\n.Messages.GUILD_OWNER,\n```\n\n**__EnhancedUserTags (found no module):__**\nID: `-`\nMatch: ```\n.WATCH_STREAM_WATCHING,\n```\n\n**__EnhancedUserTags (found no module):__**\nID: `-`\nMatch: ```\n.Messages.USER_PROFILE_PRONOUNS\n```\n\n**__FullUserInChatbox (found no module):__**\nID: `-`\nMatch: ```\nUNKNOWN_ROLE_PLACEHOLDER]\n```\n\n**__KeywordNotify (found no module):__**\nID: `-`\nMatch: ```\nMessages.UNREADS_TAB_LABEL}\n```\n\n**__MediaDownloader (found no module):__**\nID: `-`\nMatch: ```\n&&\"AUDIO\"\n```\n\n**__MediaDownloader (found no module):__**\nID: `-`\nMatch: ```\nAnalyticEvents.MEDIA_DOWNLOAD_BUTTON_TAPPED\n```\n\n**__MoreStickers (found no module):__**\nID: `-`\nMatch: ```\nSTICKER_BUTTON_LABEL,\n```\n\n**__MoreStickers (found no module):__**\nID: `-`\nMatch: ```\n.Messages.EXPRESSION_PICKER_GIF\n```\n\n**__PhilsPluginLibrary (found no module):__**\nID: `-`\nMatch: ```\nMessages.ACCOUNT_A11Y_LABEL\n```\n\n**__ServerProfilesToolbox (found no module):__**\nID: `-`\nMatch: ```\n.PROFILE_CUSTOMIZATION_GUILD_SELECT_TITLE\n```\n\n**__SimplifiedProfileNotes (found no module):__**\nID: `-`\nMatch: ```\n/getRelationshipType.{0,800}\\.Overlay.{0,200}Messages\\.USER_POPOUT_ABOUT_ME/\n```\n\n**__SVGEmbed (found no module):__**\nID: `-`\nMatch: ```\n.Messages.REMOVE_ATTACHMENT_BODY\n```\n\n**__TextEmoji (found no module):__**\nID: `-`\nMatch: ```\ngetSrc(){\n```\n\n**__Timezones (found no module):__**\nID: `-`\nMatch: ```\n.NITRO_BANNER,\n```\n\n**__Timezones (found no module):__**\nID: `-`\nMatch: ```\n=!1,canUsePremiumCustomization:\n```\n\n**__WhosWatching (found no module):__**\nID: `-`\nMatch: ```\nthis.isJoinableActivity()||\n```","color":16711680},{"title":"Bad Webpack Finds","description":"```\nfindByProps(\"useAutomodRulesList\")\n```\n```\nfindByProps(\"UserSettingsDelay\", \"MAX_FAVORITES\")\n```\n```\nfindByProps(\"useDrag\", \"useDrop\")\n```\n```\nfindByCode(\".Messages.DISCORD_SYSTEM_MESSAGE_BOT_TAG_TOOLTIP_OFFICIAL\", \".SYSTEM_DM_TAG_OFFICIAL\")\n```\n```\nfindComponentByCode(\".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR\", \".BACKGROUND_PRIMARY)\")\n```\n```\nfindByCode(\".sv)()?(0,\")\n```\n```\nfindByCode(\"THREAD_CREATED?[]:(0,\")\n```\n```\nfindByProps(\"promptToUpload\")\n```\n```\nfindComponentByCode(\".useEmojiSelectHandler)\")\n```\n```\nfindByProps(\"addReaction\", \"getReactors\")\n```\n```\nextractAndLoadChunks([\"name:\"UserSettings\"\"], /createPromise:.{0,20}el\\(\"(.+?)\"\\).{0,50}\"UserSettings\"/)\n```\n```\nfindByProps(\"setPendingNickname\", \"setPendingPronouns\")\n```\n```\nfindComponentByCode(\".Messages.ROLE_ICON_ALT_TEXT\")\n```","color":16711680},{"title":"Bad Starts","description":"None","color":65280},{"title":"Discord Errors","description":"```\nCannot convert undefined or null to object\nFunction.entries (<anonymous>)\nundefined is not iterable (cannot read property Symbol(Symbol.iterator))\nCannot convert undefined or null to object\nFunction.entries (<anonymous>)\nCannot convert undefined or null to object\nFunction.entries (<anonymous>)\n```","color":16711680}]}

# Vencord Report

## Bad Patches
- MoreStickers (had no effect)
  - ID: `805680`
  - Match: ```
           /role:"tablist",.+?\.Messages\.EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL,children:(\[.*?\)\]}\)}\):null,)(.*?closePopout:\w.*?:null)/s
           ```
- BetterScreenshare (found no module)
  - ID: `-`
  - Match: ```
           .gBGdt7
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           &&"AUDIO"
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           AnalyticEvents.MEDIA_DOWNLOAD_BUTTON_TAPPED
           ```
- MoreStickers (found no module)
  - ID: `-`
  - Match: ```
           STICKER_BUTTON_LABEL,
           ```
- PhilsPluginLibrary (found no module)
  - ID: `-`
  - Match: ```
           Messages.ACCOUNT_A11Y_LABEL
           ```
- ServerProfilesToolbox (found no module)
  - ID: `-`
  - Match: ```
           .PROFILE_CUSTOMIZATION_GUILD_SELECT_TITLE
           ```
- SimplifiedProfileNotes (found no module)
  - ID: `-`
  - Match: ```
           /getRelationshipType.{0,800}\.Overlay.{0,200}Messages\.USER_POPOUT_ABOUT_ME/
           ```
- SVGEmbed (found no module)
  - ID: `-`
  - Match: ```
           .Messages.REMOVE_ATTACHMENT_BODY
           ```
- TextEmoji (found no module)
  - ID: `-`
  - Match: ```
           getSrc(){
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           .NITRO_BANNER,
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           =!1,canUsePremiumCustomization:
           ```
- WhosWatching (found no module)
  - ID: `-`
  - Match: ```
           this.isJoinableActivity()||
           ```

## Bad Webpack Finds
- ```
  findByProps("promptToUpload")
  ```
- ```
  findComponentByCode(".useEmojiSelectHandler)")
  ```
- ```
  findByProps("addReaction", "getReactors")
  ```
- ```
  extractAndLoadChunks(["name:"UserSettings""], /createPromise:.{0,20}el\("(.+?)"\).{0,50}"UserSettings"/)
  ```
- ```
  findByProps("setPendingNickname", "setPendingPronouns")
  ```
- ```
  findComponentByCode(".Messages.ROLE_ICON_ALT_TEXT")
  ```

## Bad Starts
- AnimatedBackgrounds
  - Error: ```
           Cannot read properties of undefined (reading 'endsWith')
           ```

## Discord Errors
- ```
  Cannot read properties of undefined (reading 'endsWith')
  ```
- ```
  Cannot read properties of undefined (reading 'state')
  ```
- ```
  Cannot read properties of undefined (reading 'endsWith')
  ```
- ```
  [Vencord] PluginManager: Failed to start AnimatedBackgrounds
   Cannot read properties of undefined (reading 'endsWith')
  ```
- ```
  e is not iterable
  ```

## Ignored Discord Errors


# Vencord Report

## Bad Patches
- MoreStickers (had no effect)
  - ID: `805680`
  - Match: ```
           /role:"tablist",.+?(?:\["2j4VgY"\]),children:(\[.*?\)\]}\)}\):null,)(.*?closePopout:\w.*?:null)/s
           ```
- BetterScreenshare (found no module)
  - ID: `-`
  - Match: ```
           .gBGdt7
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           &&"AUDIO"
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           AnalyticEvents.MEDIA_DOWNLOAD_BUTTON_TAPPED
           ```
- MoreStickers (found no module)
  - ID: `-`
  - Match: ```
           STICKER_BUTTON_LABEL,
           ```
- PhilsPluginLibrary (found no module)
  - ID: `-`
  - Match: ```
           Messages.ACCOUNT_A11Y_LABEL
           ```
- ServerProfilesToolbox (found no module)
  - ID: `-`
  - Match: ```
           .PROFILE_CUSTOMIZATION_GUILD_SELECT_TITLE
           ```
- SimplifiedProfileNotes (found no module)
  - ID: `-`
  - Match: ```
           /getRelationshipType.{0,800}\.Overlay.{0,200}Messages\.USER_POPOUT_ABOUT_ME/
           ```
- SVGEmbed (found no module)
  - ID: `-`
  - Match: ```
           .Messages.REMOVE_ATTACHMENT_BODY
           ```
- TextEmoji (found no module)
  - ID: `-`
  - Match: ```
           getSrc(){
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           .NITRO_BANNER,
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           =!1,canUsePremiumCustomization:
           ```
- WhosWatching (found no module)
  - ID: `-`
  - Match: ```
           this.isJoinableActivity()||
           ```

## Bad Webpack Finds
- ```
  findByProps("promptToUpload")
  ```
- ```
  findComponentByCode(".useEmojiSelectHandler)")
  ```
- ```
  findByProps("addReaction", "getReactors")
  ```
- ```
  extractAndLoadChunks(["name:"UserSettings""], /createPromise:.{0,20}el\("(.+?)"\).{0,50}"UserSettings"/)
  ```
- ```
  findByProps("setPendingNickname", "setPendingPronouns")
  ```
- ```
  findComponentByCode(".Messages.ROLE_ICON_ALT_TEXT")
  ```

## Bad Starts
- AnimatedBackgrounds
  - Error: ```
           Cannot read properties of undefined (reading 'endsWith')
           ```

## Discord Errors
- ```
  Cannot read properties of undefined (reading 'state')
  ```
- ```
  Cannot read properties of undefined (reading 'endsWith')
  ```
- ```
  Cannot read properties of undefined (reading 'endsWith')
  ```
- ```
  [Vencord] PluginManager: Failed to start AnimatedBackgrounds
   Cannot read properties of undefined (reading 'endsWith')
  ```
- ```
  e is not iterable
  ```

## Ignored Discord Errors


# Vencord Report

## Bad Patches
- BetterScreenshare (found no module)
  - ID: `-`
  - Match: ```
           .gBGdt7
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           &&"AUDIO"
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           AnalyticEvents.MEDIA_DOWNLOAD_BUTTON_TAPPED
           ```
- PhilsPluginLibrary (found no module)
  - ID: `-`
  - Match: ```
           Messages.ACCOUNT_A11Y_LABEL
           ```
- ServerProfilesToolbox (found no module)
  - ID: `-`
  - Match: ```
           .f6MqwM
           ```
- SimplifiedProfileNotes (found no module)
  - ID: `-`
  - Match: ```
           /getRelationshipType.{0,800}\.Overlay.{0,200}Messages\.USER_POPOUT_ABOUT_ME/
           ```
- SVGEmbed (found no module)
  - ID: `-`
  - Match: ```
           .Messages.REMOVE_ATTACHMENT_BODY
           ```
- TextEmoji (found no module)
  - ID: `-`
  - Match: ```
           getSrc(){
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           .NITRO_BANNER,
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           =!1,canUsePremiumCustomization:
           ```
- WhosWatching (found no module)
  - ID: `-`
  - Match: ```
           this.isJoinableActivity()||
           ```

## Bad Webpack Finds
- ```
  findComponentByCode(".useEmojiSelectHandler)")
  ```
- ```
  findByProps("addReaction", "getReactors")
  ```
- ```
  extractAndLoadChunks(["name:"UserSettings""], /createPromise:.{0,20}el\("(.+?)"\).{0,50}"UserSettings"/)
  ```
- ```
  findByProps("setPendingNickname", "setPendingPronouns")
  ```
- ```
  findComponentByCode(".Messages.ROLE_ICON_ALT_TEXT")
  ```

## Bad Starts

## Discord Errors
- ```
  Cannot read properties of undefined (reading 'state')
  ```
- ```
  e is not iterable
  ```

## Ignored Discord Errors


# Vencord Report

## Bad Patches
- BetterScreenshare (found no module)
  - ID: `-`
  - Match: ```
           .gBGdt7
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           &&"AUDIO"
           ```
- MediaDownloader (found no module)
  - ID: `-`
  - Match: ```
           AnalyticEvents.MEDIA_DOWNLOAD_BUTTON_TAPPED
           ```
- PhilsPluginLibrary (found no module)
  - ID: `-`
  - Match: ```
           Messages.ACCOUNT_A11Y_LABEL
           ```
- ServerProfilesToolbox (found no module)
  - ID: `-`
  - Match: ```
           .f6MqwM
           ```
- SimplifiedProfileNotes (found no module)
  - ID: `-`
  - Match: ```
           /getRelationshipType.{0,800}\.Overlay.{0,200}Messages\.USER_POPOUT_ABOUT_ME/
           ```
- TextEmoji (found no module)
  - ID: `-`
  - Match: ```
           getSrc(){
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           .NITRO_BANNER,
           ```
- Timezones (found no module)
  - ID: `-`
  - Match: ```
           =!1,canUsePremiumCustomization:
           ```
- WhosWatching (found no module)
  - ID: `-`
  - Match: ```
           this.isJoinableActivity()||
           ```

## Bad Webpack Finds
- ```
  findComponentByCode(".useEmojiSelectHandler)")
  ```
- ```
  findByProps("addReaction", "getReactors")
  ```
- ```
  extractAndLoadChunks(["name:"UserSettings""], /createPromise:.{0,20}el\("(.+?)"\).{0,50}"UserSettings"/)
  ```
- ```
  findByProps("setPendingNickname", "setPendingPronouns")
  ```
- ```
  findComponentByCode(".Messages.ROLE_ICON_ALT_TEXT")
  ```

## Bad Starts

## Discord Errors
- ```
  Cannot read properties of undefined (reading 'state')
  ```
- ```
  e is not iterable
  ```

## Ignored Discord Errors

