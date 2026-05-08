/* eslint-disable simple-header/header */

export type Constructor = new (...args: any[]) => any;
export type Func = (...args: any[]) => any;

export const instanceOfAny = (
  object: any,
  constructors: Constructor[],
): boolean => constructors.some(c => object instanceof c);
