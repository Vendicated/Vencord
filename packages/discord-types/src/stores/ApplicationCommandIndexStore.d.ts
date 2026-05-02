import { Application, Channel, FluxStore } from "..";
import { CommandArgument, CommandContext } from "../common/messages/Commands";
import {
    ApplicationCommandHandlerType,
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    ApplicationCommandPermissionType,
    ApplicationCommandSectionType,
    ApplicationCommandType,
    ApplicationIntegrationType,
    ChannelType,
    InteractionContextType
} from "../../enums";

/** Score method for ranking command results. */
export type ApplicationCommandScoreMethod =
    | "none"
    | "application_only"
    | "command_only"
    | "command_or_application";

/** Built-in command handling mode. */
export type BuiltInCommandMode =
    | "allow"
    | "deny"
    | "only_text";

/** Target for fetching guild command index. */
export interface ApplicationCommandIndexGuildTarget {
    type: "guild";
    guildId: string;
}

/** Target for fetching channel command index. */
export interface ApplicationCommandIndexChannelTarget {
    type: "channel";
    channelId: string;
}

/** Target for fetching user command index. */
export interface ApplicationCommandIndexUserTarget {
    type: "user";
}

/** Target for fetching application-specific command index. */
export interface ApplicationCommandIndexApplicationTarget {
    type: "application";
    applicationId: string;
}

/** Union of all fetch target types. */
export type ApplicationCommandIndexFetchTarget =
    | ApplicationCommandIndexGuildTarget
    | ApplicationCommandIndexChannelTarget
    | ApplicationCommandIndexUserTarget
    | ApplicationCommandIndexApplicationTarget;

/** Context for querying commands with a channel. */
export interface ApplicationCommandChannelContext {
    type: "channel";
    channel: Channel;
}

/** Context for querying commands without a channel. */
export interface ApplicationCommandContextlessContext {
    type: "contextless";
}

/** Union of query context types. */
export type ApplicationCommandContext =
    | ApplicationCommandChannelContext
    | ApplicationCommandContextlessContext;

/** Fetch state when not fetching. */
export interface ApplicationCommandIndexFetchStateIdle {
    fetching: false;
    retryAfter?: number;
}

/** Fetch state when actively fetching. */
export interface ApplicationCommandIndexFetchStateFetching {
    fetching: true;
    abort: AbortController;
    promise: Promise<void>;
}

/** Union of fetch state types. */
export type ApplicationCommandIndexFetchState =
    | ApplicationCommandIndexFetchStateIdle
    | ApplicationCommandIndexFetchStateFetching;

/** Result of a successful command index fetch. */
export interface ApplicationCommandIndexResult {
    /** Command sections keyed by application ID. */
    sections: Record<string, ApplicationCommandSection>;
    /** Maps bot user ID to application ID. */
    sectionIdsByBotId: Record<string, string>;
    /** Version symbol for cache invalidation. */
    version: symbol;
}

/** State for a command index entry. */
export interface ApplicationCommandIndexState {
    /** Server version symbol for staleness detection. */
    serverVersion: symbol;
    /** Current fetch state. */
    fetchState: ApplicationCommandIndexFetchState;
    /** Fetched result, if available. */
    result?: ApplicationCommandIndexResult;
}

/** A section containing commands from a single application. */
export interface ApplicationCommandSection {
    /** Section descriptor with application info. */
    descriptor: ApplicationCommandSectionDescriptor;
    /** Commands keyed by command ID. */
    commands: Record<string, ApplicationCommand>;
}

/** Descriptor for a command section. */
export interface ApplicationCommandSectionDescriptor {
    /** Section ID, typically the application ID or a special value like "-1" for built-in. */
    id: string;
    /** Section type. */
    type: ApplicationCommandSectionType;
    /** Display name for the section. */
    name: string;
    /** Application icon hash. */
    icon?: string | null;
    /** Full application object for application sections. */
    application?: Application;
    /** Whether this is a user-installed app. */
    isUserApp?: boolean;
    /** Bot user ID for this application. */
    botId?: string;
    /** Permissions for the application's commands. */
    permissions?: ApplicationCommandPermission[] | Record<string, ApplicationCommandPermission>;
}

/** Permission override for a command. */
export interface ApplicationCommandPermission {
    /** Type of permission target. */
    type: ApplicationCommandPermissionType;
    /** ID of the role, user, or channel. */
    id: string;
    /** Whether the target has permission to use the command. */
    permission: boolean;
}

/** Option for an application command. */
export interface ApplicationCommandOption {
    /** Option type. */
    type: ApplicationCommandOptionType;
    /** Option name. */
    name: string;
    /** Localized display name for the option. */
    displayName?: string;
    /** Localized option name from server. Bot commands only. */
    serverLocalizedName?: string;
    /** Option description. */
    description: string;
    /** Localized display description for the option. */
    displayDescription?: string;
    /** Localized option description from server. Bot commands only. */
    serverLocalizedDescription?: string;
    /** Whether this option is required. */
    required?: boolean;
    /** Choices for string/integer/number options. */
    choices?: ApplicationCommandOptionChoice[];
    /** Nested options for subcommands. */
    options?: ApplicationCommandOption[];
    /** Channel types allowed for channel options. */
    channel_types?: ChannelType[];
    /** Minimum value for number/integer options. */
    min_value?: number;
    /** Maximum value for number/integer options. */
    max_value?: number;
    /** Minimum length for string options. */
    min_length?: number;
    /** Maximum length for string options. */
    max_length?: number;
    /** Whether autocomplete is enabled. */
    autocomplete?: boolean;
}

/** Choice for a command option. */
export interface ApplicationCommandOptionChoice {
    /** Choice name. */
    name: string;
    /** Localized choice name, if available. */
    name_localized?: string;
    /** Choice value. */
    value: string | number;
}

/** Raw application command from the API. */
export interface RawApplicationCommand {
    id: string;
    application_id: string;
    version: string;
    guild_id?: string;
    type?: ApplicationCommandType;
    name: string;
    name_default?: string;
    name_localized?: string;
    description: string;
    description_default?: string;
    description_localized?: string;
    options?: ApplicationCommandOption[];
    default_member_permissions?: string | null;
    dm_permission?: boolean;
    nsfw?: boolean;
    contexts?: InteractionContextType[];
    integration_types?: ApplicationIntegrationType[];
    permissions?: ApplicationCommandPermission[];
    global_popularity_rank?: number;
    handler?: ApplicationCommandHandlerType;
}

/** Processed application command. */
export interface ApplicationCommand {
    /** Command version string. Bot commands only. */
    version?: string;
    /** Guild ID if guild-specific. Bot commands only. */
    guildId?: string;
    /** Composite command ID including subcommand path. */
    id: string;
    /** Original untranslated command name. */
    untranslatedName: string;
    /** Localized command name from server. Bot commands only. */
    serverLocalizedName?: string;
    /** Application ID. */
    applicationId: string;
    /** Command type. */
    type: ApplicationCommandType;
    /** Input type. */
    inputType: ApplicationCommandInputType;
    /** Original untranslated description. */
    untranslatedDescription: string;
    /** Command options. */
    options: ApplicationCommandOption[];
    /** Root command reference for subcommands. Bot commands only. */
    rootCommand?: RawApplicationCommand;
    /** Path of subcommand options for nested commands. Bot commands only. */
    subCommandPath?: ApplicationCommandOption[];
    /** Default member permissions required as bigint. Bot commands only. */
    defaultMemberPermissions?: bigint;
    /** Whether usable in DMs. Bot commands only. */
    dmPermission?: boolean;
    /** Command permissions. Bot commands only. */
    permissions?: ApplicationCommandPermission[] | Record<string, ApplicationCommandPermission>;
    /** Localized display name. */
    displayName: string;
    /** Localized display description. */
    displayDescription: string;
    /** Whether this is an NSFW command. Bot commands only. */
    nsfw?: boolean;
    /** Allowed interaction contexts. Bot commands only. */
    contexts?: InteractionContextType[];
    /** Integration types that can use this command. Bot commands only. */
    integration_types?: ApplicationIntegrationType[];
    /** Global popularity ranking. Bot commands only. */
    global_popularity_rank?: number;
    /** Handler type. Bot commands only. */
    handler?: ApplicationCommandHandlerType;
    /** Section descriptor for display purposes. */
    section?: ApplicationCommandSectionDescriptor;
    /** Score for search ranking. */
    score?: number;
    /** Predicate to check if command should be shown. Built-in commands only. */
    predicate?(ctx: CommandContext): boolean;
    /** Execute the command. Built-in commands only. */
    execute?(args: CommandArgument[], ctx: CommandContext): void;
}

/** Sectioned command group for display. */
export interface SectionedApplicationCommands {
    /** Section this group belongs to. */
    section: ApplicationCommandSectionDescriptor;
    /** Commands in this section. */
    data: ApplicationCommand[];
}

/** Filter options for querying commands. */
export interface ApplicationCommandQueryFilters {
    /** Command types to include. */
    commandTypes: ApplicationCommandType[];
    /** Search text. */
    text?: string;
    /** Built-in command handling mode. */
    builtIns?: BuiltInCommandMode;
    /** Whether to include application commands. */
    applicationCommands?: boolean;
}

/** Options for querying commands. */
export interface ApplicationCommandQueryOptions {
    /** Number of placeholder commands to show while loading. */
    placeholderCount?: number;
    /** Score method for ranking results. */
    scoreMethod?: ApplicationCommandScoreMethod;
    /** Whether to allow empty sections in results. */
    allowEmptySections?: boolean;
    /** Whether to allow fetching if needed. */
    allowFetch?: boolean;
    /** Whether to include application state. */
    allowApplicationState?: boolean;
    /** Specific application ID to query. */
    applicationId?: string;
    /** Sorting options. */
    sortOptions?: ApplicationCommandSortOptions;
    /** Whether to include install-on-demand apps. */
    installOnDemand?: boolean;
}

/** Sorting options for application command queries. */
export interface ApplicationCommandSortOptions {
    /** Sorting options for applications. */
    applications: ApplicationCommandSortConfig;
    /** Sorting options for commands. */
    commands: ApplicationCommandSortConfig;
}

/** Sort configuration for frecency and score. */
export interface ApplicationCommandSortConfig {
    /** Whether to use frecency for sorting. */
    useFrecency: boolean;
    /** Whether to use score for sorting. */
    useScore: boolean;
}

/** Result of a command query. */
export interface ApplicationCommandQueryResult {
    /** All section descriptors. */
    descriptors: ApplicationCommandSectionDescriptor[];
    /** Flat list of all commands. */
    commands: ApplicationCommand[];
    /** Commands grouped by section. */
    sectionedCommands: SectionedApplicationCommands[];
    /** Whether data is still loading. */
    loading: boolean;
}

/** Parameters for checking context state application. */
export interface ApplicationCommandContextStateParams {
    applicationId: string;
    channelId: string;
    guildId?: string;
}

/** Result of getting section info. */
export interface ApplicationCommandSectionInfo {
    /** Section descriptor. */
    descriptor?: ApplicationCommandSectionDescriptor;
    /** Commands in this section. */
    sectionCommands?: ApplicationCommand[];
    /** Whether installed in a guild. */
    isGuildInstalled: boolean;
    /** Whether installed for user. */
    isUserInstalled: boolean;
}

/**
 * Store for application command indexes.
 * Manages fetching, caching, and querying of slash commands and context menu commands.
 */
export class ApplicationCommandIndexStore extends FluxStore {
    /** Internal index cache keyed by guild/channel/user ID. */
    indices: Record<string, ApplicationCommandIndexState>;
    /**
     * Gets the command index state for the given context.
     * @param context Channel context or contextless context.
     * @returns Index state for the context.
     */
    getContextState(context: ApplicationCommandContext): ApplicationCommandIndexState;

    /**
     * Checks if an application has commands in the context state.
     * @param params Application and channel info.
     * @returns Whether the application has commands in context.
     */
    hasContextStateApplication(params: ApplicationCommandContextStateParams): boolean;

    /**
     * Gets the command index state for a guild.
     * @param guildId Guild ID.
     * @returns Index state for the guild.
     */
    getGuildState(guildId: string): ApplicationCommandIndexState;

    /**
     * Gets the command index state for the current user's installed apps.
     * @returns Index state for user-installed apps.
     */
    getUserState(): ApplicationCommandIndexState;

    /**
     * Checks if an application has commands in the user state.
     * @param applicationId Application ID.
     * @returns Whether the application has user commands.
     */
    hasUserStateApplication(applicationId: string): boolean;

    /**
     * Gets the command index state for a specific application.
     * @param applicationId Application ID.
     * @returns Index state for the application.
     */
    getApplicationState(applicationId: string): ApplicationCommandIndexState;

    /**
     * Gets all application index states.
     * @returns Map of application ID to index state.
     */
    getApplicationStates(): Map<string, ApplicationCommandIndexState>;

    /**
     * Checks if an application state exists.
     * @param applicationId Application ID.
     * @returns Whether the application state exists.
     */
    hasApplicationState(applicationId: string): boolean;

    /**
     * Queries commands based on context and filters.
     * @param context Channel or contextless context.
     * @param filters Query filters.
     * @param options Query options.
     * @returns Query result with commands and sections.
     */
    query(
        context: ApplicationCommandContext,
        filters: ApplicationCommandQueryFilters,
        options: ApplicationCommandQueryOptions
    ): ApplicationCommandQueryResult;

    /**
     * Queries for install-on-demand app commands.
     * @param applicationId Application ID.
     * @param channelId Channel ID.
     */
    queryInstallOnDemandApp(applicationId: string, channelId: string): void;
}
