/* eslint-disable */
import { charset, escapedSequences } from "./utils/utf-8.js";
import {
  type StringBuilder,
  NonBufferedString,
  BufferedString,
} from "./utils/bufferedString.js";
import TokenType from "./utils/types/tokenType.js";
import type { ParsedTokenInfo } from "./utils/types/parsedTokenInfo.js";

// Tokenizer States
const enum TokenizerStates {
  START,
  ENDED,
  ERROR,
  TRUE1,
  TRUE2,
  TRUE3,
  FALSE1,
  FALSE2,
  FALSE3,
  FALSE4,
  NULL1,
  NULL2,
  NULL3,
  STRING_DEFAULT,
  STRING_AFTER_BACKSLASH,
  STRING_UNICODE_DIGIT_1,
  STRING_UNICODE_DIGIT_2,
  STRING_UNICODE_DIGIT_3,
  STRING_UNICODE_DIGIT_4,
  STRING_INCOMPLETE_CHAR,
  NUMBER_AFTER_INITIAL_MINUS,
  NUMBER_AFTER_INITIAL_ZERO,
  NUMBER_AFTER_INITIAL_NON_ZERO,
  NUMBER_AFTER_FULL_STOP,
  NUMBER_AFTER_DECIMAL,
  NUMBER_AFTER_E,
  NUMBER_AFTER_E_AND_SIGN,
  NUMBER_AFTER_E_AND_DIGIT,
  SEPARATOR,
  BOM_OR_START,
  BOM,
}

function TokenizerStateToString(tokenizerState: TokenizerStates): string {
  return [
    "START",
    "ENDED",
    "ERROR",
    "TRUE1",
    "TRUE2",
    "TRUE3",
    "FALSE1",
    "FALSE2",
    "FALSE3",
    "FALSE4",
    "NULL1",
    "NULL2",
    "NULL3",
    "STRING_DEFAULT",
    "STRING_AFTER_BACKSLASH",
    "STRING_UNICODE_DIGIT_1",
    "STRING_UNICODE_DIGIT_2",
    "STRING_UNICODE_DIGIT_3",
    "STRING_UNICODE_DIGIT_4",
    "STRING_INCOMPLETE_CHAR",
    "NUMBER_AFTER_INITIAL_MINUS",
    "NUMBER_AFTER_INITIAL_ZERO",
    "NUMBER_AFTER_INITIAL_NON_ZERO",
    "NUMBER_AFTER_FULL_STOP",
    "NUMBER_AFTER_DECIMAL",
    "NUMBER_AFTER_E",
    "NUMBER_AFTER_E_AND_SIGN",
    "NUMBER_AFTER_E_AND_DIGIT",
    "SEPARATOR",
    "BOM_OR_START",
    "BOM",
  ][tokenizerState];
}

export interface TokenizerOptions {
  stringBufferSize?: number;
  numberBufferSize?: number;
  separator?: string;
  emitPartialTokens?: boolean;
}

const defaultOpts: TokenizerOptions = {
  stringBufferSize: 0,
  numberBufferSize: 0,
  separator: undefined,
  emitPartialTokens: false,
};

export class TokenizerError extends Error {
  constructor(message: string) {
    super(message);
    // Typescript is broken. This is a workaround
    Object.setPrototypeOf(this, TokenizerError.prototype);
  }
}

export default class Tokenizer {
  private state = TokenizerStates.BOM_OR_START;

  private bom?: number[];
  private bomIndex = 0;

  private emitPartialTokens: boolean;
  private separator?: string;
  private separatorBytes?: Uint8Array;
  private separatorIndex = 0;
  private escapedCharsByteLength = 0;
  private bufferedString: StringBuilder;
  private bufferedNumber: StringBuilder;

  private unicode?: string; // unicode escapes
  private highSurrogate?: number;
  private bytes_remaining = 0; // number of bytes remaining in multi byte utf8 char to read after split boundary
  private bytes_in_sequence = 0; // bytes in multi byte utf8 char to read
  private char_split_buffer = new Uint8Array(4); // for rebuilding chars split before boundary is reached
  private encoder = new TextEncoder();
  private offset = -1;

  constructor(opts?: TokenizerOptions) {
    opts = { ...defaultOpts, ...opts };

    this.emitPartialTokens = opts.emitPartialTokens === true;
    this.bufferedString =
      opts.stringBufferSize && opts.stringBufferSize > 4
        ? new BufferedString(opts.stringBufferSize)
        : new NonBufferedString();
    this.bufferedNumber =
      opts.numberBufferSize && opts.numberBufferSize > 0
        ? new BufferedString(opts.numberBufferSize)
        : new NonBufferedString();

    this.separator = opts.separator;
    this.separatorBytes = opts.separator
      ? this.encoder.encode(opts.separator)
      : undefined;
  }

  public get isEnded(): boolean {
    return this.state === TokenizerStates.ENDED;
  }

  public write(input: Iterable<number> | string): void {
    try {
      let buffer: Uint8Array;
      if (input instanceof Uint8Array) {
        buffer = input;
      } else if (typeof input === "string") {
        buffer = this.encoder.encode(input);
      } else if (Array.isArray(input)) {
        buffer = Uint8Array.from(input);
      } else if (ArrayBuffer.isView(input)) {
        buffer = new Uint8Array(
          input.buffer,
          input.byteOffset,
          input.byteLength,
        );
      } else {
        throw new TypeError(
          "Unexpected type. The `write` function only accepts Arrays, TypedArrays and Strings.",
        );
      }

      for (let i = 0; i < buffer.length; i += 1) {
        const n = buffer[i]; // get current byte from buffer
        switch (this.state) {
          // @ts-expect-error fall through case
          case TokenizerStates.BOM_OR_START:
            if (input instanceof Uint8Array && n === 0xef) {
              this.bom = [0xef, 0xbb, 0xbf];
              this.bomIndex += 1;
              this.state = TokenizerStates.BOM;
              continue;
            }

            if (input instanceof Uint16Array) {
              if (n === 0xfe) {
                this.bom = [0xfe, 0xff];
                this.bomIndex += 1;
                this.state = TokenizerStates.BOM;
                continue;
              }
              if (n === 0xff) {
                this.bom = [0xff, 0xfe];
                this.bomIndex += 1;
                this.state = TokenizerStates.BOM;
                continue;
              }
            }

            if (input instanceof Uint32Array) {
              if (n === 0x00) {
                this.bom = [0x00, 0x00, 0xfe, 0xff];
                this.bomIndex += 1;
                this.state = TokenizerStates.BOM;
                continue;
              }
              if (n === 0xff) {
                this.bom = [0xff, 0xfe, 0x00, 0x00];
                this.bomIndex += 1;
                this.state = TokenizerStates.BOM;
                continue;
              }
            }
          // eslint-disable-next-line no-fallthrough
          case TokenizerStates.START:
            this.offset += 1;

            if (this.separatorBytes && n === this.separatorBytes[0]) {
              if (this.separatorBytes.length === 1) {
                this.state = TokenizerStates.START;
                this.onToken({
                  token: TokenType.SEPARATOR,
                  value: this.separator as string,
                  offset: this.offset + this.separatorBytes.length - 1,
                });
                continue;
              }
              this.state = TokenizerStates.SEPARATOR;
              continue;
            }

            if (
              n === charset.SPACE ||
              n === charset.NEWLINE ||
              n === charset.CARRIAGE_RETURN ||
              n === charset.TAB
            ) {
              // whitespace
              continue;
            }

            if (n === charset.LEFT_CURLY_BRACKET) {
              this.onToken({
                token: TokenType.LEFT_BRACE,
                value: "{",
                offset: this.offset,
              });
              continue;
            }
            if (n === charset.RIGHT_CURLY_BRACKET) {
              this.onToken({
                token: TokenType.RIGHT_BRACE,
                value: "}",
                offset: this.offset,
              });
              continue;
            }
            if (n === charset.LEFT_SQUARE_BRACKET) {
              this.onToken({
                token: TokenType.LEFT_BRACKET,
                value: "[",
                offset: this.offset,
              });
              continue;
            }
            if (n === charset.RIGHT_SQUARE_BRACKET) {
              this.onToken({
                token: TokenType.RIGHT_BRACKET,
                value: "]",
                offset: this.offset,
              });
              continue;
            }
            if (n === charset.COLON) {
              this.onToken({
                token: TokenType.COLON,
                value: ":",
                offset: this.offset,
              });
              continue;
            }
            if (n === charset.COMMA) {
              this.onToken({
                token: TokenType.COMMA,
                value: ",",
                offset: this.offset,
              });
              continue;
            }

            if (n === charset.LATIN_SMALL_LETTER_T) {
              this.state = TokenizerStates.TRUE1;
              continue;
            }

            if (n === charset.LATIN_SMALL_LETTER_F) {
              this.state = TokenizerStates.FALSE1;
              continue;
            }

            if (n === charset.LATIN_SMALL_LETTER_N) {
              this.state = TokenizerStates.NULL1;
              continue;
            }

            if (n === charset.QUOTATION_MARK) {
              this.bufferedString.reset();
              this.escapedCharsByteLength = 0;
              this.state = TokenizerStates.STRING_DEFAULT;
              continue;
            }

            if (n >= charset.DIGIT_ONE && n <= charset.DIGIT_NINE) {
              this.bufferedNumber.reset();
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO;
              continue;
            }

            if (n === charset.DIGIT_ZERO) {
              this.bufferedNumber.reset();
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_INITIAL_ZERO;
              continue;
            }

            if (n === charset.HYPHEN_MINUS) {
              this.bufferedNumber.reset();
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_INITIAL_MINUS;
              continue;
            }

            break;
          // STRING
          case TokenizerStates.STRING_DEFAULT:
            if (n === charset.QUOTATION_MARK) {
              const string = this.bufferedString.toString();
              this.state = TokenizerStates.START;
              this.onToken({
                token: TokenType.STRING,
                value: string,
                offset: this.offset,
              });
              this.offset +=
                this.escapedCharsByteLength +
                this.bufferedString.byteLength +
                1;
              continue;
            }

            if (n === charset.REVERSE_SOLIDUS) {
              this.state = TokenizerStates.STRING_AFTER_BACKSLASH;
              continue;
            }

            if (n >= 128) {
              // Parse multi byte (>=128) chars one at a time
              if (n >= 194 && n <= 223) {
                this.bytes_in_sequence = 2;
              } else if (n <= 239) {
                this.bytes_in_sequence = 3;
              } else {
                this.bytes_in_sequence = 4;
              }

              if (this.bytes_in_sequence <= buffer.length - i) {
                // if bytes needed to complete char fall outside buffer length, we have a boundary split
                this.bufferedString.appendBuf(
                  buffer,
                  i,
                  i + this.bytes_in_sequence,
                );
                i += this.bytes_in_sequence - 1;
                continue;
              }

              this.bytes_remaining = i + this.bytes_in_sequence - buffer.length;
              this.char_split_buffer.set(buffer.subarray(i));
              i = buffer.length - 1;
              this.state = TokenizerStates.STRING_INCOMPLETE_CHAR;
              continue;
            }

            if (n >= charset.SPACE) {
              this.bufferedString.appendChar(n);
              continue;
            }

            break;
          case TokenizerStates.STRING_INCOMPLETE_CHAR:
            // check for carry over of a multi byte char split between data chunks
            // & fill temp buffer it with start of this data chunk up to the boundary limit set in the last iteration
            this.char_split_buffer.set(
              buffer.subarray(i, i + this.bytes_remaining),
              this.bytes_in_sequence - this.bytes_remaining,
            );
            this.bufferedString.appendBuf(
              this.char_split_buffer,
              0,
              this.bytes_in_sequence,
            );
            i = this.bytes_remaining - 1;
            this.state = TokenizerStates.STRING_DEFAULT;
            continue;
          case TokenizerStates.STRING_AFTER_BACKSLASH:
            // eslint-disable-next-line no-case-declarations
            const controlChar = escapedSequences[n];
            if (controlChar) {
              this.bufferedString.appendChar(controlChar);
              this.escapedCharsByteLength += 1; // len(\")=2 minus the fact you're appending len(controlChar)=1
              this.state = TokenizerStates.STRING_DEFAULT;
              continue;
            }

            if (n === charset.LATIN_SMALL_LETTER_U) {
              this.unicode = "";
              this.state = TokenizerStates.STRING_UNICODE_DIGIT_1;
              continue;
            }

            break;
          case TokenizerStates.STRING_UNICODE_DIGIT_1:
          case TokenizerStates.STRING_UNICODE_DIGIT_2:
          case TokenizerStates.STRING_UNICODE_DIGIT_3:
            if (
              (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) ||
              (n >= charset.LATIN_CAPITAL_LETTER_A &&
                n <= charset.LATIN_CAPITAL_LETTER_F) ||
              (n >= charset.LATIN_SMALL_LETTER_A &&
                n <= charset.LATIN_SMALL_LETTER_F)
            ) {
              this.unicode += String.fromCharCode(n);
              this.state += 1;
              continue;
            }
            break;
          case TokenizerStates.STRING_UNICODE_DIGIT_4:
            if (
              (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) ||
              (n >= charset.LATIN_CAPITAL_LETTER_A &&
                n <= charset.LATIN_CAPITAL_LETTER_F) ||
              (n >= charset.LATIN_SMALL_LETTER_A &&
                n <= charset.LATIN_SMALL_LETTER_F)
            ) {
              const intVal = parseInt(
                this.unicode + String.fromCharCode(n),
                16,
              );
              let unicodeString: string;
              if (this.highSurrogate === undefined) {
                if (intVal >= 0xd800 && intVal <= 0xdbff) {
                  //<55296,56319> - highSurrogate
                  this.highSurrogate = intVal;
                  this.state = TokenizerStates.STRING_DEFAULT;
                  continue;
                } else {
                  unicodeString = String.fromCharCode(intVal);
                }
              } else {
                if (intVal >= 0xdc00 && intVal <= 0xdfff) {
                  //<56320,57343> - lowSurrogate
                  unicodeString = String.fromCharCode(
                    this.highSurrogate,
                    intVal,
                  );
                } else {
                  unicodeString = String.fromCharCode(this.highSurrogate);
                }
                this.highSurrogate = undefined;
              }
              const unicodeBuffer = this.encoder.encode(unicodeString);
              this.bufferedString.appendBuf(unicodeBuffer);
              // len(\u0000)=6 minus the fact you're appending len(buf)
              this.escapedCharsByteLength += 6 - unicodeBuffer.byteLength;
              this.state = TokenizerStates.STRING_DEFAULT;
              continue;
            }
            break;
          // Number
          case TokenizerStates.NUMBER_AFTER_INITIAL_MINUS:
            if (n === charset.DIGIT_ZERO) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_INITIAL_ZERO;
              continue;
            }

            if (n >= charset.DIGIT_ONE && n <= charset.DIGIT_NINE) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO;
              continue;
            }

            break;
          case TokenizerStates.NUMBER_AFTER_INITIAL_ZERO:
            if (n === charset.FULL_STOP) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_FULL_STOP;
              continue;
            }

            if (
              n === charset.LATIN_SMALL_LETTER_E ||
              n === charset.LATIN_CAPITAL_LETTER_E
            ) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_E;
              continue;
            }

            i -= 1;
            this.state = TokenizerStates.START;
            this.emitNumber();
            continue;
          case TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO:
            if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
              this.bufferedNumber.appendChar(n);
              continue;
            }

            if (n === charset.FULL_STOP) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_FULL_STOP;
              continue;
            }

            if (
              n === charset.LATIN_SMALL_LETTER_E ||
              n === charset.LATIN_CAPITAL_LETTER_E
            ) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_E;
              continue;
            }

            i -= 1;
            this.state = TokenizerStates.START;
            this.emitNumber();
            continue;
          case TokenizerStates.NUMBER_AFTER_FULL_STOP:
            if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_DECIMAL;
              continue;
            }

            break;
          case TokenizerStates.NUMBER_AFTER_DECIMAL:
            if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
              this.bufferedNumber.appendChar(n);
              continue;
            }

            if (
              n === charset.LATIN_SMALL_LETTER_E ||
              n === charset.LATIN_CAPITAL_LETTER_E
            ) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_E;
              continue;
            }

            i -= 1;
            this.state = TokenizerStates.START;
            this.emitNumber();
            continue;
          // @ts-expect-error fall through case
          case TokenizerStates.NUMBER_AFTER_E:
            if (n === charset.PLUS_SIGN || n === charset.HYPHEN_MINUS) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_E_AND_SIGN;
              continue;
            }
          // eslint-disable-next-line no-fallthrough
          case TokenizerStates.NUMBER_AFTER_E_AND_SIGN:
            if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
              this.bufferedNumber.appendChar(n);
              this.state = TokenizerStates.NUMBER_AFTER_E_AND_DIGIT;
              continue;
            }

            break;
          case TokenizerStates.NUMBER_AFTER_E_AND_DIGIT:
            if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
              this.bufferedNumber.appendChar(n);
              continue;
            }

            i -= 1;
            this.state = TokenizerStates.START;
            this.emitNumber();
            continue;
          // TRUE
          case TokenizerStates.TRUE1:
            if (n === charset.LATIN_SMALL_LETTER_R) {
              this.state = TokenizerStates.TRUE2;
              continue;
            }
            break;
          case TokenizerStates.TRUE2:
            if (n === charset.LATIN_SMALL_LETTER_U) {
              this.state = TokenizerStates.TRUE3;
              continue;
            }
            break;
          case TokenizerStates.TRUE3:
            if (n === charset.LATIN_SMALL_LETTER_E) {
              this.state = TokenizerStates.START;
              this.onToken({
                token: TokenType.TRUE,
                value: true,
                offset: this.offset,
              });
              this.offset += 3;
              continue;
            }
            break;
          // FALSE
          case TokenizerStates.FALSE1:
            if (n === charset.LATIN_SMALL_LETTER_A) {
              this.state = TokenizerStates.FALSE2;
              continue;
            }
            break;
          case TokenizerStates.FALSE2:
            if (n === charset.LATIN_SMALL_LETTER_L) {
              this.state = TokenizerStates.FALSE3;
              continue;
            }
            break;
          case TokenizerStates.FALSE3:
            if (n === charset.LATIN_SMALL_LETTER_S) {
              this.state = TokenizerStates.FALSE4;
              continue;
            }
            break;
          case TokenizerStates.FALSE4:
            if (n === charset.LATIN_SMALL_LETTER_E) {
              this.state = TokenizerStates.START;
              this.onToken({
                token: TokenType.FALSE,
                value: false,
                offset: this.offset,
              });
              this.offset += 4;
              continue;
            }
            break;
          // NULL
          case TokenizerStates.NULL1:
            if (n === charset.LATIN_SMALL_LETTER_U) {
              this.state = TokenizerStates.NULL2;
              continue;
            }
            break;
          case TokenizerStates.NULL2:
            if (n === charset.LATIN_SMALL_LETTER_L) {
              this.state = TokenizerStates.NULL3;
              continue;
            }
            break;
          case TokenizerStates.NULL3:
            if (n === charset.LATIN_SMALL_LETTER_L) {
              this.state = TokenizerStates.START;
              this.onToken({
                token: TokenType.NULL,
                value: null,
                offset: this.offset,
              });
              this.offset += 3;
              continue;
            }
            break;
          case TokenizerStates.SEPARATOR:
            this.separatorIndex += 1;
            if (
              !this.separatorBytes ||
              n !== this.separatorBytes[this.separatorIndex]
            ) {
              break;
            }
            if (this.separatorIndex === this.separatorBytes.length - 1) {
              this.state = TokenizerStates.START;
              this.onToken({
                token: TokenType.SEPARATOR,
                value: this.separator as string,
                offset: this.offset + this.separatorIndex,
              });
              this.separatorIndex = 0;
            }
            continue;
          // BOM support
          case TokenizerStates.BOM:
            if (n === this.bom![this.bomIndex]) {
              if (this.bomIndex === this.bom!.length - 1) {
                this.state = TokenizerStates.START;
                this.bom = undefined;
                this.bomIndex = 0;
                continue;
              }
              this.bomIndex += 1;
              continue;
            }
            break;
          case TokenizerStates.ENDED:
            if (
              n === charset.SPACE ||
              n === charset.NEWLINE ||
              n === charset.CARRIAGE_RETURN ||
              n === charset.TAB
            ) {
              // whitespace
              continue;
            }
        }

        throw new TokenizerError(
          `Unexpected "${String.fromCharCode(
            n,
          )}" at position "${i}" in state ${TokenizerStateToString(
            this.state,
          )}`,
        );
      }

      if (this.emitPartialTokens) {
        switch (this.state) {
          case TokenizerStates.TRUE1:
          case TokenizerStates.TRUE2:
          case TokenizerStates.TRUE3:
            this.onToken({
              token: TokenType.TRUE,
              value: true,
              offset: this.offset,
              partial: true,
            });
            break;
          case TokenizerStates.FALSE1:
          case TokenizerStates.FALSE2:
          case TokenizerStates.FALSE3:
          case TokenizerStates.FALSE4:
            this.onToken({
              token: TokenType.FALSE,
              value: false,
              offset: this.offset,
              partial: true,
            });
            break;
          case TokenizerStates.NULL1:
          case TokenizerStates.NULL2:
          case TokenizerStates.NULL3:
            this.onToken({
              token: TokenType.NULL,
              value: null,
              offset: this.offset,
              partial: true,
            });
            break;
          case TokenizerStates.STRING_DEFAULT: {
            const string = this.bufferedString.toString();
            this.onToken({
              token: TokenType.STRING,
              value: string,
              offset: this.offset,
              partial: true,
            });
            break;
          }
          case TokenizerStates.NUMBER_AFTER_INITIAL_ZERO:
          case TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO:
          case TokenizerStates.NUMBER_AFTER_DECIMAL:
          case TokenizerStates.NUMBER_AFTER_E_AND_DIGIT:
            try {
              this.onToken({
                token: TokenType.NUMBER,
                value: this.parseNumber(this.bufferedNumber.toString()),
                offset: this.offset,
                partial: true,
              });
            } catch {
              // Number couldn't be parsed. Do nothing.
            }
        }
      }
    } catch (err: unknown) {
      this.error(err as Error);
    }
  }

  private emitNumber(): void {
    this.onToken({
      token: TokenType.NUMBER,
      value: this.parseNumber(this.bufferedNumber.toString()),
      offset: this.offset,
    });
    this.offset += this.bufferedNumber.byteLength - 1;
  }

  protected parseNumber(numberStr: string): number {
    return Number(numberStr);
  }

  public error(err: Error): void {
    if (this.state !== TokenizerStates.ENDED) {
      this.state = TokenizerStates.ERROR;
    }

    this.onError(err);
  }

  public end(): void {
    switch (this.state) {
      case TokenizerStates.NUMBER_AFTER_INITIAL_ZERO:
      case TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO:
      case TokenizerStates.NUMBER_AFTER_DECIMAL:
      case TokenizerStates.NUMBER_AFTER_E_AND_DIGIT:
        this.state = TokenizerStates.ENDED;
        this.emitNumber();
        this.onEnd();
        break;
      case TokenizerStates.BOM_OR_START:
      case TokenizerStates.START:
      case TokenizerStates.ERROR:
      case TokenizerStates.SEPARATOR:
        this.state = TokenizerStates.ENDED;
        this.onEnd();
        break;
      default:
        this.error(
          new TokenizerError(
            `Tokenizer ended in the middle of a token (state: ${TokenizerStateToString(
              this.state,
            )}). Either not all the data was received or the data was invalid.`,
          ),
        );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onToken(parsedToken: ParsedTokenInfo): void {
    // Override me
    throw new TokenizerError(
      'Can\'t emit tokens before the "onToken" callback has been set up.',
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
