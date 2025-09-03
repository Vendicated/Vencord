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

import { readFileSync, writeFileSync } from "fs";
import { BigIntLiteral, createSourceFile, Identifier, isCallExpression, isIdentifier, isObjectLiteralExpression, isPropertyAssignment, isSatisfiesExpression, isVariableStatement, NamedDeclaration, ObjectLiteralExpression, ScriptTarget, StringLiteral } from "typescript";

interface Dev {
    name: string;
    id: string;
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

(async () => {
    parseDevs();
    parseEquicordDevs();

    const allDevs = {
        vencord: devs,
        equicord: equicordDevs,
    };

    const data = JSON.stringify(allDevs, null, 2);
    if (process.argv.length > 2) {
        writeFileSync(process.argv[2], data);
    } else {
        console.log(data);
    }
})();
