/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// eslint-disable-next-line import/no-relative-packages
import type * as Vencord from "../../../../src/Vencord.ts";

export namespace CR {
    export interface ChangeReport {
        deps: DependenciesReport[];
        src: SrcFileReport[];
    }

    export type FileReport = DependenciesReport | SrcFileReport;

    interface FileReportBase {
        filePath: string;
        fileName: string;
        /** Error that caused the report to be returned early. */
        fileError?: string | undefined;
        /** Contains warnings not specific to any dependency or declaration. */
        fileWarns: string[];
    }

    export interface DependenciesReport extends FileReportBase {
        /** Contains reports that passed with no warns and no error. */
        passed: DependencyReport<false>[];
        /** Contains reports that passed with warns and no error. */
        warned: DependencyReport<false>[];
        /** Contains reports that failed with no error and maybe warns. */
        failed: DependencyReport<false>[];
        /** Contains reports that have an error. */
        errored: DependencyReport<true>[];
    }

    export interface DependencyReport<Errored extends boolean = boolean> {
        /** The name of the dependency. */
        name: string;
        /** The version of the dependency in `package.json`. */
        packageVersionRange: Errored extends true ? string | undefined : string;
        /** The version of the dependency bundled with Discord. */
        discordVersion: Errored extends true ? string | undefined : string;
        /**
         * The matched version range from the `overrides` property of {@link DependencyConfig}
         * or, if none matched, the version of the dependency bundled with Discord.
         */
        expectedVersionRange: Errored extends true ? string | undefined : string;
        /** Error that caused the report to return early. */
        error: Errored extends true ? string : undefined;
        warns: string[];
    }

    export interface SrcFileReport extends FileReportBase {
        /** Contains reports that have no changes, no warns, and no error. */
        unchanged: DeclarationReport<false>[];
        /** Contains reports that have warns, no changes, and no error. */
        warned: DeclarationReport<false>[];
        /** Contains reports that have changes, maybe warns, and no error. */
        changed: DeclarationReport<false>[];
        /** Contains reports that have an error. */
        errored: DeclarationReport<true>[];
    }

    export type DeclarationReport<Errored extends boolean = boolean>
        = ClassReport<Errored> | EnumReport<Errored>;

    interface DeclarationReportBase<Errored extends boolean = boolean> {
        type: string;
        /** The declaration's identifier. */
        identifier: string;
        changes: Errored extends true ? undefined : object;
        /** Error that caused the report to return early. */
        error: Errored extends true ? string : undefined;
        warns: string[];
    }

    export interface ClassReport<Errored extends boolean = boolean> extends DeclarationReportBase<Errored> {
        type: "class";
        identifier: string;
        changes: Errored extends true ? undefined : ClassChanges;
    }

    export interface EnumReport<Errored extends boolean = boolean> extends DeclarationReportBase<Errored> {
        type: "enum";
        identifier: string;
        changes: Errored extends true ? undefined : EnumChanges;
    }

    export interface ReporterConfig {
        /** The directory file paths are relative to. */
        rootDir: string;
        deps?: { [filePath: string]: DependenciesConfig; } | undefined;
        src?: { [filePath: string]: SrcFileConfig; } | undefined;
    }

    export interface DependenciesConfig {
        [dependencyName: string]: DependencyConfig;
    }

    export interface DependencyConfig {
        /**
         * @returns The version of the dependency bundled with Discord or undefined if the version could not be found.
         */
        find: FindFunction<[], string>;
        /**
         * Specifies the version range to expect in `package.json` given the version bundled with Discord.
         */
        overrides?: [discordVersionRange: string, packageVersionRange: string][] | undefined;
    }

    export interface SrcFileConfig {
        [identifier: string]: DeclarationConfig;
    }

    export type DeclarationConfig = ClassConfig | EnumConfig;

    interface DeclarationConfigBase {
        type: string;
        find?: FindFunction | undefined;
    }

    export interface ClassConfig extends DeclarationConfigBase {
        type: "class";
        /**
         * An automatic find will be performed if omitted.
         * If multiple classes are returned, their members will be merged.
         * @param source The source class.
         * @returns The class or undefined if it could not be found.
         */
        // https://github.com/microsoft/TypeScript/issues/20007
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        find?: FindFunction<[source: ClassMembers], Function[] | Function> | undefined;
        /** Whether to include optional class members. */
        includeOptional?: boolean | undefined;
        /** Members expected to be added. */
        ignoredAdditions?: { [Key in keyof ClassMembers]?: ClassMembers[Key] | undefined; } | undefined;
        /**
         * Members expected to be removed.
         * If a category is `true`, all members in that category will be expected to be removed.
         */
        ignoredRemovals?: { [Key in keyof ClassMembers]?: ClassMembers[Key] | boolean | undefined; } | undefined;
    }

    export interface EnumConfig extends DeclarationConfigBase {
        type: "enum";
        /**
         * An automatic find will be performed if omitted.
         * @param source The source enum.
         * @returns The enum or undefined if it could not be found.
         */
        find?: FindFunction<[source: EnumSource], EnumMembers> | undefined;
        /**
         * Mapper function to modifiy the source enum's keys.
         * Ignored additions and removals will not be modified by this function.
         */
        keyMapper?: ((key: string) => string) | undefined;
        /** Members expected to be added. */
        ignoredAdditions?: [key: string, value: string | number][] | undefined;
        /** Members expected to be removed. */
        ignoredRemovals?: [key: string, value?: string | number | undefined][] | undefined;
    }

    export type FindFunction<Args extends unknown[] = any[], Return = unknown>
        = (this: typeof Vencord, ...args: Args) =>
            Promise<Return | undefined> | Return | undefined;

    export type DeclarationChanges = ClassChanges | EnumChanges;

    interface DeclarationChangesBase {
        additions: object;
        removals: object;
        /** The number of added/removed members. */
        unchangedCount: number;
        /** The number of added/removed members. */
        changedCount: number;
    }

    export interface ClassChanges extends DeclarationChangesBase {
        additions: ClassMembers;
        removals: ClassMembers;
    }

    export interface ClassMembers {
        /** Whether the class has a constructor definition with parameters. */
        constructorDefinition: boolean;
        staticMethodsAndFields: string[];
        staticGetters: string[];
        staticSetters: string[];
        methods: string[];
        getters: string[];
        setters: string[];
        fields: string[];
    }

    export interface Class {
        /** Constructor function */
        new (...args: never): unknown;
        /** Static members */
        [key: PropertyKey]: unknown;
        /** Instance methods and accessors */
        readonly prototype: Record<PropertyKey, unknown>;
    }

    export interface EnumChanges extends DeclarationChangesBase {
        additions: EnumMembers;
        removals: EnumMembers;
    }

    export type EnumMembers = Record<string, unknown>;

    export type EnumSource = Record<string, number> | Record<string, string>;

    /** Excludes heterogeneous enums. */
    export type Enum = NumericEnum | StringEnum;

    /** Numeric enums have reverse mapping. */
    export type NumericEnum
        = { readonly [key: string]: number; }
        & { readonly [value: number]: string; };

    /** String enums do not have reverse mapping. */
    export interface StringEnum {
        readonly [key: string]: string;
    }
}
