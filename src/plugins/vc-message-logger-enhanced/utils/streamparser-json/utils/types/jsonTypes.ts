/* eslint-disable */
export type JsonPrimitive = string | number | boolean | null;
export type JsonKey = string | number | undefined;
export type JsonObject = { [key: string]: JsonPrimitive | JsonStruct };
export type JsonArray = (JsonPrimitive | JsonStruct)[];
export type JsonStruct = JsonObject | JsonArray;
