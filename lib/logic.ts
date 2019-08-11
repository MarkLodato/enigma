// Logic of the Enigma Machine (no graphics).

'use strict';

import helpers = require('./helpers');

const mod = helpers.mod;
const Dictionary = helpers.Dictionary;

// ----------------------------------------------------------------------------
//                                 Interfaces
// ----------------------------------------------------------------------------

export interface Spec {
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  rotors: {[name: string]: {permutation: string, notch: string}};
  reflectors: {[name: string]: string};
  defaults: {rotor_order: string, reflector: string};
}

export interface LastValue {
  input: string;
  output: string;
}

export interface LastValueBidi {
  forward: LastValue;
  inverse: LastValue;
}

export interface LastValueFullEnigma {
  plugboard: LastValueBidi;
  rotors: LastValueBidi[];
  reflector: LastValue;
}

export type RotorPosition = 'l'|'m'|'r';

export interface EnigmaOnUpdateCallback {
  onPlugboardChange(permutation: Permutation, setting: string): void;
  onReflectorChange(name: string): void;
  onRotorOrderChange(order: string): void;
  onRotorChange(position: RotorPosition, name: string): void;
  onRingSettingChange(value: string): void;
  onIndicatorChange(value: string): void;
  onRingLocked(value: boolean): void;
  onEncrypt(values: LastValueFullEnigma): void;
}

// ----------------------------------------------------------------------------
//                           Standard Enigma Specs
// ----------------------------------------------------------------------------

// Source: http://www.cryptomuseum.com/crypto/enigma/wiring.htm
export let M3_DEF: Spec = {
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  rotors: {
    'I': {permutation: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q'},
    'II': {permutation: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E'},
    'III': {permutation: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V'},
    'IV': {permutation: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J'},
    'V': {permutation: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z'},
    'VI': {permutation: 'JPGVOUMFYQBENHZRDKASXLICTW', notch: 'ZM'},
    'VII': {permutation: 'NZJHGRCXMYSWBOUFAIVLPEKQDT', notch: 'ZM'},
    'VIII': {permutation: 'FKQHTLXOCBJSPDZRAMEWNIUYGV', notch: 'ZM'},
  },
  reflectors: {
    'A': 'EJMZALYXVBWFCRQUONTSPIKHGD',
    'B': 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
    'C': 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
  },
  defaults: {
    rotor_order: 'I-II-III',
    reflector: 'B',
  },
};

// ----------------------------------------------------------------------------
//                                  Alphabet
// ----------------------------------------------------------------------------

// A wrapper around an alphabet that ignores case (always uses uppercase) and
// has handy methods.
export class Alphabet {
  public readonly string: string;
  public readonly length: number;

  private readonly _to_index: helpers.Dictionary<number>;

  constructor(alphabet: string) {
    this.string = alphabet.toUpperCase();
    this.length = alphabet.length;
    this._to_index = new Dictionary<number>('Invalid letter');
    for (let i = 0; i < this.string.length; i++) {
      const letter = this.string[i];
      this._to_index.set(letter, i);
      this._to_index.set(letter.toLowerCase(), i);
    }
  }

  // Returns true if letter is valid.
  public valid(letter: string): boolean { return this._to_index.has(letter); }

  // Returns true if all elements in s are valid characters.
  public allValid(s: string): boolean {
    for (const character of s) {
      if (!this._to_index.has(character)) {
        return false;
      }
    }
    return true;
  }

  // Returns the 0-based index of the given letter or throws an error if letter
  // is not valid.
  public indexOf(letter: string): number { return this._to_index.get(letter); }

  // Returns the letter at the given 0-based index.
  public fromIndex(index: number): string { return this.string[index]; }

  // Converts an array of indices into a string.
  public fromIndices(...indices: number[]): string {
    let out = '';
    for (const idx of indices) {
      out += this.string[idx];
    }
    return out;
  }

  // Adds two letters by their indices, mod the alphabet length.
  public add(a: string|number, b: string|number): string {
    if (typeof a !== 'number') a = this.indexOf(a);
    if (typeof b !== 'number') b = this.indexOf(b);
    return this.string[mod(a + b, this.length)];
  }

  // Calls callback(letter, index) for each letter in the alphabet.
  public each(callback: (letter: string, index: number) => void) {
    for (let i = 0, len = this.string.length; i < len; i++) {
      callback(this.string.charAt(i), i);
    }
  }
}

// ----------------------------------------------------------------------------
//                                Permutation
// ----------------------------------------------------------------------------

// A permutation (aka simple substitution) of alphabet.
export class Permutation {
  public alphabet: Alphabet;
  public last_forward: LastValue = {input: '', output: ''};
  public last_inverse: LastValue = {input: '', output: ''};
  public string!: string;

  private _forward_table!: helpers.Dictionary<string>;
  private _inverse_table!: helpers.Dictionary<string>;

  constructor(permutation_string: string, alphabet: Alphabet) {
    this.alphabet = alphabet;
    this.setTo(permutation_string);
  }

  // Applies the permutation to the given letter.
  public forward(letter: string): string {
    letter = letter.toUpperCase();
    const output = this._forward_table.get(letter);
    this.last_forward = {input: letter, output: output};
    return output;
  }

  // Applies the inverse of the permutation to the given letter.
  public inverse(letter: string): string {
    letter = letter.toUpperCase();
    const output = this._inverse_table.get(letter);
    this.last_inverse = {input: letter, output: output};
    return output;
  }

  // Updates the permutation.  On error the permutation is unchanged.
  public setTo(permutation_string: string): void {
    permutation_string = permutation_string.toUpperCase();
    if (permutation_string.length !== this.alphabet.length) {
      throw Error('Invalid permutation: length ' + permutation_string.length +
                  ', expected ' + this.alphabet.length);
    }
    const forward_table = new Dictionary<string>('Invalid letter');
    const inverse_table = new Dictionary<string>('Invalid letter');
    for (let i = 0; i < this.alphabet.length; i++) {
      const plain = this.alphabet.fromIndex(i);
      const cipher = permutation_string[i];
      this.alphabet.indexOf(cipher);  // throws error if cipher invalid
      if (inverse_table.has(cipher)) {
        throw Error('Invalid permutation: letter ' + cipher +
                    ' used more than once');
      }
      forward_table.set(plain, cipher);
      inverse_table.set(cipher, plain);
    }

    this.string = permutation_string;
    this._forward_table = forward_table;
    this._inverse_table = inverse_table;
  }

  // Calls callback(plain_letter, cipher_letter) for each letter in the
  // alphabet.
  public eachPair(callback: (plain_letter: string,
                             cipher_letter: string) => void) {
    for (let i = 0; i < this.string.length; i++) {
      callback(this.alphabet.string[i], this.string[i]);
    }
  }
}

// ----------------------------------------------------------------------------
//                                   Rotor
// ----------------------------------------------------------------------------

// An Enigma machine rotor.
export class Rotor {
  public permutation: Permutation;
  public notch_string: string;

  private _notches: Set<number>;
  private _alphabet: Alphabet;
  private _indicator: number;
  private _ring_setting: number;

  constructor(permutation_string: string, notch_string: string,
              alphabet: Alphabet) {
    this.permutation = new Permutation(permutation_string, alphabet);
    this.notch_string = notch_string;
    this._notches = new Set<number>(
        [...notch_string].map((letter) => alphabet.indexOf(letter)));
    this._alphabet = alphabet;
    this._indicator = 0;
    this._ring_setting = 0;
  }

  get indicator(): number { return this._indicator; }
  set indicator(value: number) {
    this._indicator = mod(value, this._alphabet.length);
  }

  get ring_setting(): number { return this._ring_setting; }
  set ring_setting(value: number) {
    this._ring_setting = mod(value, this._alphabet.length);
  }

  public forward(letter: string): string {
    const offset = this._indicator - this._ring_setting;
    letter = this._alphabet.add(offset, letter);
    letter = this.permutation.forward(letter);
    return this._alphabet.add(-offset, letter);
  }

  public inverse(letter: string): string {
    const offset = this._indicator - this._ring_setting;
    letter = this._alphabet.add(offset, letter);
    letter = this.permutation.inverse(letter);
    return this._alphabet.add(-offset, letter);
  }

  public step(): void { this.indicator += 1; }

  public isOnNotch(): boolean { return this._notches.has(this._indicator); }
}

// ----------------------------------------------------------------------------
//                                 Plugboard
// ----------------------------------------------------------------------------

export class Plugboard {
  public permutation: Permutation;
  public string: string;

  private _alphabet: Alphabet;

  constructor(alphabet: Alphabet) {
    this._alphabet = alphabet;
    this.permutation = new Permutation(this._alphabet.string, this._alphabet);
    this.string = '';
  }

  public forward(letter: string): string {
    return this.permutation.forward(letter);
  }
  public inverse(letter: string): string {
    return this.permutation.inverse(letter);
  }

  // Sets the plugboard to the given value, e.g. 'AB FX'.
  public setTo(pair_string: string): void {
    pair_string = pair_string.toUpperCase();
    this.permutation.setTo(this._toPermutationString(pair_string));
    this.string = pair_string;
  }

  // Returns '' if pair_string is valid, else the error message.
  public validate(pair_string: string): string {
    try {
      this._toPermutationString(pair_string.toUpperCase());
      return '';
    } catch (e) {
      return e.message;
    }
  }

  // Returns a permutation string for the given pair string, or throws an error
  // if the input is invalid.  Example: 'AB DF' -> 'BACFEDG...Z'
  private _toPermutationString(pair_string: string): string {
    const out = this._alphabet.string.split('');
    const pairs = pair_string.toUpperCase().split(/\s+/);
    for (const pair of pairs) {
      if (pair === '') continue;
      if (pair.length !== 2 || pair[0] === pair[1]) {
        throw Error('Invalid plugboard pair: "' + pair + '"');
      }
      const i = this._alphabet.indexOf(pair[0]);
      const j = this._alphabet.indexOf(pair[1]);
      if (out[i] !== pair[0]) {
        throw Error('Plugboard value "' + pair[0] + '" used more than once');
      }
      if (out[j] !== pair[1]) {
        throw Error('Plugboard value "' + pair[1] + '" used more than once');
      }
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out.join('');
  }
}

// ----------------------------------------------------------------------------
//                                   Enigma
// ----------------------------------------------------------------------------

export class Enigma {
  private _spec: Spec;
  private _alphabet: Alphabet;
  private _plugboard: Plugboard;
  private _rotors!: Rotor[];
  private _reflector!: Rotor;
  private _rotor_order!: string;
  private _reflector_name!: string;
  private _ring_locked: boolean;  // only exists for callbacks
  private readonly _onUpdateCallbacks: EnigmaOnUpdateCallback[];

  constructor(spec: Spec) {
    this._onUpdateCallbacks = new Array<EnigmaOnUpdateCallback>();
    this._spec = spec;
    this._alphabet = new Alphabet(spec.alphabet);
    this._plugboard = new Plugboard(this._alphabet);
    this.setRotorOrder(spec.defaults.rotor_order);
    this.setReflector(spec.defaults.reflector);
    this._ring_locked = true;
  }

  public registerOnUpdateCallback(callback: EnigmaOnUpdateCallback) {
    this._onUpdateCallbacks.push(callback);
  }

  private _getRotorField(field: 'indicator'|'ring_setting') {
    return this._alphabet.fromIndices(
        this._rotors[0][field], this._rotors[1][field], this._rotors[2][field]);
  }

  private _setRotorField(field: 'indicator'|'ring_setting', value: string) {
    const error = this._validateRotorField(field, value);
    if (error) throw new Error(error);
    for (let i = 0; i < value.length; i++) {
      this._rotors[i][field] = this._alphabet.indexOf(value[i]);
    }
    this._callRotorUpdate(field);
  }

  private _validateRotorField(field: 'indicator'|'ring_setting',
                              value: string) {
    value = value.toUpperCase();
    if (value.length !== 3) {
      return field + ' length must be 3';
    }
    if (!this._alphabet.allValid(value)) {
      return 'invalid ' + field + ' letter: ' + value;
    }
    return '';
  }

  private _setRotorFieldAtIndex(index: number,
                                field: 'indicator'|'ring_setting',
                                value: string) {
    if (index < 0 || index > 3) {
      throw new Error('invalid Rotor index: ' + index);
    }
    if (!this._alphabet.valid(value)) {
      throw new Error('invalid letter: ' + value);
    }
    this._rotors[index][field] = this._alphabet.indexOf(value);
    this._callRotorUpdate(field);
  }

  private _callRotorUpdate(field: 'indicator'|'ring_setting') {
    if (field === 'indicator') {
      this._onUpdateCallbacks.forEach(
          c => c.onIndicatorChange(this.getIndicator()));
    } else {
      this._onUpdateCallbacks.forEach(
          c => c.onRingSettingChange(this.getRingSetting()));
    }
  }

  public getIndicator(): string { return this._getRotorField('indicator'); }
  public setIndicator(value: string): void {
    this._setRotorField('indicator', value);
  }
  public setIndicatorAtIndex(index: number, value: string): void {
    this._setRotorFieldAtIndex(index, 'indicator', value);
  }
  public validateIndicator(value: string): string {
    return this._validateRotorField('indicator', value);
  }

  public getRingSetting(): string {
    return this._getRotorField('ring_setting');
  }
  public setRingSetting(value: string): void {
    this._setRotorField('ring_setting', value);
  }
  public setRingSettingAtIndex(index: number, value: string): void {
    this._setRotorFieldAtIndex(index, 'ring_setting', value);
  }
  public validateRingSetting(value: string): string {
    return this._validateRotorField('ring_setting', value);
  }

  public getRotorOrder(): string { return this._rotor_order; }
  public setRotorOrder(value: string, validate_only = false): void {
    value = value.toUpperCase();
    const a = value.split('-');
    if (a.length !== 3) {
      throw new Error('Rotor order must be specified as I-II-III');
    }
    const new_rotors: Rotor[] = [];
    for (const rotor_name of a) {
      const rotor_spec = this._spec.rotors[rotor_name];
      if (rotor_spec === undefined) {
        throw Error('Invalid rotor name: ' + rotor_name);
      }
      new_rotors.push(
          new Rotor(rotor_spec.permutation, rotor_spec.notch, this._alphabet));
    }
    if (!validate_only) {
      const old_rotors = this._rotors;
      if (old_rotors) {
        for (let i = 0; i < new_rotors.length; i++) {
          new_rotors[i].indicator = old_rotors[i].indicator;
          new_rotors[i].ring_setting = old_rotors[i].ring_setting;
        }
      }
      this._rotors = new_rotors;
      this._rotor_order = value;
      this._onUpdateCallbacks.forEach(
          c => c.onRotorOrderChange(this._rotor_order));
      this._onUpdateCallbacks.forEach(c => c.onRotorChange('l', a[0]));
      this._onUpdateCallbacks.forEach(c => c.onRotorChange('m', a[1]));
      this._onUpdateCallbacks.forEach(c => c.onRotorChange('r', a[2]));
    }
  }
  public validateRotorOrder(value: string): string {
    try {
      this.setRotorOrder(value, true);
    } catch (e) {
      return e.message;
    }
    return '';
  }

  public getReflector(): string { return this._reflector_name; }
  public setReflector(name: string, validate_only = false): void {
    const _permutation = this._spec.reflectors[name];
    if (_permutation === undefined) {
      throw Error('Invalid reflector name: ' + name);
    }
    if (!validate_only) {
      this._reflector = new Rotor(_permutation, '', this._alphabet);
      this._reflector_name = name;
      this._onUpdateCallbacks.forEach(c => c.onReflectorChange(name));
    }
  }
  public validateReflector(name: string): string {
    try {
      this.setReflector(name, true);
    } catch (e) {
      return e.message;
    }
    return '';
  }
  public getReflectorPermutation(): Permutation {
    return this._reflector.permutation;
  }

  public getPlugboard(): string { return this._plugboard.string; }
  public setPlugboard(value: string): void {
    this._plugboard.setTo(value);
    this._onUpdateCallbacks.forEach(
        c => c.onPlugboardChange(this._plugboard.permutation,
                                 this._plugboard.string));
  }
  public validatePlugboard(value: string): string {
    return this._plugboard.validate(value);
  }
  public getPlugboardPermutation(): Permutation {
    return this._plugboard.permutation;
  }

  public setRingLocked(value: boolean): void {
    this._ring_locked = value;
    this._onUpdateCallbacks.forEach(c => c.onRingLocked(value));
  }

  // TODO test and document
  public getLastValues(): LastValueFullEnigma {
    return {
      plugboard: {
        forward: this._plugboard.permutation.last_forward,
        inverse: this._plugboard.permutation.last_inverse,
      },
      rotors: [
        {
          forward: this._rotors[0].permutation.last_forward,
          inverse: this._rotors[0].permutation.last_inverse,
        },
        {
          forward: this._rotors[1].permutation.last_forward,
          inverse: this._rotors[1].permutation.last_inverse,
        },
        {
          forward: this._rotors[2].permutation.last_forward,
          inverse: this._rotors[2].permutation.last_inverse,
        },
      ],
      reflector: this._reflector.permutation.last_forward,
    };
  }

  public isValidLetter(letter: string): boolean {
    return this._alphabet.valid(letter);
  }

  // Encrypts an entire message, stepping on each letter.
  public encryptMessage(message: string): string {
    let out = '';
    for (const character of message) {
      out += this.stepAndEncryptSingle(character);
    }
    return out;
  }

  // Steps the machine and encrypts a single letter, just like pushing
  // a keyboard button.
  public stepAndEncryptSingle(letter: string): string {
    this.step(true);
    return this.encryptSingleNoStep(letter);
  }

  // Encrypts a single letter without stepping.
  public encryptSingleNoStep(letter: string): string {
    let x = letter;
    x = this._plugboard.forward(x);
    x = this._rotors[2].forward(x);
    x = this._rotors[1].forward(x);
    x = this._rotors[0].forward(x);
    x = this._reflector.forward(x);
    x = this._rotors[0].inverse(x);
    x = this._rotors[1].inverse(x);
    x = this._rotors[2].inverse(x);
    x = this._plugboard.inverse(x);
    this._onUpdateCallbacks.forEach(c => c.onEncrypt(this.getLastValues()));
    return x;
  }

  // Steps the scrambler one position.
  public step(suppress_on_update: boolean): void {
    if (this._rotors[1].isOnNotch()) {
      this._rotors[0].step();
    }
    if (this._rotors[1].isOnNotch() || this._rotors[2].isOnNotch()) {
      this._rotors[1].step();
    }
    this._rotors[2].step();
    this._onUpdateCallbacks.forEach(
        c => c.onIndicatorChange(this.getIndicator()));
  }

  public saveState(state: URLSearchParams): void {
    state.set('rotor_order', this.getRotorOrder());
    state.set('ring_setting', this.getRingSetting());
    state.set('indicator', this.getIndicator());
    state.set('plugboard', this.getPlugboard());
    state.set('locked', this._ring_locked ? '1' : '0');
  }

  public loadState(state: URLSearchParams): void {
    function setIfValid(query_param: string, set: (value: string) => void) {
      const value = state.get(query_param);
      if (value === null) {
        return;
      }
      try {
        set(value);
      } catch (e) {
        console.warn('Invalid state value: %s=%s (%s)', query_param, value, e);
      }
    }
    function setBooleanIfValid(query_param: string,
                               set: (value: boolean) => void) {
      const value = state.get(query_param);
      if (value === null) {
        return;
      }
      if (value === '1') {
        set(true);
      } else if (value === '0') {
        set(false);
      } else {
        console.warn('Invalid state value: %s=%s (must be "0" or "1")',
                     query_param, value);
      }
    }
    setIfValid('rotor_order', (v) => this.setRotorOrder(v));
    setIfValid('ring_setting', (v) => this.setRingSetting(v));
    setIfValid('indicator', (v) => this.setIndicator(v));
    setIfValid('plugboard', (v) => this.setPlugboard(v));
    setBooleanIfValid('ring_locked', (v) => this.setRingLocked(v));
  }
}

// vim: set sw=2:
