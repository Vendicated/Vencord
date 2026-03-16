/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { formatNumber, formatRawNumber } from "./formatters";
import type { CalculatorGraphData, CalculatorGraphSeries, CalculatorIntent, CalculatorResult, CalculatorViewMode } from "./types";

type Token =
    | { type: "number"; value: number; }
    | { type: "identifier"; value: string; }
    | { type: "operator"; value: "+" | "-" | "*" | "/" | "%" | "^"; }
    | { type: "leftParen"; }
    | { type: "rightParen"; }
    | { type: "comma"; }
    | { type: "equals"; }
    | { type: "semicolon"; };

type ExpressionNode =
    | { type: "number"; value: number; }
    | { type: "identifier"; name: string; }
    | { type: "unary"; operator: "+" | "-"; argument: ExpressionNode; }
    | { type: "binary"; operator: "+" | "-" | "*" | "/" | "%" | "^"; left: ExpressionNode; right: ExpressionNode; }
    | { type: "call"; callee: string; arguments: ExpressionNode[]; }
    | { type: "percent"; argument: ExpressionNode; };

interface FunctionDefinition {
    name: string;
    parameter: string;
    body: ExpressionNode;
    source: string;
}

interface VariableDefinition {
    name: string;
    body: ExpressionNode;
    source: string;
}

interface ExpressionStatement {
    expression: ExpressionNode;
    source: string;
}

interface EquationStatement {
    left: ExpressionNode;
    right: ExpressionNode;
    source: string;
}

interface ParsedAdvancedMathProgram {
    normalizedInput: string;
    variables: VariableDefinition[];
    definitions: FunctionDefinition[];
    statements: ExpressionStatement[];
    equations: EquationStatement[];
}

interface EvaluationScope {
    values: Map<string, number>;
    functions: Map<string, FunctionDefinition>;
    variables: Map<string, VariableDefinition>;
    functionStack: Set<string>;
    variableStack: Set<string>;
}

interface GraphSeriesDefinition {
    id: string;
    label: string;
    expression: ExpressionNode;
}

interface SolvedEquation {
    roots: number[];
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
    "⁰": "0",
    "¹": "1",
    "²": "2",
    "³": "3",
    "⁴": "4",
    "⁵": "5",
    "⁶": "6",
    "⁷": "7",
    "⁸": "8",
    "⁹": "9",
    "⁺": "+",
    "⁻": "-"
};

const GRAPH_COLORS = [
    "#7dd3fc",
    "#fda4af",
    "#86efac",
    "#fcd34d",
    "#c4b5fd",
    "#fb7185"
];
const MAX_GRAPH_MAGNITUDE = 10000;
const EQUATION_SOLVE_DOMAIN: [number, number] = [-100, 100];
const EQUATION_SOLVE_SAMPLES = 4096;
const EQUATION_ROOT_TOLERANCE = 1e-7;
const EQUATION_ROOT_DEDUPE_EPSILON = 1e-5;

const CONSTANTS: Record<string, number> = {
    e: Math.E,
    inf: Number.POSITIVE_INFINITY,
    infinity: Number.POSITIVE_INFINITY,
    nan: Number.NaN,
    pi: Math.PI,
    tau: Math.PI * 2
};
const BUILT_INS: Record<string, (...args: number[]) => number> = {
    abs: value => Math.abs(value),
    acos: value => Math.acos(value),
    asin: value => Math.asin(value),
    atan: value => Math.atan(value),
    ceil: value => Math.ceil(value),
    cos: value => Math.cos(value),
    cosh: value => Math.cosh(value),
    exp: value => Math.exp(value),
    floor: value => Math.floor(value),
    ln: value => Math.log(value),
    log: value => Math.log10(value),
    max: (...values) => Math.max(...values),
    min: (...values) => Math.min(...values),
    round: (value, digits = 0) => {
        if (!Number.isFinite(digits)) return Number.NaN;
        const factor = 10 ** Math.trunc(digits);
        return Math.round(value * factor) / factor;
    },
    sin: value => Math.sin(value),
    sinh: value => Math.sinh(value),
    sqrt: value => Math.sqrt(value),
    tan: value => Math.tan(value),
    tanh: value => Math.tanh(value)
};

function normalizeMathWhitespace(input: string): string {
    return input.trim().replace(/\s+/g, " ");
}

function convertUnicodeSuperscripts(input: string): string {
    let output = "";

    for (let index = 0; index < input.length; index++) {
        const current = input[index];
        const superscript = SUPERSCRIPT_DIGITS[current];
        if (!superscript) {
            output += current;
            continue;
        }

        let sequence = superscript;
        while (index + 1 < input.length && SUPERSCRIPT_DIGITS[input[index + 1]]) {
            index += 1;
            sequence += SUPERSCRIPT_DIGITS[input[index]];
        }

        output += `^(${sequence})`;
    }

    return output;
}

function normalizeAdvancedMathInput(rawInput: string): string | null {
    const input = normalizeMathWhitespace(rawInput);
    if (!input) return null;

    let normalized = input
        .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1")
        .replace(/[−–—]/g, "-")
        .replace(/[×·]/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/gi, "pi")
        .replace(/τ/gi, "tau")
        .replace(/∞/g, "infinity")
        .replace(/√/g, "sqrt")
        .replace(/square root of/gi, "sqrt ")
        .replace(/([0-9.]+)\s*%\s+of\s+([a-z0-9_().^+\-*/\s]+)/gi, "(($1/100)*($2))");

    normalized = convertUnicodeSuperscripts(normalized);
    normalized = normalized
        .replace(/[{}[\]]/g, match => (match === "{" || match === "[" ? "(" : ")"))
        .replace(/\bpower\b/gi, "^")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    if (!normalized) return null;
    if (!/[0-9a-z+\-*/%^()=;,]/i.test(normalized)) return null;

    return normalized;
}

function tokenizeAdvancedMath(normalizedInput: string): Token[] | null {
    const tokens: Token[] = [];
    let index = 0;

    while (index < normalizedInput.length) {
        const current = normalizedInput[index];

        if (current === " ") {
            index += 1;
            continue;
        }

        const numberMatch = normalizedInput.slice(index).match(/^(?:\d+\.\d+|\d+|\.\d+)(?:e[+-]?\d+)?/i);
        if (numberMatch) {
            const value = Number(numberMatch[0]);
            if (Number.isNaN(value)) return null;
            tokens.push({ type: "number", value });
            index += numberMatch[0].length;
            continue;
        }

        const identifierMatch = normalizedInput.slice(index).match(/^[a-z_][a-z0-9_]*/i);
        if (identifierMatch) {
            tokens.push({ type: "identifier", value: identifierMatch[0] });
            index += identifierMatch[0].length;
            continue;
        }

        if (current === "+") tokens.push({ type: "operator", value: "+" });
        else if (current === "-") tokens.push({ type: "operator", value: "-" });
        else if (current === "*") tokens.push({ type: "operator", value: "*" });
        else if (current === "/") tokens.push({ type: "operator", value: "/" });
        else if (current === "%") tokens.push({ type: "operator", value: "%" });
        else if (current === "^") tokens.push({ type: "operator", value: "^" });
        else if (current === "(") tokens.push({ type: "leftParen" });
        else if (current === ")") tokens.push({ type: "rightParen" });
        else if (current === ",") tokens.push({ type: "comma" });
        else if (current === "=") tokens.push({ type: "equals" });
        else if (current === ";") tokens.push({ type: "semicolon" });
        else return null;

        index += 1;
    }

    const expanded: Token[] = [];
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
        const token = tokens[tokenIndex];
        const previous = expanded[expanded.length - 1];

        const previousEndsExpression = previous
            ? previous.type === "number"
                || previous.type === "identifier"
                || previous.type === "rightParen"
            : false;
        const currentStartsExpression = token.type === "number"
            || token.type === "identifier"
            || token.type === "leftParen";
        const isFunctionCall = previous?.type === "identifier" && token.type === "leftParen";

        if (previousEndsExpression && currentStartsExpression && !isFunctionCall) {
            expanded.push({ type: "operator", value: "*" });
        }

        expanded.push(token);
    }

    return expanded;
}

function splitStatements(tokens: Token[]): Token[][] {
    const statements: Token[][] = [];
    let depth = 0;
    let start = 0;

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type === "leftParen") depth += 1;
        if (token.type === "rightParen") depth -= 1;
        if (depth === 0 && token.type === "semicolon") {
            statements.push(tokens.slice(start, index));
            start = index + 1;
        }
    }

    if (start <= tokens.length) {
        statements.push(tokens.slice(start));
    }

    return statements.filter(statement => statement.length > 0);
}

function tokensToSource(tokens: Token[]): string {
    return tokens.map(token => {
        switch (token.type) {
            case "number":
                return formatRawNumber(token.value);
            case "identifier":
                return token.value;
            case "operator":
                return token.value;
            case "leftParen":
                return "(";
            case "rightParen":
                return ")";
            case "comma":
                return ",";
            case "equals":
                return "=";
            case "semicolon":
                return ";";
        }
    }).join("");
}

class ExpressionParser {
    private index = 0;

    constructor(private readonly tokens: Token[]) {}

    parse(): ExpressionNode | null {
        const expression = this.parseAdditive();
        if (!expression) return null;
        if (this.index !== this.tokens.length) return null;
        return expression;
    }

    private parseAdditive(): ExpressionNode | null {
        let left = this.parseMultiplicative();
        if (!left) return null;

        while (true) {
            const token = this.tokens[this.index];
            if (token?.type !== "operator" || (token.value !== "+" && token.value !== "-")) break;
            this.index += 1;
            const right = this.parseMultiplicative();
            if (!right) return null;
            left = { type: "binary", operator: token.value, left, right };
        }

        return left;
    }

    private parseMultiplicative(): ExpressionNode | null {
        let left = this.parsePower();
        if (!left) return null;

        while (true) {
            const token = this.tokens[this.index];
            if (token?.type !== "operator" || (token.value !== "*" && token.value !== "/" && token.value !== "%")) break;

            const next = this.tokens[this.index + 1];
            const isPostfixPercent = token.value === "%" && (!next || next.type === "rightParen" || next.type === "comma");
            if (isPostfixPercent) break;

            this.index += 1;
            const right = this.parsePower();
            if (!right) return null;
            left = { type: "binary", operator: token.value, left, right };
        }

        return left;
    }

    private parsePower(): ExpressionNode | null {
        const left = this.parseUnary();
        if (!left) return null;

        const token = this.tokens[this.index];
        if (token?.type === "operator" && token.value === "^") {
            this.index += 1;
            const right = this.parsePower();
            if (!right) return null;
            return { type: "binary", operator: "^", left, right };
        }

        return left;
    }

    private parseUnary(): ExpressionNode | null {
        const token = this.tokens[this.index];
        if (token?.type === "operator" && (token.value === "+" || token.value === "-")) {
            this.index += 1;
            const argument = this.parseUnary();
            if (!argument) return null;
            return { type: "unary", operator: token.value, argument };
        }

        return this.parsePostfix();
    }

    private parsePostfix(): ExpressionNode | null {
        let expression = this.parsePrimary();
        if (!expression) return null;

        while (true) {
            const token = this.tokens[this.index];
            if (token?.type !== "operator" || token.value !== "%") break;
            const next = this.tokens[this.index + 1];
            if (next && next.type !== "rightParen" && next.type !== "comma") break;
            this.index += 1;
            expression = { type: "percent", argument: expression };
        }

        return expression;
    }

    private parsePrimary(): ExpressionNode | null {
        const token = this.tokens[this.index];
        if (!token) return null;

        if (token.type === "number") {
            this.index += 1;
            return { type: "number", value: token.value };
        }

        if (token.type === "identifier") {
            this.index += 1;
            const next = this.tokens[this.index];
            if (next?.type !== "leftParen") {
                return { type: "identifier", name: token.value };
            }

            this.index += 1;
            const args: ExpressionNode[] = [];
            const closing = this.tokens[this.index];
            if (closing?.type === "rightParen") {
                this.index += 1;
                return { type: "call", callee: token.value, arguments: args };
            }

            while (this.index < this.tokens.length) {
                const argument = this.parseAdditive();
                if (!argument) return null;
                args.push(argument);

                const separator = this.tokens[this.index];
                if (separator?.type === "comma") {
                    this.index += 1;
                    continue;
                }

                if (separator?.type === "rightParen") {
                    this.index += 1;
                    return { type: "call", callee: token.value, arguments: args };
                }

                return null;
            }

            return null;
        }

        if (token.type === "leftParen") {
            this.index += 1;
            const expression = this.parseAdditive();
            if (!expression) return null;
            if (this.tokens[this.index]?.type !== "rightParen") return null;
            this.index += 1;
            return expression;
        }

        return null;
    }
}

function parseFunctionDefinition(tokens: Token[]): FunctionDefinition | null {
    if (tokens.length < 6) return null;
    if (tokens[0]?.type !== "identifier") return null;
    if (tokens[1]?.type !== "leftParen") return null;
    if (tokens[2]?.type !== "identifier") return null;
    if (tokens[3]?.type !== "rightParen") return null;
    if (tokens[4]?.type !== "equals") return null;

    const parser = new ExpressionParser(tokens.slice(5));
    const body = parser.parse();
    if (!body) return null;

    return {
        name: tokens[0].value,
        parameter: tokens[2].value,
        body,
        source: tokensToSource(tokens)
    };
}

function parseVariableDefinition(tokens: Token[]): VariableDefinition | null {
    if (tokens.length < 3) return null;
    if (tokens[0]?.type !== "identifier") return null;
    if (tokens[1]?.type !== "equals") return null;

    const parser = new ExpressionParser(tokens.slice(2));
    const body = parser.parse();
    if (!body) return null;

    return {
        name: tokens[0].value,
        body,
        source: tokensToSource(tokens)
    };
}

function parseEquationStatement(tokens: Token[]): EquationStatement | null {
    let depth = 0;
    let equalsIndex = -1;

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type === "leftParen") depth += 1;
        if (token.type === "rightParen") depth -= 1;
        if (token.type !== "equals" || depth !== 0) continue;
        if (equalsIndex !== -1) return null;
        equalsIndex = index;
    }

    if (equalsIndex <= 0 || equalsIndex >= tokens.length - 1) return null;

    const left = new ExpressionParser(tokens.slice(0, equalsIndex)).parse();
    const right = new ExpressionParser(tokens.slice(equalsIndex + 1)).parse();
    if (!left || !right) return null;

    return {
        left,
        right,
        source: tokensToSource(tokens)
    };
}

function parseAdvancedMathProgram(query: string): ParsedAdvancedMathProgram | null {
    const normalizedInput = normalizeAdvancedMathInput(query);
    if (!normalizedInput) return null;

    const tokens = tokenizeAdvancedMath(normalizedInput);
    if (!tokens || tokens.length === 0) return null;

    const statements = splitStatements(tokens);
    if (statements.length === 0) return null;

    const variables: VariableDefinition[] = [];
    const definitions: FunctionDefinition[] = [];
    const expressionStatements: ExpressionStatement[] = [];
    const equations: EquationStatement[] = [];

    for (const statement of statements) {
        const definition = parseFunctionDefinition(statement);
        if (definition) {
            definitions.push(definition);
            continue;
        }

        const variable = parseVariableDefinition(statement);
        if (variable) {
            variables.push(variable);
            continue;
        }

        const equation = parseEquationStatement(statement);
        if (equation) {
            equations.push(equation);
            continue;
        }

        const parser = new ExpressionParser(statement);
        const expression = parser.parse();
        if (!expression) return null;
        expressionStatements.push({
            expression,
            source: tokensToSource(statement)
        });
    }

    if (variables.length === 0 && definitions.length === 0 && expressionStatements.length === 0 && equations.length === 0) return null;

    return {
        normalizedInput,
        variables,
        definitions,
        statements: expressionStatements,
        equations
    };
}

function isPlainNumericLiteral(query: string): boolean {
    return /^-?(?:\d+\.\d+|\d+|\.\d+)$/.test(query.trim());
}

function evaluateExpression(expression: ExpressionNode, scope: EvaluationScope): number | null {
    switch (expression.type) {
        case "number":
            return expression.value;
        case "identifier": {
            const scoped = scope.values.get(expression.name);
            if (scoped != null) return scoped;
            const variable = scope.variables.get(expression.name);
            if (variable) {
                if (scope.variableStack.has(expression.name)) return null;
                scope.variableStack.add(expression.name);
                const value = evaluateExpression(variable.body, scope);
                scope.variableStack.delete(expression.name);
                if (value == null) return null;
                scope.values.set(expression.name, value);
                return value;
            }
            if (Object.prototype.hasOwnProperty.call(CONSTANTS, expression.name)) {
                return CONSTANTS[expression.name];
            }
            return null;
        }
        case "unary": {
            const argument = evaluateExpression(expression.argument, scope);
            if (argument == null) return null;
            return expression.operator === "-" ? -argument : argument;
        }
        case "binary": {
            const left = evaluateExpression(expression.left, scope);
            const right = evaluateExpression(expression.right, scope);
            if (left == null || right == null) return null;
            if (expression.operator === "+") return left + right;
            if (expression.operator === "-") return left - right;
            if (expression.operator === "*") return left * right;
            if (expression.operator === "/") return left / right;
            if (expression.operator === "%") return left % right;
            return left ** right;
        }
        case "percent": {
            const argument = evaluateExpression(expression.argument, scope);
            if (argument == null) return null;
            return argument / 100;
        }
        case "call": {
            const args: number[] = [];
            for (const argument of expression.arguments) {
                const value = evaluateExpression(argument, scope);
                if (value == null) return null;
                args.push(value);
            }

            const builtIn = BUILT_INS[expression.callee];
            if (builtIn) {
                return builtIn(...args);
            }

            const userDefined = scope.functions.get(expression.callee);
            if (!userDefined || args.length !== 1) return null;
            if (scope.functionStack.has(expression.callee)) return null;

            const nestedValues = new Map(scope.values);
            nestedValues.set(userDefined.parameter, args[0]);
            const nestedFunctionStack = new Set(scope.functionStack);
            nestedFunctionStack.add(expression.callee);
            return evaluateExpression(userDefined.body, {
                values: nestedValues,
                functions: scope.functions,
                variables: scope.variables,
                functionStack: nestedFunctionStack,
                variableStack: new Set(scope.variableStack)
            });
        }
    }
}

function expressionReferencesVariable(
    expression: ExpressionNode,
    variable: string,
    functions: Map<string, FunctionDefinition>,
    variables: Map<string, VariableDefinition>,
    seenVariables = new Set<string>()
): boolean {
    switch (expression.type) {
        case "number":
            return false;
        case "identifier":
            if (expression.name === variable) return true;
            if (seenVariables.has(expression.name)) return false;
            if (!variables.has(expression.name)) return false;
            seenVariables.add(expression.name);
            return expressionReferencesVariable(variables.get(expression.name)!.body, variable, functions, variables, seenVariables);
        case "unary":
        case "percent":
            return expressionReferencesVariable(expression.argument, variable, functions, variables, seenVariables);
        case "binary":
            return expressionReferencesVariable(expression.left, variable, functions, variables, new Set(seenVariables))
                || expressionReferencesVariable(expression.right, variable, functions, variables, new Set(seenVariables));
        case "call": {
            const builtIn = Boolean(BUILT_INS[expression.callee]);
            if (builtIn) {
                return expression.arguments.some(argument => expressionReferencesVariable(argument, variable, functions, variables, new Set(seenVariables)));
            }

            const userDefined = functions.get(expression.callee);
            if (!userDefined || expression.arguments.length !== 1) {
                return false;
            }

            return expressionReferencesVariable(expression.arguments[0], variable, functions, variables, new Set(seenVariables));
        }
    }
}

function buildGraphSeriesDefinitions(program: ParsedAdvancedMathProgram): GraphSeriesDefinition[] {
    const definitions = new Map<string, FunctionDefinition>();
    const variables = new Map<string, VariableDefinition>();
    for (const variable of program.variables) {
        variables.set(variable.name, variable);
    }
    for (const definition of program.definitions) {
        definitions.set(definition.name, definition);
    }

    const graphSeries: GraphSeriesDefinition[] = [];
    for (const definition of program.definitions) {
        if (definition.parameter !== "x") continue;
        if (!expressionReferencesVariable(definition.body, "x", definitions, variables)) continue;
        graphSeries.push({
            id: `definition-${definition.name}-${graphSeries.length}`,
            label: `${definition.name}(x)`,
            expression: definition.body
        });
    }

    for (let index = 0; index < program.statements.length; index++) {
        const statement = program.statements[index];
        if (!expressionReferencesVariable(statement.expression, "x", definitions, variables)) continue;
        graphSeries.push({
            id: `expr-${index}`,
            label: statement.source,
            expression: statement.expression
        });
    }

    return graphSeries;
}

function resolveVariableValues(
    variables: Map<string, VariableDefinition>,
    functions: Map<string, FunctionDefinition>,
    seed?: Map<string, number>
): Map<string, number> {
    const values = seed ? new Map(seed) : new Map<string, number>();

    for (const [name, variable] of variables) {
        if (values.has(name)) continue;
        const value = evaluateExpression(variable.body, {
            values,
            functions,
            variables,
            functionStack: new Set(),
            variableStack: new Set([name])
        });
        if (value != null) {
            values.set(name, value);
        }
    }

    return values;
}

function sampleGraphSeries(
    definitions: GraphSeriesDefinition[],
    variables: Map<string, VariableDefinition>,
    functions: Map<string, FunctionDefinition>,
    domain: [number, number]
): CalculatorGraphSeries[] {
    const [minX, maxX] = domain;
    const samples = 160;
    const step = (maxX - minX) / samples;

    return definitions.map((definition, index) => {
        const points = Array.from({ length: samples + 1 }, (_, sampleIndex) => {
            const x = minX + step * sampleIndex;
            const values = resolveVariableValues(variables, functions, new Map([["x", x]]));
            const y = evaluateExpression(definition.expression, {
                values,
                functions,
                variables,
                functionStack: new Set(),
                variableStack: new Set()
            });

            return {
                x,
                y: y == null || !Number.isFinite(y) || Number.isNaN(y) || Math.abs(y) > MAX_GRAPH_MAGNITUDE ? null : y
            };
        });

        return {
            id: definition.id,
            label: definition.label,
            color: GRAPH_COLORS[index % GRAPH_COLORS.length],
            points
        };
    }).filter(series => series.points.some(point => point.y != null));
}

function resolveGraphRange(series: CalculatorGraphSeries[]): [number, number] {
    const values = series
        .flatMap(entry => entry.points.map(point => point.y))
        .filter((value): value is number => value != null && Number.isFinite(value));

    if (!values.length) return [-10, 10];

    let min = Math.min(...values);
    let max = Math.max(...values);

    if (min === max) {
        const padding = Math.abs(min || 1);
        min -= padding;
        max += padding;
    } else {
        const padding = Math.max((max - min) * 0.12, 1);
        min -= padding;
        max += padding;
    }

    return [min, max];
}

function buildGraphData(program: ParsedAdvancedMathProgram, functions: Map<string, FunctionDefinition>, defaultViewMode: CalculatorViewMode): CalculatorGraphData | undefined {
    const definitions = buildGraphSeriesDefinitions(program);
    if (!definitions.length) return undefined;
    const variables = new Map<string, VariableDefinition>();
    for (const variable of program.variables) {
        variables.set(variable.name, variable);
    }

    const domain: [number, number] = [-10, 10];
    const series = sampleGraphSeries(definitions, variables, functions, domain);
    if (!series.length) return undefined;
    const range = resolveGraphRange(series);

    return {
        defaultViewMode,
        domain,
        range,
        series
    };
}

function evaluateEquationResidual(
    equation: EquationStatement,
    x: number,
    variables: Map<string, VariableDefinition>,
    functions: Map<string, FunctionDefinition>
): number | null {
    const values = resolveVariableValues(variables, functions, new Map([["x", x]]));
    const left = evaluateExpression(equation.left, {
        values,
        functions,
        variables,
        functionStack: new Set(),
        variableStack: new Set()
    });
    const right = evaluateExpression(equation.right, {
        values,
        functions,
        variables,
        functionStack: new Set(),
        variableStack: new Set()
    });

    if (left == null || right == null) return null;

    const residual = left - right;
    if (!Number.isFinite(residual) || Number.isNaN(residual)) return null;
    return residual;
}

function dedupeRoots(values: number[]): number[] {
    return values
        .sort((left, right) => left - right)
        .filter((value, index, roots) => index === 0 || Math.abs(value - roots[index - 1]) > EQUATION_ROOT_DEDUPE_EPSILON);
}

function refineRootByBisection(
    equation: EquationStatement,
    left: number,
    right: number,
    leftValue: number,
    rightValue: number,
    variables: Map<string, VariableDefinition>,
    functions: Map<string, FunctionDefinition>
): number | null {
    let min = left;
    let max = right;
    let minValue = leftValue;
    let maxValue = rightValue;

    for (let iteration = 0; iteration < 80; iteration++) {
        const midpoint = (min + max) / 2;
        const midpointValue = evaluateEquationResidual(equation, midpoint, variables, functions);
        if (midpointValue == null) return null;
        if (Math.abs(midpointValue) <= EQUATION_ROOT_TOLERANCE) return midpoint;

        if (minValue === 0) return min;
        if (maxValue === 0) return max;

        if (Math.sign(minValue) === Math.sign(midpointValue)) {
            min = midpoint;
            minValue = midpointValue;
        } else {
            max = midpoint;
            maxValue = midpointValue;
        }
    }

    const midpoint = (min + max) / 2;
    const midpointValue = evaluateEquationResidual(equation, midpoint, variables, functions);
    return midpointValue != null && Math.abs(midpointValue) <= 1e-5 ? midpoint : null;
}

function refineRootByNewton(
    equation: EquationStatement,
    initialGuess: number,
    variables: Map<string, VariableDefinition>,
    functions: Map<string, FunctionDefinition>
): number | null {
    let x = initialGuess;

    for (let iteration = 0; iteration < 14; iteration++) {
        const value = evaluateEquationResidual(equation, x, variables, functions);
        if (value == null) return null;
        if (Math.abs(value) <= EQUATION_ROOT_TOLERANCE) return x;

        const step = Math.max(1e-6, Math.abs(x) * 1e-5);
        const left = evaluateEquationResidual(equation, x - step, variables, functions);
        const right = evaluateEquationResidual(equation, x + step, variables, functions);
        if (left == null || right == null) return null;

        const derivative = (right - left) / (step * 2);
        if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-9) return null;

        x -= value / derivative;
        if (!Number.isFinite(x)) return null;
        if (x < EQUATION_SOLVE_DOMAIN[0] - 1 || x > EQUATION_SOLVE_DOMAIN[1] + 1) return null;
    }

    const residual = evaluateEquationResidual(equation, x, variables, functions);
    return residual != null && Math.abs(residual) <= 1e-5 ? x : null;
}

function solveEquation(
    equation: EquationStatement,
    variables: Map<string, VariableDefinition>,
    functions: Map<string, FunctionDefinition>
): number[] {
    const [minX, maxX] = EQUATION_SOLVE_DOMAIN;
    const step = (maxX - minX) / EQUATION_SOLVE_SAMPLES;
    const samples: Array<{ x: number; value: number | null; }> = [];

    for (let index = 0; index <= EQUATION_SOLVE_SAMPLES; index++) {
        const x = minX + step * index;
        samples.push({
            x,
            value: evaluateEquationResidual(equation, x, variables, functions)
        });
    }

    const roots: number[] = [];
    for (let index = 0; index < samples.length; index++) {
        const current = samples[index];
        const currentValue = current.value;
        if (currentValue == null) continue;

        if (Math.abs(currentValue) <= 1e-6) {
            roots.push(current.x);
            continue;
        }

        const next = samples[index + 1];
        if (next?.value != null && Math.sign(currentValue) !== Math.sign(next.value)) {
            const root = refineRootByBisection(equation, current.x, next.x, currentValue, next.value, variables, functions);
            if (root != null) roots.push(root);
        }

        const previous = samples[index - 1];
        if (previous?.value == null || next?.value == null) continue;
        const absoluteCurrent = Math.abs(currentValue);
        if (absoluteCurrent >= Math.abs(previous.value) || absoluteCurrent > Math.abs(next.value) || absoluteCurrent > 1e-2) continue;

        const root = refineRootByNewton(equation, current.x, variables, functions);
        if (root != null) roots.push(root);
    }

    return dedupeRoots(roots);
}

function solveProgramEquation(
    program: ParsedAdvancedMathProgram,
    variables: Map<string, VariableDefinition>,
    functions: Map<string, FunctionDefinition>
): SolvedEquation | null {
    const equation = program.equations[program.equations.length - 1];
    if (!equation) return null;

    const referencesX = expressionReferencesVariable(equation.left, "x", functions, variables)
        || expressionReferencesVariable(equation.right, "x", functions, variables);
    if (!referencesX) return null;

    return {
        roots: solveEquation(equation, variables, functions)
    };
}

function formatSpecialValue(value: number): string {
    if (Number.isNaN(value)) return "NaN";
    if (value === Number.POSITIVE_INFINITY) return "Infinity";
    if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
    return formatNumber(value);
}

function classifyMathResult(program: ParsedAdvancedMathProgram, value: number): { secondaryText: string; tertiaryText?: string; } {
    if (program.equations.length > 0) {
        return {
            secondaryText: "Equation",
            tertiaryText: "Single value"
        };
    }

    if (!Number.isFinite(value) || Number.isNaN(value)) {
        return {
            secondaryText: "Special value",
            tertiaryText: Number.isNaN(value) ? "NaN" : value > 0 ? "Infinity" : "-Infinity"
        };
    }

    if (program.definitions.length > 0) {
        return {
            secondaryText: "Function result",
            tertiaryText: `${program.definitions.length} definition${program.definitions.length === 1 ? "" : "s"}`
        };
    }

    if (program.variables.length > 0) {
        return {
            secondaryText: "Variable result",
            tertiaryText: `${program.variables.length} variable${program.variables.length === 1 ? "" : "s"}`
        };
    }

    const finalStatement = program.statements[program.statements.length - 1];
    if (finalStatement?.expression.type === "identifier") {
        return {
            secondaryText: "Constant",
            tertiaryText: finalStatement.expression.name
        };
    }

    if (finalStatement?.expression.type === "call") {
        return {
            secondaryText: "Function",
            tertiaryText: finalStatement.expression.callee
        };
    }

    return {
        secondaryText: "Answer",
        tertiaryText: "Expression"
    };
}

function classifyEquationResult(roots: number[]): { secondaryText: string; tertiaryText: string; } {
    return {
        secondaryText: roots.length === 0 ? "Equation" : "Solutions",
        tertiaryText: roots.length === 0
            ? "No real solutions"
            : `${roots.length} real solution${roots.length === 1 ? "" : "s"}`
    };
}

function normalizeRootValue(value: number): number {
    if (!Number.isFinite(value)) return value;
    if (Math.abs(value) < 1e-9) return 0;

    const roundedInteger = Math.round(value);
    if (Math.abs(value - roundedInteger) < 1e-8) return roundedInteger;

    const roundedDecimal = Number(value.toFixed(10));
    return Object.is(roundedDecimal, -0) ? 0 : roundedDecimal;
}

function formatEquationRoots(roots: number[]): { displayAnswer: string; rawAnswer: string; } {
    if (roots.length === 0) {
        return {
            displayAnswer: "No real solutions",
            rawAnswer: "No real solutions"
        };
    }

    const normalizedRoots = roots.map(normalizeRootValue);

    if (normalizedRoots.length === 1) {
        return {
            displayAnswer: `x = ${formatSpecialValue(normalizedRoots[0])}`,
            rawAnswer: `x=${formatRawNumber(normalizedRoots[0])}`
        };
    }

    return {
        displayAnswer: normalizedRoots.map(root => `x = ${formatSpecialValue(root)}`).join(", "),
        rawAnswer: normalizedRoots.map(root => formatRawNumber(root)).join(",")
    };
}

function getProgramEvaluationExpression(program: ParsedAdvancedMathProgram): ExpressionNode | null {
    const lastStatement = program.statements[program.statements.length - 1];
    return lastStatement?.expression ?? null;
}

export function parseAdvancedMathQuery(query: string): CalculatorIntent | null {
    const program = parseAdvancedMathProgram(query);
    if (!program) return null;

    const graphDefinitions = buildGraphSeriesDefinitions(program);
    const evaluationExpression = getProgramEvaluationExpression(program);
    if (!evaluationExpression && graphDefinitions.length === 0 && program.equations.length === 0) return null;
    if (evaluationExpression && program.definitions.length === 0 && program.statements.length === 1 && evaluationExpression.type === "number" && isPlainNumericLiteral(query)) {
        return null;
    }

    return {
        kind: "advanced_math",
        displayInput: query,
        normalizedInput: program.normalizedInput
    };
}

export function evaluateAdvancedMath(displayInput: string, normalizedInput: string): CalculatorResult | null {
    const program = parseAdvancedMathProgram(normalizedInput);
    if (!program) return null;

    const variables = new Map<string, VariableDefinition>();
    for (const variable of program.variables) {
        variables.set(variable.name, variable);
    }
    const functions = new Map<string, FunctionDefinition>();
    for (const definition of program.definitions) {
        functions.set(definition.name, definition);
    }

    const graphDefinitions = buildGraphSeriesDefinitions(program);
    const evaluationExpression = getProgramEvaluationExpression(program);
    const solvedEquation = !evaluationExpression ? solveProgramEquation(program, variables, functions) : null;
    const value = evaluationExpression
        ? evaluateExpression(evaluationExpression, {
            values: resolveVariableValues(variables, functions),
            functions,
            variables,
            functionStack: new Set(),
            variableStack: new Set()
        })
        : null;

    const defaultViewMode: CalculatorViewMode = value == null && !solvedEquation ? "graph" : "result";
    const graph = graphDefinitions.length > 0
        ? buildGraphData(program, functions, defaultViewMode)
        : undefined;
    if (value == null && !graph && !solvedEquation) return null;

    if (solvedEquation) {
        const formattedRoots = formatEquationRoots(solvedEquation.roots);
        const meta = classifyEquationResult(solvedEquation.roots);

        return {
            kind: "number",
            displayInput,
            normalizedInput,
            displayAnswer: formattedRoots.displayAnswer,
            rawAnswer: formattedRoots.rawAnswer,
            secondaryText: meta.secondaryText,
            tertiaryText: meta.tertiaryText
        };
    }

    const meta = value == null
        ? {
            secondaryText: "Graph",
            tertiaryText: graphDefinitions.length === 1 ? graphDefinitions[0].label : `${graphDefinitions.length} functions`
        }
        : classifyMathResult(program, value);
    const displayAnswer = value == null
        ? graphDefinitions.length === 1 ? graphDefinitions[0].label : `${graphDefinitions.length} functions`
        : formatSpecialValue(value);

    return {
        kind: "number",
        displayInput,
        normalizedInput,
        displayAnswer,
        rawAnswer: value == null
            ? displayAnswer
            : Number.isFinite(value) ? formatRawNumber(value) : displayAnswer,
        graph,
        secondaryText: meta.secondaryText,
        tertiaryText: meta.tertiaryText
    };
}
