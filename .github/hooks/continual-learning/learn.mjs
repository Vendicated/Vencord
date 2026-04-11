#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const EVENT = process.argv[2] ?? "";
const INPUT = readInput();
const GLOBAL_DB = path.join(os.homedir(), ".copilot", "learnings.db");
const LOCAL_DIR = path.join(process.cwd(), ".copilot-memory");
const LOCAL_DB = path.join(LOCAL_DIR, "learnings.db");

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});

function readInput() {
    try {
        return JSON.parse(readFileSync(0, "utf8") || "{}");
    } catch {
        return {};
    }
}

function main() {
    if (process.env.SKIP_CONTINUAL_LEARNING === "true") return;

    if (EVENT === "sessionStart") {
        handleSessionStart();
        return;
    }

    if (EVENT === "postToolUse") {
        handlePostToolUse();
        return;
    }

    if (EVENT === "sessionEnd") {
        handleSessionEnd();
        return;
    }

    console.error("Usage: learn.mjs <sessionStart|postToolUse|sessionEnd>");
    process.exitCode = 1;
}

function hasSqlite() {
    try {
        execFileSync("sqlite3", ["--version"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

function isGitRepo() {
    return existsSync(path.join(process.cwd(), ".git"));
}

function sqlEscape(value) {
    return String(value).replace(/'/g, "''");
}

function ensureDb(dbPath) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    execSql(
        dbPath,
        `
      CREATE TABLE IF NOT EXISTS learnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scope TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        last_seen TEXT DEFAULT (datetime('now')),
        hit_count INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS tool_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_name TEXT,
        result TEXT,
        ts TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_learnings_scope ON learnings(scope);
      CREATE INDEX IF NOT EXISTS idx_learnings_category ON learnings(category);
    `,
    );
}

function execSql(dbPath, sql) {
    if (!hasSqlite()) return "";
    try {
        return execFileSync("sqlite3", [dbPath, sql], { encoding: "utf8" });
    } catch {
        return "";
    }
}

function handleSessionStart() {
    if (!hasSqlite()) {
        console.log("Continual learning active");
        return;
    }

    ensureDb(GLOBAL_DB);
    if (isGitRepo()) ensureDb(LOCAL_DB);

    const globalRows = queryLearnings(GLOBAL_DB, 5);
    const localRows = existsSync(LOCAL_DB) ? queryLearnings(LOCAL_DB, 5) : [];

    if (!globalRows.length && !localRows.length) {
        console.log("Continual learning active — building memory");
        return;
    }

    console.error("Continual learning loaded prior learnings");
    if (globalRows.length) {
        console.error(`Global learnings (${globalRows.length}):`);
        for (const row of globalRows) console.error(`  - ${row}`);
    }
    if (localRows.length) {
        console.error(`Repo learnings (${localRows.length}):`);
        for (const row of localRows) console.error(`  - ${row}`);
    }
}

function queryLearnings(dbPath, limit) {
    const output = execSql(
        dbPath,
        `SELECT '[' || category || '] ' || content FROM learnings ORDER BY hit_count DESC, last_seen DESC LIMIT ${limit};`,
    );

    return output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function handlePostToolUse() {
    if (!hasSqlite()) return;

    ensureDb(GLOBAL_DB);
    const toolName = INPUT?.toolName ?? INPUT?.tool?.name ?? "";
    const result =
        INPUT?.toolResult?.resultType ?? INPUT?.toolResult?.status ?? "unknown";
    if (!toolName) return;

    execSql(
        GLOBAL_DB,
        `INSERT INTO tool_log (tool_name, result) VALUES ('${sqlEscape(toolName)}', '${sqlEscape(result)}');`,
    );
}

function handleSessionEnd() {
    if (!hasSqlite()) {
        console.log("Continual learning session complete");
        return;
    }

    ensureDb(GLOBAL_DB);
    if (isGitRepo()) ensureDb(LOCAL_DB);

    const total = countRows(
        GLOBAL_DB,
        `SELECT COUNT(*) FROM tool_log WHERE ts > datetime('now','-4 hours');`,
    );
    const failures = countRows(
        GLOBAL_DB,
        `SELECT COUNT(*) FROM tool_log WHERE result='failure' AND ts > datetime('now','-4 hours');`,
    );

    const failingTools = execSql(
        GLOBAL_DB,
        `SELECT tool_name FROM tool_log
     WHERE result='failure' AND ts > datetime('now','-4 hours')
     GROUP BY tool_name
     HAVING COUNT(*) > 2;`,
    )
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    for (const toolName of failingTools) {
        const safeTool = sqlEscape(toolName);
        execSql(
            GLOBAL_DB,
            `INSERT INTO learnings (scope, category, content, source)
       SELECT 'global', 'tool_insight', 'Tool "${safeTool}" frequently fails. Check usage pattern.', 'auto:${new Date().toISOString().slice(0, 10).replace(/-/g, "")}'
       WHERE NOT EXISTS (
         SELECT 1 FROM learnings WHERE content LIKE '%${safeTool}%frequently fails%'
       );
       UPDATE learnings
       SET hit_count = hit_count + 1, last_seen = datetime('now')
       WHERE content LIKE '%${safeTool}%frequently fails%';`,
        );
    }

    execSql(
        GLOBAL_DB,
        `DELETE FROM tool_log WHERE ts < datetime('now','-7 days');`,
    );
    execSql(
        GLOBAL_DB,
        `DELETE FROM learnings WHERE last_seen < datetime('now','-60 days') AND hit_count < 3;`,
    );

    if (existsSync(LOCAL_DB)) {
        execSql(
            LOCAL_DB,
            `DELETE FROM learnings WHERE last_seen < datetime('now','-60 days') AND hit_count < 3;`,
        );
    }

    console.log(
        `Continual learning reflected — tools: ${total}, failures: ${failures}`,
    );
}

function countRows(dbPath, sql) {
    const output = execSql(dbPath, sql).trim();
    const value = Number.parseInt(output, 10);
    return Number.isFinite(value) ? value : 0;
}
