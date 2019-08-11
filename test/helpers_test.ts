'use strict';

import {assert} from 'chai';
import 'mocha';
import {circularDistance, Dictionary, mod} from '../lib/helpers';

describe('circularDistance', () => {
  specify('works', () => {
    assert.strictEqual(circularDistance(0, 9), 0, 'accepts 0 difference');
    assert.strictEqual(circularDistance(4, 9), 4, 'positive');
    assert.strictEqual(circularDistance(5, 9), -4, 'negative');
    assert.strictEqual(circularDistance(5, 10), 5, 'half-way is positive');
  });
});

describe('mod', () => {
  specify('works', () => {
    assert.strictEqual(mod(5, 3), 2, 'positive');
    assert.strictEqual(mod(-5, 3), 1, 'negative turned to positive');
    assert.strictEqual(mod(3, 3), 0, 'positive goes to zero');
    assert.strictEqual(mod(-3, 3), 0, 'negative goes to zero');
  });
});

describe('dictionary', () => {
  specify('works', () => {
    const d = new Dictionary('Invalid letter');
    d.set('C', 2);
    assert.strictEqual(d.has('C'), true);
    assert.strictEqual(d.has('D'), false);
    assert.strictEqual(d.get('C'), 2);
    assert.throws(() => d.get('D'), /Invalid letter: D/);
    assert.strictEqual(d.get('C', -1), 2);
    assert.strictEqual(d.get('D', -1), -1);
  });
});

// vim: set sw=2:
