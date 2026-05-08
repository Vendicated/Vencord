/* eslint-disable */
import Tokenizer, { type TokenizerOptions } from "./tokenizer.js";
import TokenParser, { type TokenParserOptions } from "./tokenparser.js";
import type { ParsedElementInfo } from "./utils/types/parsedElementInfo.js";
import type { ParsedTokenInfo } from "./utils/types/parsedTokenInfo.js";

export interface JSONParserOptions
  extends TokenizerOptions,
    TokenParserOptions {}

export default class JSONParser {
  private tokenizer: Tokenizer;
  private tokenParser: TokenParser;

  constructor(opts: JSONParserOptions = {}) {
    this.tokenizer = new Tokenizer(opts);
    this.tokenParser = new TokenParser(opts);

    this.tokenizer.onToken = this.tokenParser.write.bind(this.tokenParser);
    this.tokenizer.onEnd = () => {
      if (!this.tokenParser.isEnded) this.tokenParser.end();
    };

    this.tokenParser.onError = this.tokenizer.error.bind(this.tokenizer);
    this.tokenParser.onEnd = () => {
      if (!this.tokenizer.isEnded) this.tokenizer.end();
    };
  }

  public get isEnded(): boolean {
    return this.tokenizer.isEnded && this.tokenParser.isEnded;
  }

  public write(input: Iterable<number> | string): void {
    this.tokenizer.write(input);
  }

  public end(): void {
    this.tokenizer.end();
  }

  public set onToken(cb: (parsedTokenInfo: ParsedTokenInfo) => void) {
    this.tokenizer.onToken = (parsedToken) => {
      cb(parsedToken);
      this.tokenParser.write(parsedToken);
    };
  }

  public set onValue(cb: (parsedElementInfo: ParsedElementInfo) => void) {
    this.tokenParser.onValue = cb;
  }

  public set onError(cb: (err: Error) => void) {
    this.tokenizer.onError = cb;
  }

  public set onEnd(cb: () => void) {
    this.tokenParser.onEnd = () => {
      if (!this.tokenizer.isEnded) this.tokenizer.end();
      cb.call(this.tokenParser);
    };
  }
}
