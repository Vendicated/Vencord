/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LanguagePattern } from "../types";

export const sql: LanguagePattern = {
    name: "SQL",
    identifier: "sql",
    extensions: [".sql"],
    threshold: 3,
    patterns: [
        { pattern: /\bSELECT\s+[\w*,\s]+\s+FROM\b/i, weight: 3, description: "SELECT FROM" },
        { pattern: /\bINSERT\s+INTO\s+\w+/i, weight: 3, description: "INSERT INTO" },
        { pattern: /\bUPDATE\s+\w+\s+SET\b/i, weight: 3, description: "UPDATE SET" },
        { pattern: /\bDELETE\s+FROM\s+\w+/i, weight: 3, description: "DELETE FROM" },
        { pattern: /\bCREATE\s+TABLE\s+\w+/i, weight: 3, description: "CREATE TABLE" },
        { pattern: /\bALTER\s+TABLE\s+\w+/i, weight: 3, description: "ALTER TABLE" },
        { pattern: /\bDROP\s+TABLE\s+\w+/i, weight: 3, description: "DROP TABLE" },
        { pattern: /\bWHERE\s+[\w.]+\s*(=|<|>|LIKE|IN|IS)/i, weight: 2, description: "WHERE clause" },
        { pattern: /\bJOIN\s+\w+\s+ON\b/i, weight: 2, description: "JOIN" },
        { pattern: /\bLEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN/i, weight: 2, description: "JOIN types" },
        { pattern: /\bORDER\s+BY\s+[\w.]+(\s+(ASC|DESC))?/i, weight: 2, description: "ORDER BY" },
        { pattern: /\bGROUP\s+BY\s+[\w.,\s]+/i, weight: 2, description: "GROUP BY" },
        { pattern: /\bHAVING\s+/i, weight: 2, description: "HAVING" },
        { pattern: /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i, weight: 2, description: "aggregate functions" },
        { pattern: /\bPRIMARY\s+KEY|FOREIGN\s+KEY/i, weight: 2, description: "keys" },
        { pattern: /\bNOT\s+NULL|UNIQUE|DEFAULT\b/i, weight: 1, description: "constraints" },
        { pattern: /\bINT|VARCHAR|TEXT|BOOLEAN|DATE|TIMESTAMP/i, weight: 1, description: "data types" },
        { pattern: /\bLIMIT\s+\d+/i, weight: 1, description: "LIMIT" },
        { pattern: /\bOFFSET\s+\d+/i, weight: 1, description: "OFFSET" },
        { pattern: /\bUNION(\s+ALL)?/i, weight: 2, description: "UNION" },
        { pattern: /\bCASE\s+WHEN\s+/i, weight: 2, description: "CASE WHEN" },
        { pattern: /\bCOALESCE\s*\(|IFNULL\s*\(/i, weight: 2, description: "null handling" },
        { pattern: /\bAS\s+\w+/i, weight: 1, description: "alias" },
        { pattern: /\bBETWEEN\s+.+\s+AND\b/i, weight: 2, description: "BETWEEN" },
        { pattern: /--\s*.*$|\/\*[\s\S]*?\*\//m, weight: 1, description: "SQL comment" },
    ]
};
