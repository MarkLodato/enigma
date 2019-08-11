'use strict';

import {assert} from 'chai';
import 'mocha';
import * as logic from '../lib/logic';

describe('Alphabet', () => {
  const a = new logic.Alphabet('ABcd');

  specify('#valid()', () => {
    assert.isTrue(a.valid('B'));
    assert.isTrue(a.valid('b'));
    assert.isTrue(a.valid('C'));
    assert.isTrue(a.valid('c'));
    assert.isFalse(a.valid('X'));
  });

  specify('#allValid()', () => {
    assert.isTrue(a.allValid('cAdAB'));
    assert.isTrue(a.allValid('CADAB'));
    assert.isTrue(a.allValid('cadab'));
    assert.isFalse(a.allValid('ABX'));
    assert.isTrue(a.allValid(''));
  });

  specify('#indexOf()', () => {
    assert.strictEqual(a.indexOf('B'), 1);
    assert.throws(() => a.indexOf('X'), /Invalid letter: X/);
  });

  specify('#fromIndex()', () => {
    assert.strictEqual(a.fromIndex(1), 'B');
    assert.strictEqual(a.fromIndex(2), 'C');
    assert.isUndefined(a.fromIndex(5));
    assert.isUndefined(a.fromIndex(-1));
  });

  specify('#fromIndices()', () => {
    assert.strictEqual(a.fromIndices(2, 0, 1), 'CAB');
    assert.strictEqual(a.fromIndices(), '');
  });

  specify('#add()', () => {
    assert.strictEqual(a.add('C', 1), 'D');
    assert.strictEqual(a.add('C', -1), 'B');
    assert.strictEqual(a.add('C', 2), 'A');
  });

  specify('#each()', () => {
    const observed: Array<[string, number]> = [];
    a.each((letter: string, index: number) => {
      observed.push([letter, index]);
    });
    assert.deepEqual(observed, [['A', 0], ['B', 1], ['C', 2], ['D', 3]]);
  });
});

describe('Permutation', () => {
  specify('normal forward/inverse', () => {
    const p = new logic.Permutation('AcBeFd', new logic.Alphabet('ABCDEF'));
    assert.strictEqual(p.string, 'ACBEFD');
    assert.strictEqual(p.forward('E'), 'F', 'forward: uppercase');
    assert.strictEqual(p.forward('e'), 'F', 'forward: lowercase');
    assert.strictEqual(p.inverse('E'), 'D', 'inverse: uppercase');
    assert.strictEqual(p.inverse('e'), 'D', 'inverse: lowercase');
    assert.deepEqual(p.last_forward, {input: 'E', output: 'F'});
    assert.deepEqual(p.last_inverse, {input: 'E', output: 'D'});
  });

  specify('#eachPair()', () => {
    const p = new logic.Permutation('AcBeFd', new logic.Alphabet('ABCDEF'));
    const observed: {[name: string]: string} = {};
    p.eachPair((plain, cipher) => { observed[plain] = cipher; });
    assert.deepEqual(observed,
                     {A: 'A', B: 'C', C: 'B', D: 'E', E: 'F', F: 'D'});
  });

  specify('#setTo()', () => {
    const p = new logic.Permutation('AcBeFd', new logic.Alphabet('ABCDEF'));
    p.setTo('FDBcae');
    assert.strictEqual(p.string, 'FDBCAE');
    assert.strictEqual(p.forward('a'), 'F', 'forward after setTo');
    assert.strictEqual(p.inverse('a'), 'E', 'inverse after setTo');
    assert.throws(() => p.setTo('abc'),
                  /Invalid permutation: length 3, expected 6/);
    assert.throws(() => p.setTo('abcdex'), /Invalid letter: X/);
    assert.throws(() => p.setTo('abcdea'),
                  /Invalid permutation: letter A used more than once/);
    assert.strictEqual(p.string, 'FDBCAE',
                       'should be unmodified after invalid calls to setTo');
  });
});

describe('Rotor', () => {
  const r = new logic.Rotor('BFADCE', 'BC', new logic.Alphabet('ABCDEF'));

  specify('starting position', () => {
    assert.strictEqual(r.indicator, 0);
    assert.strictEqual(r.ring_setting, 0);
    assert.strictEqual(r.isOnNotch(), false);
    assert.strictEqual(r.forward('a'), 'B');
    assert.strictEqual(r.inverse('b'), 'A');
  });

  specify('step', () => {
    r.step();
    assert.strictEqual(r.indicator, 1);
    assert.strictEqual(r.ring_setting, 0);
    assert.strictEqual(r.isOnNotch(), true);
    assert.strictEqual(r.forward('a'), 'E');
    assert.strictEqual(r.inverse('e'), 'A');
  });

  specify('indicator uses modulus', () => {
    r.indicator = -2;
    assert.strictEqual(r.indicator, 4);
    r.indicator = 7;
    assert.strictEqual(r.indicator, 1);
  });

  specify('setting ring_setting', () => {
    r.ring_setting = 1;
    r.indicator = 0;
    assert.strictEqual(r.indicator, 0);
    assert.strictEqual(r.ring_setting, 1);
    assert.strictEqual(r.isOnNotch(), false);
    assert.strictEqual(r.forward('a'), 'F');
    assert.strictEqual(r.inverse('f'), 'A');
    r.step();
    assert.strictEqual(r.indicator, 1);
    assert.strictEqual(r.ring_setting, 1);
    assert.strictEqual(r.isOnNotch(), true);
    assert.strictEqual(r.forward('a'), 'B');
    assert.strictEqual(r.inverse('b'), 'A');
  });
});

describe('Plugboard', () => {
  function forwardAll(plugboard: logic.Plugboard, value: string) {
    return value.split('').map((letter) => plugboard.forward(letter)).join('');
  }

  const p = new logic.Plugboard(new logic.Alphabet('ABCDEF'));

  specify('regular setting', () => {
    p.setTo('ab cd');
    assert.strictEqual(p.string, 'AB CD', 'should convert to uppercase');
    assert.strictEqual(p.forward('A'), 'B');
    assert.strictEqual(p.inverse('A'), 'B');
    assert.strictEqual(forwardAll(p, 'ABCDEF'), 'BADCEF');
  });

  specify('identity', () => {
    p.setTo('');
    assert.strictEqual(forwardAll(p, 'ABCDEF'), 'ABCDEF');
  });

  specify('setTo() throws on invalid input', () => {
    p.setTo('AB CD');
    assert.throws(() => p.setTo('A'), /Invalid plugboard pair: "A"/);
    assert.strictEqual(p.string, 'AB CD',
                       'invalid setTo should not invalidate object');
  });

  specify('validation', () => {
    // This all assumes that setTo() calls validate() so we just call validate.
    assert.strictEqual(p.validate('AB CD'), '');
    assert.strictEqual(p.validate('A'), 'Invalid plugboard pair: "A"');
    assert.strictEqual(p.validate('AA'), 'Invalid plugboard pair: "AA"');
    assert.strictEqual(p.validate('AAA'), 'Invalid plugboard pair: "AAA"');
    assert.strictEqual(p.validate('AB AC'),
                       'Plugboard value "A" used more than once');
    assert.strictEqual(p.validate('AB CA'),
                       'Plugboard value "A" used more than once');
  });
});

describe('Enigma', () => {
  const m3 = new logic.Enigma(logic.M3_DEF);

  specify('test vector with default setting', () => {
    // Default value is I-II-III, UKW-B, indicator AAA, ring setting AAA.
    assert.strictEqual(m3.encryptMessage('AAAAAAAAAAAAAAAA'),
                       'BDZGOWCXLTKSBTMC');
  });

  specify('ring setting works', () => {
    m3.setIndicator('AAA');
    m3.setRingSetting('BBB');
    assert.strictEqual(m3.encryptMessage('AAAAA'), 'EWTYX');
  });

  // TODO: constructor validation tests
  // TODO: uses spec.default
  // TODO: get/set indicator setting
  // TODO: get/set ring setting
  // TODO: get/set rotor order
  // TODO: get/set reflector
  // TODO: get/set plugboard
  // TODO: save/load state
  // TODO: stepping (double, left on notch)
});

// vim: set sw=2:
