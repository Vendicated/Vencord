declare module "@vencord/discord-types" {
    // Permissive runtime-value component declarations so JSX and static members work.
    export type Snowflake = string;

    export interface User {
        id: Snowflake;
        username?: string;
        discriminator?: string;
        avatar?: string | null;
        // getAvatarURL is called with multiple signatures across the codebase.
        // Provide permissive overloads to accept (size?), (guildId?, size?, forceStatic?)
        getAvatarURL?: {
            (size?: number | undefined): string;
            (guildId?: string | null | undefined, size?: number | undefined, forceStatic?: boolean | undefined): string;
        } | ((...args: any[]) => string);
        [k: string]: any;
    }

    // Common enums and runtime shapes referenced across the repo. These are permissive
    // shims (any) intended to satisfy imports used by the codebase. We can tighten
    // them later as needed.
    declare module "@vencord/discord-types/enums" {
        export const ChannelType: any;
        export const MessageFlags: any;
        export const CloudUploadPlatform: any;
        export const StickerFormatType: any;
        export const ActivityFlags: any;
        export const ActivityStatusDisplayType: any;
        export const ActivityType: any;
    }

    declare module "@vencord/discord-types" {
        export type User = any;
        export type Guild = any;
        export type GuildMember = any;
        export type Role = any;
        export type UnicodeEmoji = any;
        export type Message = any;
        export type ProfileBadge = any;
        export type ConnectedAccount = any;
        export type CommandArgument = any;
        export type CommandContext = any;
        export type MessageJSON = any;
        export const ApplicationCommandOptionType: any;
        export const ApplicationCommandInputType: any;
        // Small helper for webpack typings
        export const webpack: any;
        export type Sticker = any;
        export type GuildSticker = any;
        export type Activity = any;
        export type ActivityAssets = any;
        export type ActivityButton = any;
        export type UserProfile = any;
    }

    export interface Guild { id: Snowflake; [k: string]: any }
    export interface Channel { id: Snowflake; [k: string]: any }
    export interface Message { id?: Snowflake; content?: string; attachments?: any[]; embeds?: any[]; author?: any; [k: string]: any }
    export interface GuildMember { user: User; [k: string]: any }

    // Use a very permissive base so children, render-props and static members are allowed
    export type AnyProps = { [k: string]: any; children?: any };

    // Export runtime values (const). Use `any` for now to avoid pervasive JSX prop mismatches;
    // these can be tightened later per-component.
    export const Card: any;
    export type Card = any;

    export const Checkbox: any;
    export type Checkbox = any;

    export const Tooltip: any;
    export type Tooltip = any;

    export const TooltipContainer: any;
    export type TooltipContainer = any;

    export const TextInput: any;
    export type TextInput = any;

    export interface TextProps { className?: string; children?: any; style?: any; [k: string]: any }
    export interface ButtonWrapperClasses { buttonWrapper?: string; buttonContent?: string; [k: string]: any }

    // Flux/Stores
    export interface FluxStore { [k: string]: any }

    // Consolidated BaseStore type: runtime value objects usually expose a `.use(selector)` helper
    // which accepts a selector that receives the underlying store instance and returns a derived value.
    export interface BaseStore {
        // permissive index signature for other runtime members
        [k: string]: any;
        // generic use helper: selector receives the concrete store instance and returns R
        use?: <R = any>(selector: (store: any) => R) => R;
        emitChange?: (...args: any[]) => void;
    }

    // Specific store *types* (shapes) used across plugins. We also export runtime values
    // with the same names below so call sites like `ChannelStore.use(...)` are accepted.
    export interface MessageStore { getMessages?: any; getMessage?: any; [k: string]: any }
    export interface ChannelStore { getChannel?: any; availableTags?: any; isForumLikeChannel?: () => boolean; [k: string]: any }
    export interface UserStore { getUser?: any; getCurrentUser?: any; getMember?: any; getSortedRoles?: any; getNickname?: any; [k: string]: any }
    export interface GuildStore { getGuild?: any; [k: string]: any }

    // Misc helpers
    export const Icon: any;
    export type Icon = any;
    export interface Emoji { [k: string]: any }

    export type Flux = any;

    // Value exports for common UI components (so JSX accepts them)
    export const TextArea: any;
    export type TextArea = any;

    // Provide both value and type exports for backwards-compatibility where code sometimes
    // imports the runtime value and other times the type with the same name.
    export const Text: any;
    export type Text = any;
    export const Button: any;
    export type Button = any;
    export const CloudUpload: any;
    export type CloudUpload = any;
    export const useToken: any;
    export type useToken = any;

    export const Select: any;
    export type Select = any;

    export const SearchableSelect: any;
    export type SearchableSelect = any;

    export const Slider: any;
    export type Slider = any;

    export const Popout: any;
    export type Popout = any;

    export const Dialog: any;
    export type Dialog = any;

    export const Paginator: any;
    export type Paginator = any;

    export const Clickable: any;
    export type Clickable = any;

    export const Avatar: any;
    export type Avatar = any;

    export const ColorPicker: any;
    export type ColorPicker = any;

    export const ScrollerThin: any;
    export type ScrollerThin = any;

    export const ListScrollerThin: any;
    export type ListScrollerThin = any;

    export const FocusLock: any;
    export type FocusLock = any;

    export const MaskedLink: any;
    export type MaskedLink = any;

    export const Timestamp: any;
    export type Timestamp = any;

    // Flex used as <Flex .../> and has static enums like Flex.Justify
    export const Flex: any;
    export type Flex = any;

    // ErrorBoundary-like component used widely (value with helper wrap)
    import("react").ComponentType;
    export const ErrorBoundary: import("react").ComponentType<any> & {
        wrap?<T extends object = any>(Component: import("react").ComponentType<T>, errorBoundaryProps?: any): import("react").FunctionComponent<T>;
    };
    export type ErrorBoundary = typeof ErrorBoundary;

    // Generic helper for lazy component finders used across repo
    export function findComponentByCodeLazy<TProps = any>(code: string | string[], ...args: any[]): import("react").ComponentType<TProps>;

    // Common misc types used across codebase
    export type Command = any;
    export type FluxEvents = any;
    export type FluxEvent = any;
    export type TextVariant = any;
    export type CloudUpload = any;
    export type GuildFeatures = any;
    export type CustomEmoji = any;
    export type UnicodeEmoji = any;

    // Menu / Context
    export interface Menu { [k: string]: any }
    export type ContextMenuApi = any;

    // Stores and utils (permissive)
    export type GuildRoleStore = BaseStore;
    export type GuildMemberStore = BaseStore;
    export type AuthenticationStore = BaseStore;
    export type UserProfileStore = BaseStore;
    export type SelectedChannelStore = BaseStore;
    export type SelectedGuildStore = BaseStore;
    export type TypingStore = BaseStore;
    export type RelationshipStore = BaseStore;
    export type VoiceStateStore = BaseStore;
    export type EmojiStore = BaseStore;
    export type StickersStore = BaseStore;
    export type ThemeStore = BaseStore;
    export type WindowStore = BaseStore;
    export type DraftStore = BaseStore;
    export type StreamerModeStore = BaseStore;
    export type useStateFromStores = any;
    export type FluxDispatcher = any;
    export type Constants = any;
    export type RestAPI = any;
    export type SnowflakeUtils = any;
    export type Parser = any;
    export type Alerts = any;
    export type NavigationRouter = any;
    export type ChannelRouter = any;
    export type PermissionsBits = any;
    export type IconUtils = any;
    export type ExpressionPickerStore = BaseStore;
    export type PopoutActions = any;
    export type UsernameUtils = any;
    export type DisplayProfileUtils = any;
    export type DateUtils = any;
    export type MessageTypeSets = any;

    // Export runtime store values so call sites can do `MessageStore.use(...)` and get the selector result type.
    export const MessageStore: BaseStore & MessageStore;
    export const ChannelStore: BaseStore & ChannelStore;
    export const UserStore: BaseStore & UserStore;
    export const GuildStore: BaseStore & GuildStore;
    export const EmojiStore: BaseStore & EmojiStore;
    export const RelationshipStore: BaseStore & RelationshipStore;
    export const WindowStore: BaseStore & WindowStore;

    // Message/Attachment shapes used by vc-betterForums
    export interface FullMessageAttachment {
        id?: string;
        url?: string;
        proxy_url?: string;
        filename?: string;
        width?: number | null;
        height?: number | null;
        content_type?: string | null;
        flags?: number;
        [k: string]: any;
    }

    // Utility/store methods used by plugins
    export interface EmojiStore {
        getUsableCustomEmojiById?(id?: string | null): CustomEmoji | null;
    }

    export interface UserStore {
        getUser?: (id: Snowflake) => User | undefined;
        getCurrentUser?: () => User | undefined;
        getMember?: (guildId: Snowflake, userId: Snowflake) => GuildMember | undefined;
        getSortedRoles?: (guildId: Snowflake, userId: Snowflake) => string[] | undefined;
        getNickname?: (guildId: Snowflake, userId: Snowflake) => string | undefined;
    }

    export interface GuildStore {
        getGuild?: (id: Snowflake) => Guild | undefined;
    }

    export interface RelationshipStore {
        isBlockedOrIgnored?: (userId: Snowflake) => boolean;
        isBlockedForMessage?: (message: any) => boolean;
        isIgnoredForMessage?: (message: any) => boolean;
    }

    export interface MessageStore {
        getMessages?: (channelId: Snowflake) => any;
        // flexible getMessage signature used in multiple plugins
        getMessage?: ((channelId: Snowflake, messageId: Snowflake) => any) | ((messageId: Snowflake) => any) | any;
    }

    // Minimal Flux/typing helpers
    export type FluxEvents = string | number | symbol | Record<string, any>;

    // Helper: Set.prototype.intersection used in the plugin; declare it permissively
    interface Set<T> {
        intersection?(other: Iterable<T>): Set<T>;
    }

    export interface FullEmbed {
        image?: any;
        thumbnail?: any;
        images?: any[];
        video?: any;
        author?: any;
        rawTitle?: string;
        type?: string;
        [k: string]: any;
    }

    export type ReactionEmoji = any;
    export interface MessageReaction { [k: string]: any }
    export interface Embed { [k: string]: any }
    export interface MessageAttachment { [k: string]: any }

    export interface Attachment { [k: string]: any }
    export interface UnfurledMediaItem { [k: string]: any }

    export interface MessageReaction { [k: string]: any }
}
