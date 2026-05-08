/* eslint-disable simple-header/header */

import { IDBPDatabase, IDBPIndex } from "./entry.js";
import { Func } from "./util.js";
import { replaceTraps } from "./wrap-idb-value.js";

const readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
const writeMethods = ["put", "add", "delete", "clear"];
const cachedMethods = new Map<string, Func>();

function getMethod(
  target: any,
  prop: string | number | symbol,
): Func | undefined {
  if (
    !(
      target instanceof IDBDatabase &&
      !(prop in target) &&
      typeof prop === "string"
    )
  ) {
    return;
  }

  if (cachedMethods.get(prop)) return cachedMethods.get(prop);

  const targetFuncName: string = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);

  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
    !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }

  const method = async function (
    this: IDBPDatabase,
    storeName: string,
    ...args: any[]
  ) {
    // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target:
      | typeof tx.store
      | IDBPIndex<unknown, string[], string, string, "readwrite" | "readonly"> =
      tx.store;
    if (useIndex) target = target.index(args.shift());

    // Must reject if op rejects.
    // If it's a write operation, must reject if tx.done rejects.
    // Must reject with op rejection first.
    // Must resolve with op value.
    // Must handle both promises (no unhandled rejections)
    return (
      await Promise.all([
        (target as any)[targetFuncName](...args),
        isWrite && tx.done,
      ])
    )[0];
  };

  cachedMethods.set(prop, method);
  return method;
}

replaceTraps(oldTraps => ({
  ...oldTraps,
  get: (target, prop, receiver) =>
    getMethod(target, prop) || oldTraps.get!(target, prop, receiver),
  has: (target, prop) =>
    !!getMethod(target, prop) || oldTraps.has!(target, prop),
}));
