/* eslint-disable */
import TokenType from "./tokenType.js";
import type { JsonPrimitive } from "./jsonTypes.js";

export interface ParsedTokenInfo {
  token: TokenType;
  value: JsonPrimitive;
  offset: number;
  partial?: boolean;
}

export interface ParsedLeftBraceTokenInfo extends ParsedTokenInfo {
  token: TokenType.LEFT_BRACE;
  value: "{";
}
export interface ParsedRightBraceTokenInfo extends ParsedTokenInfo {
  token: TokenType.RIGHT_BRACE;
  value: "}";
}
export interface ParsedLeftBracketTokenInfo extends ParsedTokenInfo {
  token: TokenType.LEFT_BRACKET;
  value: "[";
}
export interface ParsedRighBracketTokenInfo extends ParsedTokenInfo {
  token: TokenType.RIGHT_BRACKET;
  value: "]";
}
export interface ParsedColonTokenInfo extends ParsedTokenInfo {
  token: TokenType.COLON;
  value: ":";
}
export interface ParsedCommaTokenInfo extends ParsedTokenInfo {
  token: TokenType.COMMA;
  value: ",";
}
export interface ParsedTrueTokenInfo extends ParsedTokenInfo {
  token: TokenType.TRUE;
  value: true;
}
export interface ParsedFalseTokenInfo extends ParsedTokenInfo {
  token: TokenType.FALSE;
  value: false;
}
export interface ParsedNullTokenInfo extends ParsedTokenInfo {
  token: TokenType.NULL;
  value: null;
}
export interface ParsedStringTokenInfo extends ParsedTokenInfo {
  token: TokenType.STRING;
  value: string;
}
export interface ParsedNumberTokenInfo extends ParsedTokenInfo {
  token: TokenType.NUMBER;
  value: number;
}
export interface ParsedSeparatorTokenInfo extends ParsedTokenInfo {
  token: TokenType.SEPARATOR;
  value: string;
}
