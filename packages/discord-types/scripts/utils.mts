/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

type EnvConfig = Record<string, RegExp | [string, ...string[]] | [...string[], string] | boolean>;

type ValidEnv<Config extends EnvConfig> = NodeJS.ProcessEnv & {
    [Key in keyof Config as false extends Config[Key]
        ? never
        : Key
    ]: Config[Key] extends string[]
        ? Config[Key][number]
        : string;
} & Partial<Record<keyof Config, string>>;

export function assertEnvValidity<const Config extends EnvConfig>(
    env: NodeJS.ProcessEnv,
    config: Config
): asserts env is ValidEnv<Config> {
    const errors: string[] = [];

    for (const key in config) {
        const varValue = env[key];
        const varConfig = config[key]!;

        if (varValue === undefined) {
            if (varConfig)
                errors.push(`TypeError: A value must be provided for required environment variable '${key}'.`);
        } else if (Array.isArray(varConfig)) {
            if (!varConfig.includes(varValue))
                errors.push(`RangeError: The value provided for environment variable '${key}' must be one of ${formatChoices(varConfig)}.`);
        } else if (typeof varConfig === "object" && !varConfig.test(varValue))
            errors.push(`RangeError: The value provided for environment variable '${key}' must match ${varConfig}.`);
    }

    if (errors.length > 0) {
        for (const error of errors)
            console.error(error);
        process.exit(1);
    }
}

function formatChoices(choices: string[]) {
    const quotedChoices = choices.map(c => `'${c}'`);
    if (choices.length < 3)
        return quotedChoices.join(" or ");
    const lastChoice = quotedChoices.pop()!;
    return quotedChoices.join(", ") + ", or " + lastChoice;
}
