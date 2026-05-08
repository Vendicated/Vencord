/* eslint-disable */
import { charset } from "./utils/utf-8.js";
import TokenType from "./utils/types/tokenType.js";
import type {
  JsonPrimitive,
  JsonKey,
  JsonObject,
  JsonArray,
  JsonStruct,
} from "./utils/types/jsonTypes.js";
import {
  type StackElement,
  TokenParserMode,
} from "./utils/types/stackElement.js";
import type { ParsedTokenInfo } from "./utils/types/parsedTokenInfo.js";
import type { ParsedElementInfo } from "./utils/types/parsedElementInfo.js";

// Parser States
const enum TokenParserState {
  VALUE,
  KEY,
  COLON,
  COMMA,
  ENDED,
  ERROR,
  SEPARATOR,
}

function TokenParserStateToString(state: TokenParserState): string {
  return ["VALUE", "KEY", "COLON", "COMMA", "ENDED", "ERROR", "SEPARATOR"][
    state
  ];
}

export interface TokenParserOptions {
  paths?: string[];
  keepStack?: boolean;
  separator?: string;
  emitPartialValues?: boolean;
}

const defaultOpts: TokenParserOptions = {
  paths: undefined,
  keepStack: true,
  separator: undefined,
  emitPartialValues: false,
};

export class TokenParserError extends Error {
  constructor(message: string) {
    super(message);
    // Typescript is broken. This is a workaround
    Object.setPrototypeOf(this, TokenParserError.prototype);
  }
}

export default class TokenParser {
  private readonly paths?: (string[] | undefined)[];
  private readonly keepStack: boolean;
  private readonly separator?: string;
  private state: TokenParserState = TokenParserState.VALUE;
  private mode: TokenParserMode | undefined = undefined;
  private key: JsonKey = undefined;
  private value: JsonStruct | undefined = undefined;
  private stack: StackElement[] = [];

  constructor(opts?: TokenParserOptions) {
    opts = { ...defaultOpts, ...opts };

    if (opts.paths) {
      this.paths = opts.paths.map((path) => {
        if (path === undefined || path === "$*") return undefined;

        if (!path.startsWith("$"))
          throw new TokenParserError(
            `Invalid selector "${path}". Should start with "$".`,
          );
        const pathParts = path.split(".").slice(1);
        if (pathParts.includes(""))
          throw new TokenParserError(
            `Invalid selector "${path}". ".." syntax not supported.`,
          );
        return pathParts;
      });
    }

    this.keepStack = opts.keepStack || false;
    this.separator = opts.separator;
    if (!opts.emitPartialValues) {
      this.emitPartial = () => {};
    }
  }

  private shouldEmit(): boolean {
    if (!this.paths) return true;

    return this.paths.some((path) => {
      if (path === undefined) return true;
      if (path.length !== this.stack.length) return false;

      for (let i = 0; i < path.length - 1; i++) {
        const selector = path[i];
        const key = this.stack[i + 1].key;
        if (selector === "*") continue;
        if (selector !== key?.toString()) return false;
      }

      const selector = path[path.length - 1];
      if (selector === "*") return true;
      return selector === this.key?.toString();
    });
  }

  private push(): void {
    this.stack.push({
      key: this.key,
      value: this.value as JsonStruct,
      mode: this.mode,
      emit: this.shouldEmit(),
    });
  }

  private pop(): void {
    const value = this.value;

    let emit;
    ({
      key: this.key,
      value: this.value,
      mode: this.mode,
      emit,
    } = this.stack.pop() as StackElement);

    this.state =
      this.mode !== undefined ? TokenParserState.COMMA : TokenParserState.VALUE;

    this.emit(value as JsonPrimitive | JsonStruct, emit);
  }

  private emit(value: JsonPrimitive | JsonStruct, emit: boolean): void {
    if (
      !this.keepStack &&
      this.value &&
      this.stack.every((item) => !item.emit)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (this.value as JsonStruct as any)[this.key as string | number];
    }

    if (emit) {
      this.onValue({
        value: value,
        key: this.key,
        parent: this.value,
        stack: this.stack,
      });
    }

    if (this.stack.length === 0) {
      if (this.separator) {
        this.state = TokenParserState.SEPARATOR;
      } else if (this.separator === undefined) {
        this.end();
      }
      // else if separator === '', expect next JSON object.
    }
  }

  private emitPartial(value?: JsonPrimitive): void {
    if (!this.shouldEmit()) return;

    if (this.state === TokenParserState.KEY) {
      this.onValue({
        value: undefined,
        key: value as JsonKey,
        parent: this.value,
        stack: this.stack,
        partial: true,
      });
      return;
    }

    this.onValue({
      value: value,
      key: this.key,
      parent: this.value,
      stack: this.stack,
      partial: true,
    });
  }

  public get isEnded(): boolean {
    return this.state === TokenParserState.ENDED;
  }

  public write({
    token,
    value,
    partial,
  }: Omit<ParsedTokenInfo, "offset">): void {
    try {
      if (partial) {
        this.emitPartial(value);
        return;
      }

      if (this.state === TokenParserState.VALUE) {
        if (
          token === TokenType.STRING ||
          token === TokenType.NUMBER ||
          token === TokenType.TRUE ||
          token === TokenType.FALSE ||
          token === TokenType.NULL
        ) {
          if (this.mode === TokenParserMode.OBJECT) {
            (this.value as JsonObject)[this.key as string] = value;
            this.state = TokenParserState.COMMA;
          } else if (this.mode === TokenParserMode.ARRAY) {
            (this.value as JsonArray).push(value);
            this.state = TokenParserState.COMMA;
          }

          this.emit(value, this.shouldEmit());
          return;
        }

        if (token === TokenType.LEFT_BRACE) {
          this.push();
          if (this.mode === TokenParserMode.OBJECT) {
            this.value = (this.value as JsonObject)[this.key as string] = {};
          } else if (this.mode === TokenParserMode.ARRAY) {
            const val = {};
            (this.value as JsonArray).push(val);
            this.value = val;
          } else {
            this.value = {};
          }
          this.mode = TokenParserMode.OBJECT;
          this.state = TokenParserState.KEY;
          this.key = undefined;
          this.emitPartial();
          return;
        }

        if (token === TokenType.LEFT_BRACKET) {
          this.push();
          if (this.mode === TokenParserMode.OBJECT) {
            this.value = (this.value as JsonObject)[this.key as string] = [];
          } else if (this.mode === TokenParserMode.ARRAY) {
            const val: JsonArray = [];
            (this.value as JsonArray).push(val);
            this.value = val;
          } else {
            this.value = [];
          }
          this.mode = TokenParserMode.ARRAY;
          this.state = TokenParserState.VALUE;
          this.key = 0;
          this.emitPartial();
          return;
        }

        if (
          this.mode === TokenParserMode.ARRAY &&
          token === TokenType.RIGHT_BRACKET &&
          (this.value as JsonArray).length === 0
        ) {
          this.pop();
          return;
        }
      }

      if (this.state === TokenParserState.KEY) {
        if (token === TokenType.STRING) {
          this.key = value as string;
          this.state = TokenParserState.COLON;
          this.emitPartial();
          return;
        }

        if (
          token === TokenType.RIGHT_BRACE &&
          Object.keys(this.value as JsonObject).length === 0
        ) {
          this.pop();
          return;
        }
      }

      if (this.state === TokenParserState.COLON) {
        if (token === TokenType.COLON) {
          this.state = TokenParserState.VALUE;
          return;
        }
      }

      if (this.state === TokenParserState.COMMA) {
        if (token === TokenType.COMMA) {
          if (this.mode === TokenParserMode.ARRAY) {
            this.state = TokenParserState.VALUE;
            (this.key as number) += 1;
            return;
          }

          /* istanbul ignore else */
          if (this.mode === TokenParserMode.OBJECT) {
            this.state = TokenParserState.KEY;
            return;
          }
        }

        if (
          (token === TokenType.RIGHT_BRACE &&
            this.mode === TokenParserMode.OBJECT) ||
          (token === TokenType.RIGHT_BRACKET &&
            this.mode === TokenParserMode.ARRAY)
        ) {
          this.pop();
          return;
        }
      }

      if (this.state === TokenParserState.SEPARATOR) {
        if (token === TokenType.SEPARATOR && value === this.separator) {
          this.state = TokenParserState.VALUE;
          return;
        }
      }

      // Edge case in which the separator is just whitespace and it's found in the middle of the JSON
      if (
        token === TokenType.SEPARATOR &&
        this.state !== TokenParserState.SEPARATOR &&
        Array.from(value as string)
          .map((n) => n.charCodeAt(0))
          .every(
            (n) =>
              n === charset.SPACE ||
              n === charset.NEWLINE ||
              n === charset.CARRIAGE_RETURN ||
              n === charset.TAB,
          )
      ) {
        // whitespace
        return;
      }

      throw new TokenParserError(
        `Unexpected ${TokenType[token]} (${JSON.stringify(
          value,
        )}) in state ${TokenParserStateToString(this.state)}`,
      );
    } catch (err: unknown) {
      this.error(err as Error);
    }
  }

  public error(err: Error): void {
    if (this.state !== TokenParserState.ENDED) {
      this.state = TokenParserState.ERROR;
    }

    this.onError(err);
  }

  public end(): void {
    if (
      (this.state !== TokenParserState.VALUE &&
        this.state !== TokenParserState.SEPARATOR) ||
      this.stack.length > 0
    ) {
      this.error(
        new Error(
          `Parser ended in mid-parsing (state: ${TokenParserStateToString(
            this.state,
          )}). Either not all the data was received or the data was invalid.`,
        ),
      );
    } else {
      this.state = TokenParserState.ENDED;
      this.onEnd();
    }
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  public onValue(parsedElementInfo: ParsedElementInfo): void {
    // Override me
    throw new TokenParserError(
      'Can\'t emit data before the "onValue" callback has been set up.',
    );
  }

  public onError(err: Error): void {
    // Override me
    throw err;
  }

  public onEnd(): void {
    // Override me
  }
}
