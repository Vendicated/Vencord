declare module "@webpack/common" {
    export const lodash: any;
    // Provide the real react types to allow generics (memo/useCallback generics etc.)
    export const React: typeof import("react");
    export const Parser: any;
    export const EmojiStore: any;
    export const DefaultExtractAndLoadChunksRegex: RegExp;
    export const extractAndLoadChunksLazy: any;
    export const findModuleId: any;
    export const handleModuleNotFound: any;
    export const CodeFilter: any;
    export const TooltipContainer: any;
    export type FilterFn = any;
    export const FilterFn: any;
    export const Avatar: any;
    export const Dialog: any;
    export const ProxyLazy: any;

        // PermissionsBits map to numeric/BigInt flags in runtime. Expose as record so
        // Object.values(PermissionsBits) yields values usable in bitwise ops after cast.
        export const PermissionsBits: Record<string, bigint> & { [k: string]: bigint };
    export const useMemo: typeof import("react").useMemo;
    export const useState: typeof import("react").useState;
    export const useEffect: typeof import("react").useEffect;
    export const useRef: typeof import("react").useRef;
    export const MaskedLink: any;
    export const useLayoutEffect: typeof import("react").useLayoutEffect;
    export const useCallback: typeof import("react").useCallback;
    export const useReducer: typeof import("react").useReducer;

    // UI primitives and helpers
    export const Flex: any;
    export const UserUtils: any;
    export const DateUtils: any;
    export const Clickable: any;
    export const Tooltip: any;
    export const Text: any;
    export const TypingStore: any;
    export const Timestamp: any;
        export const TextArea: any;
        export const Slider: any;
        export const Switch: any;
        export const ButtonWrapperClasses: any;
        export const Animations: any;
        export const FocusLock: any;
        export const useToken: any;
        export type useToken = any;
        export const MessageCache: any;
        export const StreamerModeStore: any;
        // lowercase match helper used in some files
        export const match: any;
    export const Toasts: any;
    export const Alerts: any;
    export const StickersStore: any;
    export const Checkbox: any;
    export const Forms: any;
    export const GuildChannelStore: any;
    // GuildStore often exposes a getGuilds() returning a record of guild objects
    export interface GuildLike { id: string; name?: string; icon?: string | null; [k: string]: any }
    export const GuildStore: {
        getGuilds?(): Record<string, any>;
        getGuild?(id: string): any;
        [k: string]: any;
    };
    export const GuildMemberStore: any;
    export const GuildRoleStore: any;
    // Some stores return record-like objects; allow index access in many places
    export interface GuildLike { id: string; name?: string; icon?: string | null; [k: string]: any }
    export const ActiveJoinedThreadsStore: any;
    export const GuildChannelStore: any;
    export const AuthenticationStore: any;
    export const PresenceStore: any;
    export const PermissionStore: any;
    export const ReadStateStore: any;
    export const TextInput: any;
    export const ColorPicker: any;
    export const DraftType: any;
    export const DraftStore: any;
    export const UploadManager: any;
    // UploadHandler has a few runtime methods used by plugins; keep permissive any
    export interface UploadHandlerLike { upload?: (...args: any[]) => Promise<any>; cancel?: (id: any) => void; [k: string]: any }
    export const UploadHandler: UploadHandlerLike;
    export const ScrollerThin: any;
    export const ListScrollerThin: any;
    export const Menu: any;
    export const ContextMenuApi: any;
    export const MessageTypeSets: any;
    // Treat permissions as bigint-compatible to allow bit ops in code
    export type PermissionsBits = bigint | number | any;
    export const PermissionsBits: PermissionsBits;
    export const FluxDispatcher: any;
    // Provide a minimal class shape for Flux.Store so `extends Flux.Store` and
    // runtime instantiation `new SomeStore(FluxDispatcher, handlers)` type-check.
    export namespace Flux {
        class Store {
            constructor(dispatcher?: any, handlers?: Record<string, (...args: any[]) => any> | any);
            use?<R = any>(selector: (store: any) => R, deps?: unknown[], isEqual?: (old: R, newer: R) => boolean): R;
            emitChange?(...args: any[]): void;
            [k: string]: any;
        }
    }
    export const ComponentDispatch: any;
    export const IconUtils: any;
    export const ScrollerThin: any;
    export const Match: any;
    export const hljs: any;
    export const i18n: any;
    export const showToast: any;
    export const Toasts: any;
    export const openPluginModal: any;
    export const moment: any;
    export const Popout: any;
    export const Select: any;
    export const SearchableSelect: any;
    export const TabBar: any;
    export const Paginator: any;
    export const Card: any;

    // Stores / utilities
    export const MessageStore: {
        getMessages?: (channelId: string) => any;
        getMessage?: ((channelId: string, messageId: string) => any) | ((messageId: string) => any) | any;
        [k: string]: any;
    };
    // ChannelStore commonly returns objects indexed by id or arrays; be permissive
    export const ChannelStore: {
        getChannels?(): Record<string, any> | any[];
        getChannel?(id: string): any;
        availableTags?: Record<string, any> | any[];
        isForumLikeChannel?: (channel?: any) => boolean;
        [k: string]: any;
    };
    export const GuildStore: any;
    export const GuildMemberStore: any;
    export const GuildRoleStore: any;
    export const PermissionStore: any;
    export const ReadStateStore: any;
    export const RelationshipStore: any;
    export const UserStore: {
        getUser?(id: string): any;
        getUsers?(): Record<string, any> | any[];
        getCurrentUser?: () => any;
        getMember?: (guildId: string, userId: string) => any;
        getSortedRoles?: (guildId: string, userId: string) => string[] | undefined;
        [k: string]: any;
    };
    export const WindowStore: any;
    export const SelectedChannelStore: {
        // either an id or a channel object
        getChannelId?(): string | null;
        // sometimes called without args, sometimes with an id
        getChannel?(id?: string): any;
        [k: string]: any;
    };
    export const SelectedGuildStore: {
        getGuildId?(): string | null;
        [k: string]: any;
    };
    export const VoiceStateStore: {
        // runtime API may accept an optional guildId to filter voice states
        getVoiceStates?(guildId?: string): Record<string, any> | any[];
        [k: string]: any;
    };

    // Thread groups used in memberCount plugin
    export type ThreadGroup = { sectionId?: string; userIds?: string[]; [k: string]: any };
    export const ThemeStore: any;
    export const PermissionStore: any;
    export const MessageActions: any;
    export const InviteActions: any;
    export const ChannelActionCreators: any;
    export const ComponentDispatch: any;
    export const NavigationRouter: any;
    export const ChannelRouter: any;
    export const SettingsRouter: any;
    export const UserProfileStore: any;
    export const UserProfileActions: any;
    export const UserSettingsActionCreators: any;
    export const UserSummaryItem: any;
    export const OAuth2AuthorizeModal: any;
    export const showToastLazy: any;
    export const Constants: any;
    export const RestAPI: any;
    export const PermissionStore: any;
    export const i18n: any;
    export const SnowflakeUtils: any;
    export const IconUtils: any;
    // Treat permissions as bigint-compatible to allow bit ops in code
    export type PermissionsBits = bigint | number | any;
    export const PermissionsBits: Record<string, bigint> | any;
    export const FluxDispatcher: any;
    export const useStateFromStores: any;
    export const zustandCreate: any;
    export const zustandPersist: any;
    export const Button: any;
    export const Flux: any;

    // Small UI runtime helper commonly referenced
    export const createRoot: any;
    export const ApplicationAssetUtils: any;
    export const ExpressionPickerStore: any;

    // Generic match helper used in code with .returnType generics
    // Provide a minimal generic signature so callsites can use .returnType<...>()
    export function match<T = any>(value?: any): {
        returnType<U = any>(): U;
        // keep permissive members for chaining
        [k: string]: any;
    };
}
