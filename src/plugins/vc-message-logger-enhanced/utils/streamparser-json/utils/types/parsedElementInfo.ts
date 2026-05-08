/* eslint-disable */
import type { StackElement } from "./stackElement.js";
import type {
  JsonPrimitive,
  JsonKey,
  JsonObject,
  JsonArray,
  JsonStruct,
} from "./jsonTypes.js";

export interface ParsedElementInfo {
  value?: JsonPrimitive | JsonStruct;
  parent?: JsonStruct;
  key?: JsonKey;
  stack: StackElement[];
  partial?: boolean;
}

export interface ParsedArrayElement extends ParsedElementInfo {
  value: JsonPrimitive | JsonStruct;
  parent: JsonArray;
  key: number;
  stack: StackElement[];
}

export interface ParsedObjectProperty extends ParsedElementInfo {
  value: JsonPrimitive | JsonStruct;
  parent: JsonObject;
  key: string;
  stack: StackElement[];
}

export interface ParsedTopLevelElement extends ParsedElementInfo {
  value: JsonPrimitive | JsonStruct;
  parent: undefined;
  key: undefined;
  stack: [];
}
