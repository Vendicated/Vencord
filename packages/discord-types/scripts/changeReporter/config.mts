/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { join } from "node:path";

import type { CR } from "./types.mts";

export default {
    rootDir: join(import.meta.dirname, "../../src"),
    deps: {
        "../package.json": {
            "@types/lodash": {
                find() {
                    return this.Webpack.Common.lodash.VERSION;
                },
                overrides: [["4.17.x", "4.17.x"]],
            },
            "@types/react": {
                find() {
                    return this.Webpack.Common.React.version;
                },
                overrides: [["18.2.x", "18.2.x"]],
            },
            moment: {
                find() {
                    return this.Webpack.Common.moment.version;
                },
            },
        },
    },
    src: {
        "./flux/ActionHandlersGraph.ts": {
            ActionHandlersGraph: {
                type: "class",
            },
        },
        "./flux/ActionLog.ts": {
            ActionLog: {
                type: "class",
                find() {
                    return this.Webpack.Common.FluxDispatcher.actionLogger.log(
                        { type: Math.random().toString() as any },
                        () => {}
                    ).constructor;
                },
            },
        },
        "./flux/ActionLogger.ts": {
            ActionLogger: {
                type: "class",
            },
        },
        "./flux/BatchedStoreListener.ts": {
            BatchedStoreListener: {
                type: "class",
            },
        },
        "./flux/ChangeListeners.ts": {
            ChangeListeners: {
                type: "class",
            },
        },
        "./flux/Dispatcher.ts": {
            Dispatcher: {
                type: "class",
            },
            DispatchBand: {
                type: "enum",
                // Screaming snake case to pascal case (source enum's keys have no underscores)
                keyMapper: key => key.replace(/(?<=^.).+/, s => s.toLowerCase()),
            },
            SeverityLevel: {
                type: "enum",
            },
        },
        "./flux/Emitter.ts": {
            Emitter: {
                type: "class",
            },
        },
        "./flux/PersistedStore.ts": {
            PersistedStore: {
                type: "class",
                ignoredAdditions: {
                    // Overrides
                    staticMethodsAndFields: ["destroy"],
                    methods: ["initializeIfNeeded"],
                },
            },
        },
        "./flux/SnapshotStore.ts": {
            SnapshotStore: {
                type: "class",
                ignoredRemovals: {
                    // Exists on type to enforce that subclasses have `displayName`
                    staticMethodsAndFields: ["displayName"],
                },
            },
        },
        "./flux/Store.ts": {
            Store: {
                type: "class",
            },
        },
        "./flux/UserAgnosticStore.ts": {
            UserAgnosticStore: {
                type: "class",
                find() {
                    return Object.getPrototypeOf(this.Webpack.Common.Flux.DeviceSettingsStore);
                },
                ignoredAdditions: {
                    // Overrides
                    methods: ["initializeFromState", "initializeIfNeeded", "getState"],
                },
            },
        },
        "./general/channels/ChannelRecord.ts": {
            ChannelRecordBase: {
                type: "class",
            },
            ChannelRecordProperties: {
                type: "class",
                find() {
                    const { findByCode } = this.Webpack;
                    const constructor = findByCode("}isGroupDM(") ?? findByCode("{isGroupDM(");
                    return constructor && Object.getPrototypeOf(constructor);
                },
                includeOptional: true,
                ignoredRemovals: {
                    // Seems to have been removed
                    fields: ["voiceBackgroundDisplay"],
                },
            },
            ForumLayout: {
                type: "enum",
            },
            ThreadSortOrder: {
                type: "enum",
            },
            ChannelFlags: {
                type: "enum",
            },
            ThreadMemberFlags: {
                type: "enum",
            },
            SafetyWarningType: {
                type: "enum",
                find() {
                    let key: string;
                    return new Promise<CR.EnumMembers>(res => {
                        this.Webpack.waitFor(exps => {
                            for (const k in exps) {
                                try {
                                    if (typeof exps[k]?.STRANGER_DANGER === "number") {
                                        key = k;
                                        return true;
                                    }
                                } catch {}
                            }
                            return false;
                        }, exps => { res(exps[key]); });
                    });
                },
            },
            ChannelType: {
                type: "enum",
            },
            VideoQualityMode: {
                type: "enum",
            },
            /*
            // This seems to have been removed
            VoiceCallBackgroundType: {
                type: "enum",
            },
            */
        },
        "./general/channels/ForumChannelRecord.ts": {
            ForumChannelRecord: {
                type: "class",
                find() {
                    const castChannelRecord = this.Webpack.findByCode(".GUILD_TEXT]", "return(");
                    return castChannelRecord({ type: /* GUILD_FORUM */ 15 }).constructor;
                },
                ignoredRemovals: {
                    fields: true,
                },
            },
        },
        "./general/channels/GuildTextualChannelRecord.ts": {
            GuildTextualChannelRecordBase: {
                type: "class",
                find() {
                    const castChannelRecord = this.Webpack.findByCode(".GUILD_TEXT]", "return(");
                    return Object.getPrototypeOf(castChannelRecord({ type: /* GUILD_TEXT */ 0 }).constructor);
                },
                ignoredRemovals: {
                    fields: true,
                },
            },
        },
        "./general/channels/GuildVocalChannelRecord.ts": {
            GuildVocalChannelRecordBase: {
                type: "class",
                find() {
                    const castChannelRecord = this.Webpack.findByCode(".GUILD_TEXT]", "return(");
                    return Object.getPrototypeOf(castChannelRecord({ type: /* GUILD_VOICE */ 2 }).constructor);
                },
                ignoredRemovals: {
                    fields: true,
                },
            },
        },
        "./general/channels/PrivateChannelRecord.ts": {
            PrivateChannelRecordBase: {
                type: "class",
                find() {
                    const castChannelRecord = this.Webpack.findByCode(".GUILD_TEXT]", "return(");
                    return Object.getPrototypeOf(castChannelRecord({ type: /* GROUP_DM */ 3 }).constructor);
                },
                ignoredAdditions: {
                    // Overrides
                    methods: ["isSystemDM"],
                },
                ignoredRemovals: {
                    fields: true,
                },
            },
        },
        "./general/channels/ThreadChannelRecord.ts": {
            ThreadChannelRecord: {
                type: "class",
                find() {
                    const castChannelRecord = this.Webpack.findByCode(".GUILD_TEXT]", "return(");
                    return castChannelRecord({ type: /* PUBLIC_THREAD */ 11 }).constructor;
                },
                ignoredRemovals: {
                    fields: true,
                },
            },
        },
        "./general/channels/UnknownChannelRecord.ts": {
            UnknownChannelRecord: {
                type: "class",
                find() {
                    return this.Webpack.findByCode(".UNKNOWN", "static fromServer(");
                },
                ignoredRemovals: {
                    fields: true,
                },
            },
        },
        "./general/emojis/Emoji.ts": {
            UnicodeEmoji: {
                type: "class",
            },
            EmojiType: {
                type: "enum",
            },
        },
        "./general/emojis/EmojiDisambiguations.ts": {
            EmojiDisambiguations: {
                type: "class",
                find() {
                    return this.Webpack.Common.EmojiStore.getDisambiguatedEmojiContext().constructor;
                },
            },
        },
        "./general/emojis/GuildEmojis.ts": {
            GuildEmojis: {
                type: "class",
                async find() {
                    const { Common } = this.Webpack;
                    let values = Object.values(Common.EmojiStore.getGuilds());
                    if (values.length <= 0)
                        await new Promise<void>(res => {
                            Common.EmojiStore.addConditionalChangeListener(() => {
                                values = Object.values(Common.EmojiStore.getGuilds());
                                if (values.length > 0) {
                                    res();
                                    return false;
                                }
                            });
                            Common.InstantInviteActionCreators.acceptInvite({
                                inviteKey: "discord-townhall"
                            }).catch(() => {});
                        });
                    return values[0]?.constructor;
                },
            },
        },
        "./general/messages/ChannelMessages.ts": {
            ChannelMessages: {
                type: "class",
            },
            JumpType: {
                type: "enum",
            },
        },
        "./general/messages/InteractionRecord.ts": {
            InteractionRecord: {
                type: "class",
            },
            InteractionType: {
                type: "enum",
                // From the API documentation
                ignoredRemovals: [["PING"]],
            },
        },
        "./general/messages/MessageCache.ts": {
            MessageCache: {
                type: "class",
                find() {
                    return this.Webpack.Common.MessageStore.getMessages("")._after.constructor;
                },
            },
        },
        "./general/messages/MessageRecord.ts": {
            MessageRecord: {
                type: "class",
            },
            ActivityActionType: {
                type: "enum",
                // From the API documentation
                ignoredRemovals: [["SPECTATE"]],
            },
            MessageReferenceType: {
                type: "enum",
            },
            PollLayoutType: {
                type: "enum",
            },
            PurchaseNotificationType: {
                type: "enum",
            },
            ReactionType: {
                type: "enum",
            },
            MessageState: {
                type: "enum",
            },
        },
        "./general/messages/MessageSnapshotRecord.ts": {
            MessageSnapshotRecord: {
                type: "class",
            },
        },
        "./general/messages/MinimalMessageRecord.ts": {
            MinimalMessageRecord: {
                type: "class",
            },
            MessageAttachmentFlags: {
                type: "enum",
            },
            CodedLinkType: {
                type: "enum",
            },
            MessageButtonComponentStyle: {
                type: "enum",
            },
            MessageSelectComponentOptionType: {
                type: "enum",
            },
            MessageSelectComponentDefaultValueType: {
                type: "enum",
                find() {
                    let key: string;
                    return new Promise<CR.EnumMembers>(res => {
                        this.Webpack.waitFor(exps => {
                            for (const k in exps) {
                                try {
                                    if (exps[k]?.ROLE === "role") {
                                        key = k;
                                        return true;
                                    }
                                } catch {}
                            }
                            return false;
                        }, exps => { res(exps[key]); });
                    });
                },
            },
            MessageTextInputComponentStyle: {
                type: "enum",
            },
            ContentScanFlags: {
                type: "enum",
            },
            SeparatorSpacingSize: {
                type: "enum",
            },
            MessageComponentType: {
                type: "enum",
            },
            MessageEmbedFlags: {
                type: "enum",
            },
            MessageEmbedType: {
                type: "enum",
            },
            MessageFlags: {
                type: "enum",
            },
            StickerFormat: {
                type: "enum",
            },
            MetaStickerType: {
                type: "enum"
            },
            MessageType: {
                type: "enum",
            },
        },
        "./general/Activity.ts": {
            ActivityFlags: {
                type: "enum",
            },
            ActivityGamePlatform: {
                type: "enum",
            },
            ActivityPlatform: {
                type: "enum",
            },
            ActivityType: {
                type: "enum",
            },
        },
        "./general/ApplicationCommand.ts": {
            InteractionContextType: {
                type: "enum",
            },
            ApplicationCommandType: {
                type: "enum",
            },
            ApplicationCommandOptionType: {
                type: "enum",
            },
        },
        "./general/ApplicationRecord.ts": {
            ApplicationRecord: {
                type: "class",
            },
            EmbeddedActivitySupportedPlatform: {
                type: "enum",
            },
            EmbeddedActivityLabelType: {
                type: "enum",
            },
            OrientationLockState: {
                type: "enum",
            },
            ApplicationIntegrationType: {
                type: "enum",
            },
            OAuth2Scope: {
                type: "enum",
            },
            ApplicationFlags: {
                type: "enum",
            },
            ApplicationOverlayMethodFlags: {
                type: "enum",
            },
            ApplicationType: {
                type: "enum",
            },
        },
        "./general/Clan.ts": {
            ClanBadgeKind: {
                type: "enum",
            },
            ClanBannerKind: {
                type: "enum",
            },
            ClanPlaystyle: {
                type: "enum",
            },
        },
        "./general/CompanyRecord.ts": {
            CompanyRecord: {
                type: "class",
            },
        },
        "./general/DisplayProfile.ts": {
            DisplayProfile: {
                type: "class",
            },
        },
        "./general/Draft.ts": {
            DraftType: {
                type: "enum",
                // Screaming snake case to pascal case
                keyMapper: key => key.replaceAll(
                    /(?:^|_)(.)([^_]*)/g,
                    (_, first: string, rest: string) => first.toUpperCase() + rest.toLowerCase()
                ),
            },
        },
        "./general/Frecency.ts": {
            Frecency: {
                type: "class",
            },
        },
        "./general/GuildMember.ts": {
            GuildMemberFlags: {
                type: "enum",
            },
        },
        "./general/GuildRecord.ts": {
            GuildRecord: {
                type: "class",
                ignoredAdditions: {
                    // Overrides
                    methods: ["merge", "toString"],
                },
            },
            UserNotificationSetting: {
                type: "enum",
            },
            GuildExplicitContentFilterType: {
                type: "enum",
            },
            GuildFeature: {
                type: "enum",
            },
            /*
            // Not exported; cannot be found
            GuildHubType: {
                type: "enum",
            },
            */
            MFALevel: {
                type: "enum",
            },
            GuildNSFWContentLevel: {
                type: "enum",
            },
            BoostedGuildTier: {
                type: "enum",
            },
            SystemChannelFlags: {
                type: "enum",
            },
            VerificationLevel: {
                type: "enum",
            },
        },
        "./general/Permissions.ts": {
            /*
            // bigint enums are not yet possible: https://github.com/microsoft/TypeScript/issues/37783
            Permissions: {
                type: "enum",
            },
            */
            PermissionOverwriteType: {
                type: "enum",
            },
        },
        "./general/ReadState.ts": {
            ReadState: {
                type: "class",
                async find() {
                    const { Common } = this.Webpack;
                    let me = Common.UserStore.getCurrentUser();
                    if (!me)
                        await new Promise<void>(res => {
                            Common.UserStore.addConditionalChangeListener(() => {
                                me = Common.UserStore.getCurrentUser();
                                if (me) {
                                    res();
                                    return false;
                                }
                            });
                        });
                    return Common.ReadStateStore.getNotifCenterReadState(me!.id)?.constructor;
                },
            },
            ChannelNotificationSettingsFlags: {
                type: "enum",
            },
            /*
            // Not exported; cannot be found
            ReadStateFlags: {
                type: "enum",
            },
            */
            ReadStateType: {
                type: "enum",
            },
        },
        "./general/Record.ts": {
            RecordBase: {
                type: "class",
                ignoredRemovals: {
                    // Exists on type to enforce that subclasses have a valid constructor
                    constructorDefinition: true,
                },
            },
        },
        "./general/Role.ts": {
            RoleFlags: {
                type: "enum",
            },
        },
        "./general/UserProfile.ts": {
            PlatformType: {
                type: "enum",
            },
        },
        "./general/UserRecord.ts": {
            UserRecord: {
                type: "class",
                ignoredAdditions: {
                    // Overrides
                    methods: ["toString"],
                },
            },
            UserFlags: {
                type: "enum",
                // From the API documentation
                ignoredRemovals: [["TEAM_PSEUDO_USER"]],
            },
            PremiumType: {
                type: "enum",
            },
        },
        "./i18n/FormattedMessage.ts": {
            FormattedMessage: {
                type: "class",
            },
            ASTNodeType: {
                type: "enum",
                // Undocumented
                ignoredRemovals: [["HOOK"]],
            },
        },
        "./i18n/I18N.ts": {
            I18N: {
                type: "class",
            },
        },
        "./i18n/Provider.ts": {
            Provider: {
                type: "class",
                find() {
                    const { constructor } = this.Webpack.Common.i18n._provider;
                    return [Object.getPrototypeOf(constructor), constructor];
                },
            },
        },
        "./stores/ApplicationStore.ts": {
            ApplicationStore: {
                type: "class",
            },
        },
        "./stores/ChannelStore.ts": {
            ChannelStore: {
                type: "class",
            },
        },
        "./stores/DraftStore.ts": {
            DraftStore: {
                type: "class",
                ignoredAdditions: {
                    // Overrides
                    staticMethodsAndFields: ["migrations"],
                },
            },
        },
        "./stores/EmojiStore.ts": {
            EmojiStore: {
                type: "class",
                ignoredAdditions: {
                    // Overrides
                    staticMethodsAndFields: ["migrations"],
                },
            },
            EmojiIntention: {
                type: "enum",
            },
        },
        "./stores/GuildChannelStore.ts": {
            GuildChannelStore: {
                type: "class",
            },
        },
        "./stores/GuildMemberStore.ts": {
            GuildMemberStore: {
                type: "class",
            },
        },
        "./stores/GuildStore.ts": {
            GuildStore: {
                type: "class",
            },
        },
        "./stores/MessageStore.ts": {
            MessageStore: {
                type: "class",
            },
        },
        "./stores/PermissionStore.ts": {
            PermissionStore: {
                type: "class",
            },
        },
        "./stores/PresenceStore.ts": {
            PresenceStore: {
                type: "class",
            },
            ClientType: {
                type: "enum",
                // Undocumented
                ignoredRemovals: [["EMBEDDED"]],
            },
            StatusType: {
                type: "enum",
            },
        },
        "./stores/ReadStateStore.ts": {
            ReadStateStore: {
                type: "class",
            },
        },
        "./stores/RelationshipStore.ts": {
            RelationshipStore: {
                type: "class",
            },
            RelationshipType: {
                type: "enum",
            },
        },
        "./stores/SelectedChannelStore.ts": {
            SelectedChannelStore: {
                type: "class",
            },
        },
        "./stores/SelectedGuildStore.ts": {
            SelectedGuildStore: {
                type: "class",
            },
        },
        "./stores/ThemeStore.ts": {
            ThemeStore: {
                type: "class",
                ignoredAdditions: {
                    // Overrides
                    staticMethodsAndFields: ["migrations"],
                },
            },
            Theme: {
                type: "enum",
            },
        },
        "./stores/UserProfileStore.ts": {
            UserProfileStore: {
                type: "class",
            },
        },
        "./stores/UserStore.ts": {
            UserStore: {
                type: "class",
            },
        },
        "./stores/WindowStore.ts": {
            WindowStore: {
                type: "class",
            },
        },
    },
} satisfies CR.ReporterConfig;
