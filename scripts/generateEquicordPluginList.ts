/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Dirent, readdirSync, readFileSync, writeFileSync } from "fs";
import { access, readFile } from "fs/promises";
import { join, sep } from "path";
import { normalize as posixNormalize, sep as posixSep } from "path/posix";
import { BigIntLiteral, createSourceFile, Identifier, isArrayLiteralExpression, isCallExpression, isExportAssignment, isIdentifier, isObjectLiteralExpression, isPropertyAccessExpression, isPropertyAssignment, isSatisfiesExpression, isStringLiteral, isVariableStatement, NamedDeclaration, NodeArray, ObjectLiteralExpression, PropertyAssignment, ScriptTarget, StringLiteral, SyntaxKind } from "typescript";

import { getPluginTarget } from "./utils.mjs";

interface Dev {
    name: string;
    id: string;
}

interface Command {
    name: string;
    description: string;
}

interface PluginData {
    name: string;
    description: string;
    tags: string[];
    authors: Dev[];
    dependencies: string[];
    hasPatches: boolean;
    hasCommands: boolean;
    commands: Command[];
    required: boolean;
    enabledByDefault: boolean;
    target: "discordDesktop" | "vesktop" | "equibop" | "desktop" | "web" | "dev";
    filePath: string;
    dirName: string;
}

const devs = {} as Record<string, Dev>;
const equicordDevs = {} as Record<string, Dev>;

function getName(node: NamedDeclaration) {
    return node.name && isIdentifier(node.name) ? node.name.text : undefined;
}

function hasName(node: NamedDeclaration, name: string) {
    return getName(node) === name;
}

function getObjectProp(node: ObjectLiteralExpression, name: string) {
    const prop = node.properties.find(p => hasName(p, name));
    if (prop && isPropertyAssignment(prop)) return prop.initializer;
    return prop;
}

function parseDevs() {
    const file = createSourceFile("constants.ts", readFileSync("src/utils/constants.ts", "utf8"), ScriptTarget.Latest);

    for (const child of file.getChildAt(0).getChildren()) {
        if (!isVariableStatement(child)) continue;

        const devsDeclaration = child.declarationList.declarations.find(d => hasName(d, "Devs"));
        if (!devsDeclaration?.initializer || !isCallExpression(devsDeclaration.initializer)) continue;

        const value = devsDeclaration.initializer.arguments[0];

        if (!isSatisfiesExpression(value) || !isObjectLiteralExpression(value.expression)) throw new Error("Failed to parse devs: not an object literal");

        for (const prop of value.expression.properties) {
            const name = (prop.name as Identifier).text;
            const value = isPropertyAssignment(prop) ? prop.initializer : prop;

            if (!isObjectLiteralExpression(value)) throw new Error(`Failed to parse devs: ${name} is not an object literal`);

            devs[name] = {
                name: (getObjectProp(value, "name") as StringLiteral).text,
                id: (getObjectProp(value, "id") as BigIntLiteral).text.slice(0, -1)
            };
        }

        return;
    }

    throw new Error("Could not find Devs constant");
}

function parseEquicordDevs() {
    const file = createSourceFile("constants.ts", readFileSync("src/utils/constants.ts", "utf8"), ScriptTarget.Latest);

    for (const child of file.getChildAt(0).getChildren()) {
        if (!isVariableStatement(child)) continue;

        const devsDeclaration = child.declarationList.declarations.find(d => hasName(d, "EquicordDevs"));
        if (!devsDeclaration?.initializer || !isCallExpression(devsDeclaration.initializer)) continue;

        const value = devsDeclaration.initializer.arguments[0];

        if (!isSatisfiesExpression(value) || !isObjectLiteralExpression(value.expression)) throw new Error("Failed to parse EquicordDevs: not an object literal");

        for (const prop of value.expression.properties) {
            const name = (prop.name as Identifier).text;
            const value = isPropertyAssignment(prop) ? prop.initializer : prop;

            if (!isObjectLiteralExpression(value)) throw new Error(`Failed to parse EquicordDevs: ${name} is not an object literal`);

            equicordDevs[name] = {
                name: (getObjectProp(value, "name") as StringLiteral).text,
                id: (getObjectProp(value, "id") as BigIntLiteral).text.slice(0, -1)
            };
        }

        return;
    }

    throw new Error("Could not find EquicordDevs constant");
}

async function parseFile(fileName: string) {
    const file = createSourceFile(fileName, await readFile(fileName, "utf8"), ScriptTarget.Latest);

    const fail = (reason: string) => {
        return new Error(`Invalid plugin ${fileName}, because ${reason}`);
    };

    for (const node of file.getChildAt(0).getChildren()) {
        if (!isExportAssignment(node) || !isCallExpression(node.expression)) continue;

        const call = node.expression;
        if (!isIdentifier(call.expression) || call.expression.text !== "definePlugin") continue;

        const pluginObj = node.expression.arguments[0];
        if (!isObjectLiteralExpression(pluginObj)) throw fail("no object literal passed to definePlugin");

        const data = {
            hasPatches: false,
            hasCommands: false,
            enabledByDefault: false,
            required: false,
            tags: [] as string[]
        } as PluginData;

        for (const prop of pluginObj.properties) {
            const key = getName(prop);
            const value = isPropertyAssignment(prop) ? prop.initializer : prop;

            switch (key) {
                case "name":
                case "description":
                    if (!isStringLiteral(value)) throw fail(`${key} is not a string literal`);
                    data[key] = value.text;
                    break;
                case "patches":
                    data.hasPatches = true;
                    break;
                case "commands":
                    data.hasCommands = true;
                    if (isArrayLiteralExpression(value)) {
                        data.commands = value.elements.map((e) => {
                            if (isObjectLiteralExpression(e)) {
                                const nameProperty = e.properties.find((p): p is PropertyAssignment =>
                                    isPropertyAssignment(p) && isIdentifier(p.name) && p.name.escapedText === "name"
                                );
                                const descriptionProperty = e.properties.find((p): p is PropertyAssignment =>
                                    isPropertyAssignment(p) && isIdentifier(p.name) && p.name.escapedText === "description"
                                );
                                if (!nameProperty || !descriptionProperty) throw fail("command missing required properties");
                                const name = isStringLiteral(nameProperty.initializer) ? nameProperty.initializer.text : "";
                                const description = isStringLiteral(descriptionProperty.initializer) ? descriptionProperty.initializer.text : "";
                                return { name, description };
                            } else if (isCallExpression(e) && isIdentifier(e.expression)) {
                                const [nameArg] = e.arguments;
                                if (!isStringLiteral(nameArg)) throw fail("first argument must be a string");
                                return { name: nameArg.text, description: "" };
                            } else if (e.kind === SyntaxKind.SpreadElement) {
                                return undefined;
                            }
                            throw fail("commands array contains invalid elements");
                        }).filter((c): c is { name: string; description: string; } => Boolean(c)) as Command[];
                    } else if (isIdentifier(value)) {
                        data.commands = [];
                    } else {
                        throw fail("commands is not an array literal or identifier");
                    }
                    break;
                case "authors":
                    if (!isArrayLiteralExpression(value)) throw fail("authors is not an array literal");
                    data.authors = value.elements.map(e => {
                        if (!isPropertyAccessExpression(e)) throw fail("authors array contains non-property access expressions");
                        const d = devs[getName(e)!] || equicordDevs[getName(e)!];
                        if (!d) throw fail(`couldn't look up author ${getName(e)}`);
                        return d;
                    });
                    break;
                case "tags":
                    if (!isArrayLiteralExpression(value)) throw fail("tags is not an array literal");
                    data.tags = value.elements.map(e => {
                        if (!isStringLiteral(e)) throw fail("tags array contains non-string literals");
                        return e.text;
                    });
                    break;
                case "dependencies":
                    if (!isArrayLiteralExpression(value)) throw fail("dependencies is not an array literal");
                    const { elements } = value;
                    if (elements.some(e => !isStringLiteral(e))) throw fail("dependencies array contains non-string elements");
                    data.dependencies = (elements as NodeArray<StringLiteral>).map(e => e.text);
                    break;
                case "required":
                case "enabledByDefault":
                    data[key] = value.kind === SyntaxKind.TrueKeyword;
                    break;
            }
        }

        if (!data.name || !data.description || !data.authors) throw fail("name, description or authors are missing");

        const target = getPluginTarget(fileName);
        if (target) {
            if (!["web", "discordDesktop", "vencordDesktop", "equibop", "desktop", "dev"].includes(target)) throw fail(`invalid target ${target}`);
            data.target = target as any;
        }

        data.filePath = posixNormalize(fileName)
            .split(sep)
            .join(posixSep)
            .replace(/\/index\.([jt]sx?)$/, "");

        data.dirName = posixNormalize(fileName)
            .split(sep)
            .join(posixSep)
            .replace(/\/index\.([jt]sx?)$/, "")
            .replace(/^src\/equicordplugins\//, "");

        return [data] as const;
    }

    throw fail("no default export called 'definePlugin' found");
}

async function getEntryPoint(dir: string, dirent: Dirent) {
    const base = join(dir, dirent.name);
    if (!dirent.isDirectory()) return base;

    for (const name of ["index.ts", "index.tsx"]) {
        const full = join(base, name);
        try {
            await access(full);
            return full;
        } catch { }
    }

    throw new Error(`${dirent.name}: Couldn't find entry point`);
}

function isPluginFile({ name }: { name: string; }) {
    if (name === "index.ts") return false;
    return !name.startsWith("_") && !name.startsWith(".");
}

(async () => {
    parseDevs();
    parseEquicordDevs();

    const plugins = [] as PluginData[];

    await Promise.all(["src/equicordplugins"].flatMap(dir =>
        readdirSync(dir, { withFileTypes: true })
            .filter(isPluginFile)
            .map(async dirent => {
                const [data] = await parseFile(await getEntryPoint(dir, dirent));
                plugins.sort().push(data);
            })
    ));

    const data = JSON.stringify(plugins);

    if (process.argv.length > 2) {
        writeFileSync(process.argv[2], data);
    } else {
        console.log(data);
    }
})();
