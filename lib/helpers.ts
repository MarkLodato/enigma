// Miscellaneous helper functions.

'use strict';

// ----------------------------------------------------------------------------
//                                 Functions
// ----------------------------------------------------------------------------

// Given the difference between two points on a circle, returns the shortest
// distance between them, either positive or negative.
export function circularDistance(difference: number, divisor: number): number {
  let d = mod(difference, divisor);
  if (d > divisor / 2) {
    d -= divisor;
  }
  return d;
}

// Returns a % n, ensuring the result is always positive.
export function mod(a: number, n: number): number {
  let result = a % n;
  if (result < 0) {
    result += n;
  }
  return result;
}

// ----------------------------------------------------------------------------
//                                 Dictionary
// ----------------------------------------------------------------------------

// An Object that throws an error if a key does not exist.
export class Dictionary<T> {
  private _map: {[key: string]: T};
  private _message: string;

  constructor(message: string = 'Key not found') {
    this._map = {};
    this._message = message;
  }

  public set(key: string, value: T): void { this._map[key] = value; }
  public has(key: string): boolean { return this._map.hasOwnProperty(key); }
  public get(key: string, default_value?: T): T {
    if (this.has(key)) return this._map[key];
    if (default_value !== undefined) return default_value;
    throw Error(this._message + ': ' + key);
  }
}

// ----------------------------------------------------------------------------
//                            UnreachableCaseError
// ----------------------------------------------------------------------------

export class UnreachableCaseError extends Error {
  constructor(val: never) { super(`Unreachable case: ${val}`); }
}

// vim: set sw=2:
