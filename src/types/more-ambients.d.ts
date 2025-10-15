// Misc ambient shims for commonly-missing runtime modules referenced in the codebase.
declare module "@vencord/discord-types" {
    export type CommandArgument = any;
    export type CommandContext = any;
    export type CommandOption = any;
    export const Text: any;
    export const Button: any;
    export type ButtonProps = any;
    export const Argument: any;
    export const useToken: any;
    export const webpack: any;
    const _default: unknown;
    export default _default;
}

declare module "@components/index" {
    export const FolderIcon: any;
    export const GithubIcon: any;
    export const LogIcon: any;
    export const PaintbrushIcon: any;
    export const RestartIcon: any;
    export const openPluginModal: any;
}

declare module "Vencord" {
    export const Settings: any;
    export const VencordNative: any;
}

declare module "plugins" {
    const _default: any;
    export default _default;
}

declare module "@utils/constants" {
    // Common named exports used across the codebase
    export const Devs: any;
    export const EquicordDevs: any;
    export const IS_MAC: boolean;
    export const IS_LINUX: boolean;
    export const IS_WINDOWS: boolean;
    export const DevsById: Record<string, any>;
    export const DONOR_ROLE_ID: string;
    export const VENCORD_GUILD_ID: string;
    export const SUPPORT_CATEGORY_ID: string;
    export const SUPPORT_CHANNEL_ID: string;
    export const VENBOT_USER_ID: string;
    export const CONTRIB_ROLE_ID: string;
    export const REGULAR_ROLE_ID: string;
    export const KNOWN_ISSUES_CHANNEL_ID: string;

    const _default_2: unknown;
    export default _default_2;
}

declare module "nanoid" {
    export function nanoid(size?: number): string;
}

declare module "@intrnl/xxhash64" {
    // Prefer bigint results to avoid number|bigint unions in callsites
    export function hash(input: string | Uint8Array | ArrayBuffer): bigint;
}

declare module "webpack" {
    export type AnyModuleFactory = any;
    export const Common: any;
    const _default_3: unknown;
    export default _default_3;
}
