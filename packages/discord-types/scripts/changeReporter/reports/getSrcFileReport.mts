/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { AST_NODE_TYPES, parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import type { Page } from "puppeteer-core";

import type { CR } from "../types.mts";
import { getClassReport } from "./getClassReport.mjs";
import { getEnumReport } from "./getEnumReport.mjs";

export async function getSrcFileReport(page: Page, filePath: string, config: CR.SrcFileConfig) {
    const fileName = basename(filePath);
    const fileReport: CR.SrcFileReport = {
        filePath,
        fileName,
        fileWarns: [],
        unchanged: [],
        warned: [],
        changed: [],
        errored: []
    };

    let ast: TSESTree.Program;
    try {
        ast = parse(await readFile(filePath, "utf-8"));
    } catch (error) {
        fileReport.fileError = `Failed to read and parse '${fileName}':\n` + error;
        return fileReport;
    }

    const unfoundDeclarations = new Set(Object.keys(config));
    const reports: Promise<CR.DeclarationReport>[] = [];
    for (const node of ast.body) {
        if (unfoundDeclarations.size <= 0) break;

        const declaration = node.type === AST_NODE_TYPES.ExportNamedDeclaration
            ? node.declaration
            : node;
        if (!declaration) continue;

        switch (declaration.type) {
            case AST_NODE_TYPES.ClassDeclaration: {
                const { id } = declaration;
                if (!id) continue;

                const { name } = id;
                const declarationConfig = config[name];
                if (!declarationConfig) continue;

                unfoundDeclarations.delete(name);
                reports.push(getClassReport(
                    page,
                    // @ts-expect-error: Control flow narrowing bug
                    declaration,
                    declarationConfig
                ));
                break;
            }
            case AST_NODE_TYPES.TSEnumDeclaration: {
                const { name } = declaration.id;
                const declarationConfig = config[name];
                if (!declarationConfig) continue;

                unfoundDeclarations.delete(name);
                reports.push(getEnumReport(
                    page,
                    declaration,
                    declarationConfig
                ));
                break;
            }
        }
    }

    for (const report of await Promise.all(reports)) {
        if (report.error !== undefined) {
            fileReport.errored.push(report);
        } else {
            const { changes } = report;
            if (changes!.changedCount > 0)
                fileReport.changed.push(report);
            else if (report.warns.length > 0)
                fileReport.warned.push(report);
            else
                fileReport.unchanged.push(report);
        }
    }

    for (const identifier of unfoundDeclarations)
        fileReport.errored.push({
            type: config[identifier]!.type,
            identifier,
            changes: undefined,
            error: `File '${fileName}' does not have a declaration with identifier '${identifier}'.`,
            warns: []
        });

    return fileReport;
}
