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

import { type Dirent, readdirSync, readFileSync, writeFileSync } from "fs";
import { access, readFile } from "fs/promises";
import { join, sep } from "path";
import { normalize as posixNormalize, sep as posixSep } from "path/posix";
// import { type BigIntLiteral, createSourceFile, type Identifier, isArrayLiteralExpression, isCallExpression, isExportAssignment, isIdentifier, isObjectLiteralExpression, isPropertyAccessExpression, isPropertyAssignment, isSatisfiesExpression, isStringLiteral, isVariableStatement, type NamedDeclaration, type NodeArray, type ObjectLiteralExpression, ScriptTarget, type StringLiteral, SyntaxKind } from "typescript";
// Workaround to avoid `The requested module 'typescript' does not provide an export named *`
import ts from "typescript";

import { getPluginTarget } from "./utils.mjs";

interface Dev {
    name: string;
    id: string;
}

interface PluginData {
    name: string;
    description: string;
    tags: string[];
    authors: Dev[];
    dependencies: string[];
    hasPatches: boolean;
    hasCommands: boolean;
    required: boolean;
    enabledByDefault: boolean;
    target: "discordDesktop" | "vencordDesktop" | "web" | "dev";
    filePath: string;
}

const devs: Record<string, Dev> = {};

function getName(node: ts.NamedDeclaration) {
    return node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
}

function hasName(node: ts.NamedDeclaration, name: string) {
    return getName(node) === name;
}

function getObjectProp(node: ts.ObjectLiteralExpression, name: string) {
    const prop = node.properties.find(p => hasName(p, name));
    if (prop && ts.isPropertyAssignment(prop)) return prop.initializer;
    return prop;
}

function parseDevs() {
    const file = ts.createSourceFile(
        "constants.ts",
        readFileSync("src/utils/constants.ts", "utf8"),
        ts.ScriptTarget.Latest
    );

    for (const child of file.getChildAt(0).getChildren()) {
        if (!ts.isVariableStatement(child)) continue;

        const devsDeclaration = child.declarationList.declarations.find(d => hasName(d, "Devs"));
        if (!devsDeclaration?.initializer || !ts.isCallExpression(devsDeclaration.initializer)) continue;

        const value = devsDeclaration.initializer.arguments[0]!;

        if (!ts.isSatisfiesExpression(value) || !ts.isObjectLiteralExpression(value.expression))
            throw new Error("Failed to parse devs: not an object literal");

        for (const prop of value.expression.properties) {
            const name = (prop.name as ts.Identifier).text;
            const value = ts.isPropertyAssignment(prop) ? prop.initializer : prop;

            if (!ts.isObjectLiteralExpression(value))
                throw new Error(`Failed to parse devs: ${name} is not an object literal`);

            devs[name] = {
                name: (getObjectProp(value, "name") as ts.StringLiteral).text,
                id: (getObjectProp(value, "id") as ts.BigIntLiteral).text.slice(0, -1)
            };
        }

        return;
    }

    throw new Error("Could not find Devs constant");
}

async function parseFile(fileName: string) {
    const file = ts.createSourceFile(fileName, await readFile(fileName, "utf8"), ts.ScriptTarget.Latest);

    const fail = (reason: string) =>
        new Error(`Invalid plugin ${fileName}, because ${reason}`);

    for (const node of file.getChildAt(0).getChildren()) {
        if (!ts.isExportAssignment(node) || !ts.isCallExpression(node.expression)) continue;

        const call = node.expression;
        if (!ts.isIdentifier(call.expression) || call.expression.text !== "definePlugin") continue;

        const pluginObj = node.expression.arguments[0]!;
        if (!ts.isObjectLiteralExpression(pluginObj))
            throw fail("no object literal passed to definePlugin");

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const data = {
            hasPatches: false,
            hasCommands: false,
            enabledByDefault: false,
            required: false,
            tags: [] as string[]
        } as PluginData;

        for (const prop of pluginObj.properties) {
            const key = getName(prop);
            const value = ts.isPropertyAssignment(prop) ? prop.initializer : prop;

            switch (key) {
                case "name":
                case "description":
                    if (!ts.isStringLiteral(value))
                        throw fail(`${key} is not a string literal`);
                    data[key] = value.text;
                    break;
                case "patches":
                    data.hasPatches = true;
                    break;
                case "commands":
                    data.hasCommands = true;
                    break;
                case "authors":
                    if (!ts.isArrayLiteralExpression(value))
                        throw fail("authors is not an array literal");
                    data.authors = value.elements.map(e => {
                        if (!ts.isPropertyAccessExpression(e))
                            throw fail("authors array contains non-property access expressions");
                        const d = devs[getName(e)!];
                        if (!d) throw fail(`couldn't look up author ${getName(e)}`);
                        return d;
                    });
                    break;
                case "tags":
                    if (!ts.isArrayLiteralExpression(value))
                        throw fail("tags is not an array literal");
                    data.tags = value.elements.map(e => {
                        if (!ts.isStringLiteral(e))
                            throw fail("tags array contains non-string literals");
                        return e.text;
                    });
                    break;
                case "dependencies":
                    if (!ts.isArrayLiteralExpression(value))
                        throw fail("dependencies is not an array literal");
                    const { elements } = value;
                    if (elements.some(e => !ts.isStringLiteral(e)))
                        throw fail("dependencies array contains non-string elements");
                    data.dependencies = (elements as ts.NodeArray<ts.StringLiteral>).map(e => e.text);
                    break;
                case "required":
                case "enabledByDefault":
                    data[key] = value.kind === ts.SyntaxKind.TrueKeyword;
                    break;
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!data.name || !data.description || !data.authors)
            throw fail("name, description or authors are missing");

        const target = getPluginTarget(fileName);
        if (target) {
            if (!["web", "discordDesktop", "vencordDesktop", "desktop", "dev"].includes(target))
                throw fail(`invalid target ${target}`);
            data.target = target as any;
        }

        data.filePath = posixNormalize(fileName)
            .split(sep)
            .join(posixSep)
            .replace(/\/index\.([jt]sx?)$/, "")
            .replace(/^src\/plugins\//, "");

        let readme = "";
        try {
            readme = readFileSync(join(fileName, "..", "README.md"), "utf-8");
        } catch { }
        return [data, readme] as const;
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

parseDevs();

const plugins: PluginData[] = [];
const readmes: Record<string, string> = {};

await Promise.all(["src/plugins", "src/plugins/_core"].flatMap(dir =>
    readdirSync(dir, { withFileTypes: true })
        .filter(isPluginFile)
        .map(async dirent => {
            const [data, readme] = await parseFile(await getEntryPoint(dir, dirent));
            plugins.push(data);
            if (readme) readmes[data.name] = readme;
        })
));

const data = JSON.stringify(plugins);

if (process.argv.length > 3) {
    writeFileSync(process.argv[2]!, data);
    writeFileSync(process.argv[3]!, JSON.stringify(readmes));
} else {
    console.log(data);
}
