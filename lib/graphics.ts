// Graphics of the Enigma Machine.
//
// TODO: Fix bug where drawing is incorrect when scroll is not at top.

'use strict';

import SVG = require('svg.js');
import {clearClassKey, getElementByIdOrThrow, getSVGGraphicsElementByIdOrThrow, setClassKeyValue} from './dom';
import {draggable, DragState} from './drag';
import {circularDistance, mod, UnreachableCaseError} from './helpers';
import logic = require('./logic');
import {addPoints, donut, fromPolar, SvgPathBuilder} from './svg';

const Alphabet = logic.Alphabet;

// ----------------------------------------------------------------------------
//                                 Constants
// ----------------------------------------------------------------------------

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYBOARD_ORDER = 'PQAYWSXEDCRFVTGBZHNUJMIKLO';

const KEYBOARD_X = 50;
const KEYBOARD_Y = 350;
const DISPLAY_Y = 125;

const KEY_RADIUS = 20;
const KEY_ROW_SPACING = KEY_RADIUS * 3;
const KEY_COL_SPACING = KEY_RADIUS * 1.11;
const KEY_FONT_SIZE = 20;

const ROTOR_CX = 1175;
const ROTOR_CY = 450;
const REFLECTOR_RADIUS = 50;
const REFLECTOR_RING_WIDTH = 15;
const REFLECTOR_FONT_SIZE = 11;
const ROTOR_WIDTH = 110;
const RING_WIDTH = 20;
const RING_FONT_SIZE = 15;
const WINDOW_THICKNESS = 5;
const A_DOT_RADIUS = 5;

const PLUGBOARD_TOP = 600;
const PLUGBOARD_HEIGHT = 150;
const PLUGBOARD_LETTER_HEIGHT = 20;
const PLUGBOARD_FONT_SIZE = 15;
const PLUGBOARD_HANDLE_WIDTH = 10;
const PLUGBOARD_HANDLE_HEIGHT = 10;
const PLUGBOARD_MAX_DRAG_Y_OFFSET = PLUGBOARD_HEIGHT / 2;

const ETW_HEIGHT = 140;
const ETW_X_OFFSET = 50;
const WIRE_TOP = 30;
const ROTOR_IN_LENGTH = 10;

const HIGHLIGHT_STROKE_WIDTH = 5;

const FONT_VERTICAL_OFFSET = 0.35;

const ANIMATION_MS = 250;

// ----------------------------------------------------------------------------
//                          TypeScript declarations
// ----------------------------------------------------------------------------

// NOTE: dataset is not yet standardized for SVG so it's not in TypeScript.
// It is however supported in all browsers by IE/Edge.
declare global {
  interface SVGElement {
    readonly dataset: DOMStringMap;
  }
}

// ----------------------------------------------------------------------------
//                              Helper Functions
// ----------------------------------------------------------------------------

const kAlphabet = new Alphabet(ALPHABET);
const kKeyboardOrder = new Alphabet(KEYBOARD_ORDER);

function keyX(column: number): number {
  return KEY_RADIUS + column * KEY_COL_SPACING;
}

function keyY(column: number): number {
  const row = (column + 2) % 3;
  return KEY_RADIUS + row * KEY_ROW_SPACING;
}

// Converts a keyboard x-offset to a numerical letter offset.
function keyXOffsetToLetterOffset(dx: number): number {
  return Math.round(dx / KEY_COL_SPACING);
}

// Permutes the integers mod n such that adjacent elements are far apart.
function spread(i: number, n: number): number {
  // The following multipliers were selected by hand.  n and mult must be
  // relatively prime, and computing this for an arbitrary n is more work than
  // I cared to figure out.
  // https://en.wikipedia.org/wiki/Polygram_(geometry)
  const table: {[n: number]: number} =
      {5: 2, 7: 3, 8: 3, 9: 4, 10: 2, 11: 4, 12: 5, 13: 5, 26: 11};
  const mult = table[n] || 1;
  return (i * mult) % n;
}

// ----------------------------------------------------------------------------
//                             Drawing Functions
// ----------------------------------------------------------------------------

// We keep all of the drawing functions separate so that we could eventually use
// a static SVG image if desired.
function drawEverything(svg: HTMLElement, spec: logic.Spec) {
  const draw = SVG(svg);

  // TODO make 1600x900 parameterized or dynamic or something
  draw.size(1600, 900).viewbox(0, 0, 1600, 900);

  const keyboardEnclosure =
      draw.group().id('g-keyboard-enclosure').translate(KEYBOARD_X, DISPLAY_Y);
  const display = drawKeyboardLike(keyboardEnclosure.group().id('g-display'));
  const keyboard = drawKeyboardLike(keyboardEnclosure.group()
                                        .id('g-keyboard')
                                        .translate(0, KEYBOARD_Y - DISPLAY_Y));
  const plugboard = drawPlugboard(keyboardEnclosure.group()
                                      .id('g-plugboard')
                                      .translate(0, PLUGBOARD_TOP - DISPLAY_Y));

  const rotorEnclosure =
      draw.group().id('g-rotor-enclosure').translate(ROTOR_CX, ROTOR_CY);
  drawRotor(rotorEnclosure.group().id('g-rotor-r'),
            REFLECTOR_RADIUS + 3 * ROTOR_WIDTH, spec);
  drawRotor(rotorEnclosure.group().id('g-rotor-m'),
            REFLECTOR_RADIUS + 2 * ROTOR_WIDTH, spec);
  drawRotor(rotorEnclosure.group().id('g-rotor-l'),
            REFLECTOR_RADIUS + 1 * ROTOR_WIDTH, spec);
  drawReflector(rotorEnclosure.group().id('g-reflector'), REFLECTOR_RADIUS,
                spec);
  drawRotorFrame(rotorEnclosure.group().id('g-rotor-frame'), REFLECTOR_RADIUS,
                 ROTOR_WIDTH);
  drawRotorHotspots(rotorEnclosure.group().id('g-rotor-hotspots'),
                    REFLECTOR_RADIUS, ROTOR_WIDTH);

  const connectorEnclosure = draw.group().id('g-connectors');
  drawDisplayKeyboardConnector(
      connectorEnclosure.group().id('g-display-to-keyboard'), display.rbox(),
      keyboard.rbox());
  drawKeyboardPlugboardConnector(
      connectorEnclosure.group().id('g-keyboard-to-plugboard'), keyboard.rbox(),
      plugboard.rbox());
  drawPlugboardRotorConnector(
      connectorEnclosure.group().id('g-plugboard-to-rotor'), plugboard.rbox(),
      {cx: ROTOR_CX, cy: ROTOR_CY, r: REFLECTOR_RADIUS + 3 * ROTOR_WIDTH});
  connectorEnclosure.back();
}

function drawKeyboardLike(container: SVG.Container): SVG.Container {
  const name = container.id();
  container.addClass('keyboard-like');
  kKeyboardOrder.each((letter, column) => {
    const key = container.group()
                    .center(keyX(column), keyY(column))
                    .id(`${name}-key-${letter}`)
                    .addClass('keyboard-key')
                    .addClass(`letter-${letter}`);
    key.circle(2 * KEY_RADIUS).center(0, 0);
    key.plain(letter);
  });
  return container;
}

function drawPlugboard(container: SVG.Container): SVG.Container {
  const name = container.id();
  const height = PLUGBOARD_HEIGHT;
  const width = KEY_RADIUS + kAlphabet.length * KEY_COL_SPACING;

  const topBox = container.group().id(`${name}-top`);
  const bottomBox = container.group().id(`${name}-bottom`);
  const wires = container.group().id(`${name}-wires`);
  kAlphabet.each((letter, column) => {
    const x = keyX(column);
    topBox.plain(letter).attr({x: x, y: PLUGBOARD_LETTER_HEIGHT / 2});
    bottomBox.plain(letter).attr(
        {x: x, y: height - PLUGBOARD_LETTER_HEIGHT / 2});
    const wireGroup = wires.group().addClass(`color-${letter}`);
    wireGroup.path()
        .id(`${name}-${letter}`)
        .addClass(`wire-${letter}`)
        .addClass(`offset-0`)
        .addClass('wire')
        // We use a path here so that we can animate it via CSS. We also
        // translate first so that the path can start at 0,0.
        .translate(x, PLUGBOARD_LETTER_HEIGHT)
        .plot(new SvgPathBuilder()
                  .M(0, 0)
                  .L(0, height - 2 * PLUGBOARD_LETTER_HEIGHT)
                  .build());
    wireGroup.rect(PLUGBOARD_HANDLE_WIDTH, PLUGBOARD_HANDLE_HEIGHT)
        .id(`${name}-${letter}-drag-cipher`)
        .attr({
          x: x - PLUGBOARD_HANDLE_WIDTH / 2,
          y: height - PLUGBOARD_LETTER_HEIGHT - PLUGBOARD_HANDLE_HEIGHT,
        })
        .addClass(`fill-color-${letter}`)
        .addClass(`plugboard-hotspot`);
  });

  container.path().addClass('box').plot(
      new SvgPathBuilder()
          .M(0, 0)
          .h(width)
          .v(height)
          .h(-width)
          .z()
          .m(0, PLUGBOARD_LETTER_HEIGHT)
          .h(width)
          .m(0, height - 2 * PLUGBOARD_LETTER_HEIGHT)
          .h(-width)
          .build());

  return container;
}

// Draw the circles and the window, all of which does not rotate.
function drawRotorFrame(container: SVG.Container, reflectorRadius: number,
                        rotorWidth: number): SVG.Container {
  const center = {cx: 0, cy: 0};
  for (let i = 0; i <= 3; i++) {
    const outer_radius = reflectorRadius + i * rotorWidth;
    const ring_width = i === 0 ? REFLECTOR_RING_WIDTH : RING_WIDTH;
    const inner_radius = outer_radius - ring_width;
    container.circle(outer_radius * 2).attr(center).addClass('ring-line');
    container.circle(inner_radius * 2).attr(center).addClass('ring-line');
    if (i >= 1) {
      const width = ring_width + WINDOW_THICKNESS;
      container.rect(width, width)
          .addClass('ring-window')
          .radius(WINDOW_THICKNESS)
          .cx(inner_radius + ring_width / 2)
          .cy(0);
    }
  }
  return container;
}

// Draw invisible hotspots for dragging the rotors.
function drawRotorHotspots(container: SVG.Container, reflectorRadius: number,
                           rotorWidth: number): SVG.Container {
  function draw(idPrefix: string, outer_radius: number) {
    container.path()
        .id(`${idPrefix}-ring`)
        .addClass('rotor-hotspot')
        .plot(donut(outer_radius, RING_WIDTH));
    container.path()
        .id(`${idPrefix}-wires`)
        .addClass('rotor-hotspot')
        .plot(donut(outer_radius - RING_WIDTH, rotorWidth - RING_WIDTH));
  }
  draw('g-rotor-r-hotspot', reflectorRadius + 3 * rotorWidth);
  draw('g-rotor-m-hotspot', reflectorRadius + 2 * rotorWidth);
  draw('g-rotor-l-hotspot', reflectorRadius + 1 * rotorWidth);
  return container;
}

// Draw the letters within the ring (but not the circles or the window, since
// those don't rotate).
function drawRingLetters(container: SVG.Container, outer_radius: number,
                         ring_width: number): SVG.Container {
  const name = container.id();
  const inner_radius = outer_radius - ring_width;
  kAlphabet.each((letter, i) => {
    container.plain(letter)
        .attr({x: inner_radius + ring_width / 2, y: 0})
        .transform({cx: 0, cy: 0, rotation: i * 360 / kAlphabet.length})
        .addClass('ring-letter')
        .id(`${name}-letter-${letter}`);
  });
  return container;
}

// Draw the wires within a rotor.
function drawRotorWires(container: SVG.Container, outer_radius: number,
                        permutation: logic.Permutation): SVG.Container {
  container.addClass('rotor-wires-instance');
  const name = container.id();
  const N = kAlphabet.length;
  const r_outer = outer_radius - RING_WIDTH;
  const r_inner = outer_radius - ROTOR_WIDTH;
  const kGap = 0.05 * (ROTOR_WIDTH - RING_WIDTH);
  const kBand = 0.9 * (ROTOR_WIDTH - RING_WIDTH);
  permutation.eachPair((plain, cipher) => {
    const i = kAlphabet.indexOf(plain);
    const j = kAlphabet.indexOf(cipher);
    const i_angle = 360 * i / N;
    const j_angle = 360 * j / N;
    const d = circularDistance(j - i, N);
    const half_angle = 360 * 0.5 / N * Math.sign(d);
    const r = r_outer - kGap - spread(i, N) * kBand / N;

    const path = new SvgPathBuilder();
    path.moveTo(fromPolar({deg: i_angle, r: r_outer}));
    // Really we should use a cubic curve such that handle1 is orthogonal to
    // the ring and handle2 is tangent to the ring at the second point.  This
    // cubic satisfies the first property but is slightly off on the second,
    // resulting in a very slight kink.
    path.quadraticCurveTo(fromPolar({deg: i_angle, r: r}),
                          fromPolar({deg: i_angle + half_angle, r: r}));
    if (Math.abs(d) > 1) {
      path.arcTo({r: r, sweep: d > 0},
                 fromPolar({deg: j_angle - half_angle, r: r}));
    }
    path.quadraticCurveTo(fromPolar({deg: j_angle, r: r}),
                          fromPolar({deg: j_angle, r: r_inner}));

    container.path()
        .addClass(`wire-${plain}`)
        .addClass(`color-${plain}`)
        .addClass('wire')
        .plot(path.build());
  });
  return container;
}

function drawReflectorWires(container: SVG.Container, outer_radius: number,
                            permutation: logic.Permutation): SVG.Container {
  container.addClass('rotor-wires-instance');
  const name = container.id();
  const N = kAlphabet.length;
  const radius = outer_radius - REFLECTOR_RING_WIDTH;
  const handle = 0.6 * radius;
  let color_index = 0;
  permutation.eachPair((plain, cipher) => {
    const i = kAlphabet.indexOf(plain);
    const j = kAlphabet.indexOf(cipher);
    if (i <= j) {
      const color = kAlphabet.fromIndex(color_index);
      const i_angle = 360 * i / N;
      const j_angle = 360 * j / N;
      const path = new SvgPathBuilder();
      path.moveTo(fromPolar({deg: i_angle, r: radius}));
      path.cubicCurveTo(fromPolar({deg: i_angle, r: handle}),
                        fromPolar({deg: j_angle, r: handle}),
                        fromPolar({deg: j_angle, r: radius}));
      container.path()
          .addClass(`wire-${plain}`)
          .addClass(`wire-${cipher}`)
          .addClass(`color-${color}`)
          .addClass('wire')
          .plot(path.build());
      color_index += 2;
    }
  });
  return container;
}

function drawRotor(container: SVG.Container, outer_radius: number,
                   spec: logic.Spec): SVG.Container {
  const name = container.id();
  container.addClass('rotor');

  const wires = container.group().id(`${name}-wires`).addClass('rotor-wires');
  for (const rotor_name of Object.keys(spec.rotors)) {
    const def = spec.rotors[rotor_name];
    const perm = new logic.Permutation(def.permutation, kAlphabet);
    drawRotorWires(wires.group().id(`${name}-wires-${rotor_name}`),
                   outer_radius, perm);
  }
  // Draw a dot to show where the A wire is; used to indicate ring setting.
  // This rotates with the wires.
  wires.circle(A_DOT_RADIUS * 2).id(`${name}-dot`).addClass('ring-dot').attr({
    cx: outer_radius - RING_WIDTH - A_DOT_RADIUS,
    cy: 0,
  });

  // Draw the ring in a separate group so that it can be rotated separately when
  // the ring setting is changed.
  drawRingLetters(container.group().id(`${name}-ring`), outer_radius,
                  RING_WIDTH);

  return container;
}

function drawReflector(container: SVG.Container, outer_radius: number,
                       spec: logic.Spec): SVG.Container {
  const name = container.id();

  const wires = container.group().id(`${name}-wires`);
  for (const reflector_name of Object.keys(spec.reflectors)) {
    const def = spec.reflectors[reflector_name];
    const perm = new logic.Permutation(def, kAlphabet);
    drawReflectorWires(wires.group().id(`${name}-wires-${reflector_name}`),
                       outer_radius, perm);
  }

  // For consistency with drawRotor, we separate the ring, even though the ring
  // of the reflector never rotates.
  drawRingLetters(container.group().id(`${name}-ring`), outer_radius,
                  REFLECTOR_RING_WIDTH);

  return container;
}

function drawDisplayKeyboardConnector(container: SVG.Container,
                                      display: SVG.Box,
                                      keyboard: SVG.Box): SVG.Container {
  const name = container.id();
  kKeyboardOrder.each((letter, column) => {
    const xOffset = keyX(column);
    const yOffset = keyY(column);
    container
        .line(display.x + xOffset, display.y + yOffset,  // (line break)
              keyboard.x + xOffset, keyboard.y + yOffset)
        .addClass(`wire-${letter}`)
        .addClass(`color-${letter}`)
        .addClass('wire');
  });
  return container;
}

function drawKeyboardPlugboardConnector(container: SVG.Container,
                                        keyboard: SVG.Box,
                                        plugboard: SVG.Box): SVG.Container {
  const name = container.id();
  const yBreak = keyboard.y2;
  const yDest = plugboard.y;
  const yOffset = yDest - yBreak;
  kKeyboardOrder.each((letter, column) => {
    const xStart = keyboard.x + keyX(column);
    const xDest = plugboard.x + keyX(kAlphabet.indexOf(letter));
    const yStart = keyboard.y + keyY(column);
    container.path()
        .addClass(`wire-${letter}`)
        .addClass(`color-${letter}`)
        .addClass('wire')
        .plot(new SvgPathBuilder()
                  .M(xStart, yStart)
                  .V(yBreak)
                  .C(xStart, yBreak + yOffset / 3,  // (line break)
                     xDest, yDest - yOffset / 3,    // (line break)
                     xDest, yDest)
                  .build());
  });
  return container;
}

function drawPlugboardRotorConnector(
    container: SVG.Container, plugboard: SVG.Box,
    rotor: {cx: number, cy: number, r: number}): SVG.Container {
  const etw_top = {x: plugboard.x2 + ETW_X_OFFSET, y: plugboard.y2};
  const etw_delta = ETW_HEIGHT / kAlphabet.length;
  const N = kAlphabet.length;
  const rotor_center = {x: rotor.cx, y: rotor.cy};
  const r = rotor.r;
  kAlphabet.each((letter, i) => {
    const start = {x: plugboard.x + keyX(i), y: plugboard.y2};
    const angle = 360 * i / N;
    const end = addPoints(rotor_center, fromPolar({deg: angle, r: r}));
    const end_in = addPoints(end, fromPolar({deg: angle, r: ROTOR_IN_LENGTH}));
    const path = new SvgPathBuilder();
    path.moveTo(start);
    path.v(ETW_HEIGHT - i * etw_delta);
    if (angle > 180) {
      const offset = (N - 1 - i) * etw_delta;
      path.H(etw_top.x + offset);
      path.V(WIRE_TOP + offset);
    }
    path.H(end_in.x);
    path.V(end_in.y);
    path.lineTo(end);
    container.path()
        .addClass(`wire-${letter}`)
        .addClass(`color-${letter}`)
        .addClass('wire')
        .plot(path.build());
  });

  return container;
}

// ----------------------------------------------------------------------------
//                               EnigmaGraphics
// ----------------------------------------------------------------------------

export class EnigmaGraphics implements logic.EnigmaOnUpdateCallback {
  private readonly _svg: HTMLElement;
  private readonly _spec: logic.Spec;
  private _ring_locked: boolean;

  constructor(id: string, spec: logic.Spec) {
    this._svg = getElementByIdOrThrow(id);
    this._spec = spec;
    this._ring_locked = true;

    // Draw the SVG.
    drawEverything(this._svg, spec);

    // Enable the default settings.
    const rotor_order = spec.defaults.rotor_order.split('-');
    this.onRotorChange('l', rotor_order[0]);
    this.onRotorChange('m', rotor_order[1]);
    this.onRotorChange('r', rotor_order[2]);
    this.onReflectorChange(spec.defaults.reflector);

    // Turn on animation after all drawing is finished.
    this._enableAnimation();
  }

  private _enableAnimation() { this._svg.classList.add('animated'); }

  private _disableAnimation() { this._svg.classList.remove('animated'); }

  // Must be called exactly once!
  public addEventListeners(enigma: logic.Enigma) {
    kAlphabet.each((letter) => {
      this.setupKeyboardClick(enigma, letter);
      this.setupPlugboardDrag(enigma, letter);
    });

    this.setupRotorDrag(enigma, 'g-rotor-r', 2);
    this.setupRotorDrag(enigma, 'g-rotor-m', 1);
    this.setupRotorDrag(enigma, 'g-rotor-l', 0);

    this.setupWindowKeyboardListener(enigma);
  }

  private setupKeyboardClick(enigma: logic.Enigma, letter: string) {
    getElementByIdOrThrow(`g-keyboard-key-${letter}`)
        .addEventListener('click',
                          () => { enigma.stepAndEncryptSingle(letter); });
  }

  private setupPlugboardDrag(enigma: logic.Enigma, plain: string) {
    const hotspot =
        getSVGGraphicsElementByIdOrThrow(`g-plugboard-${plain}-drag-cipher`);
    const plainIndex = kAlphabet.indexOf(plain);
    const plainX = KEYBOARD_X + keyX(plainIndex);
    const fakePlugboard = new logic.Plugboard(kAlphabet);
    let origPlugboardSetting: string;
    const computePlugboard = (state: DragState) => {
      const dx = state.mouse.current.x - plainX;
      const dy = state.mouse.current.y - state.target.start.y;
      const offset = keyXOffsetToLetterOffset(dx);
      const cipherIndex = plainIndex + offset;
      if (Math.abs(dy) > PLUGBOARD_MAX_DRAG_Y_OFFSET || cipherIndex < 0 ||
          cipherIndex >= kAlphabet.length) {
        return null;
      }
      const cipher = kAlphabet.fromIndex(cipherIndex);
      const out = new Array<string>();
      if (plain !== cipher) {
        out.push(plain + cipher);
      }
      for (const pair of origPlugboardSetting.toUpperCase().split(/\s+/)) {
        if (pair !== '' && pair.indexOf(plain) < 0 &&
            pair.indexOf(cipher) < 0) {
          out.push(pair);
        }
      }
      // Normalize the plugboard setting.
      for (let i = 0; i < out.length; i++) {
        out[i] = out[i].split('').sort().join('');
      }
      out.sort();
      return out.join(' ');
    };
    draggable({
      element: hotspot,
      onStart: () => {
        // TODO Animate but make it much more responsive. Maybe add a class to
        // this particular element to speed it up but have the other wires still
        // go slow?
        this._disableAnimation();
        origPlugboardSetting = enigma.getPlugboard();
      },
      onMove: (state: DragState) => {
        let newPlugboardSetting = computePlugboard(state);
        if (newPlugboardSetting === null) {
          newPlugboardSetting = origPlugboardSetting;
        }
        fakePlugboard.setTo(newPlugboardSetting);
        this.onPlugboardChange(fakePlugboard.permutation, newPlugboardSetting);
      },
      onFinish: (state: DragState) => {
        const newPlugboardSetting = computePlugboard(state);
        if (newPlugboardSetting !== null) {
          enigma.setPlugboard(newPlugboardSetting);
        } else {
          this.onPlugboardChange(enigma.getPlugboardPermutation(),
                                 enigma.getPlugboard());
        }
        this._enableAnimation();
      },
    });
  }

  private setupRotorDrag(enigma: logic.Enigma, id: string, rotorIndex: number) {
    const rotor = getSVGGraphicsElementByIdOrThrow(id);
    const wires = getSVGGraphicsElementByIdOrThrow(`${id}-wires`);
    const ring = getSVGGraphicsElementByIdOrThrow(`${id}-ring`);
    const wireHotspot = getSVGGraphicsElementByIdOrThrow(`${id}-hotspot-wires`);
    const ringHotspot = getSVGGraphicsElementByIdOrThrow(`${id}-hotspot-ring`);
    // Explanation:
    //   'locked' = Whole rotor rotates as a unit, only indicator changes.
    //   'wires' = Only wires rotate, only ring setting changes.
    //   'ring' = Only ring rotates, both indicator and ring setting change.
    //            This is implemented by rotating the rotor and anti-rotating
    //            the wires.
    let mode: 'locked'|'wires'|'ring';
    let rotorStartPosition = 0;
    let wiresStartPosition = 0;
    const setupHotspot = (element: SVGGraphicsElement) => {
      draggable({
        element: element,
        onStart: () => {
          this._disableAnimation();
          mode = this._ring_locked ? 'locked' :
                                     element === wireHotspot ? 'wires' : 'ring';
          rotorStartPosition = this._rotorPosition(rotor);
          wiresStartPosition = this._rotorPosition(wires);
        },
        onMove: (state: DragState) => {
          const degrees = state.target.start.degreesTo(state.mouse.current) -
              state.target.start.degreesTo(state.mouse.start);
          // Negative since positive degrees means clockwise but we need
          // positive to mean counter-clockwise.
          const deltaPosition = -degrees / 360 * kAlphabet.length;
          switch (mode) {
            case 'locked':
              this._rotateRotor(rotor, rotorStartPosition + deltaPosition,
                                'counter-clockwise');
              break;
            case 'ring':
              this._rotateRotor(rotor, rotorStartPosition + deltaPosition,
                                'counter-clockwise');
              this._rotateRotor(wires, wiresStartPosition + deltaPosition,
                                'clockwise');
              break;
            case 'wires':
              this._rotateRotor(wires, wiresStartPosition - deltaPosition,
                                'clockwise');
              break;
            default:
              throw new UnreachableCaseError(mode);
          }
        },
        onFinish: (state: DragState) => {
          const degrees = state.target.start.degreesTo(state.mouse.current) -
              state.target.start.degreesTo(state.mouse.start);
          function roundToLetter(position: number) {
            return kAlphabet.fromIndex(
                mod(Math.round(position), kAlphabet.length));
          }
          const deltaPosition = -degrees / 360 * kAlphabet.length;
          this._enableAnimation();
          switch (mode) {
            case 'locked':
              enigma.setIndicatorAtIndex(
                  rotorIndex,
                  roundToLetter(rotorStartPosition + deltaPosition));
              break;
            case 'ring':
              enigma.setIndicatorAtIndex(
                  rotorIndex,
                  roundToLetter(rotorStartPosition + deltaPosition));
              enigma.setRingSettingAtIndex(
                  rotorIndex,
                  roundToLetter(wiresStartPosition + deltaPosition));
              break;
            case 'wires':
              enigma.setRingSettingAtIndex(
                  rotorIndex,
                  roundToLetter(wiresStartPosition - deltaPosition));
              break;
            default:
              throw new UnreachableCaseError(mode);
          }
        },
      });
    };
    setupHotspot(wireHotspot);
    setupHotspot(ringHotspot);
  }

  private setupWindowKeyboardListener(enigma: logic.Enigma) {
    document.addEventListener('keydown', (event) => {
      // Ignore key presses on input boxes, or if CTRL or ALT is used (e.g.
      // CTRL-F).
      if (event.defaultPrevented || !event.target ||
          (event.target as Element).nodeName === 'INPUT' ||
          (event.target as Element).nodeName === 'TEXTAREA' ||
          event.getModifierState('Control') || event.getModifierState('Alt') ||
          event.getModifierState('Meta')) {
        return;
      }

      if (enigma.isValidLetter(event.key)) {
        enigma.stepAndEncryptSingle(event.key);
      } else if (event.key === 'Backspace') {
        // TODO Backup to previous position and key press. Probably need to keep
        // a stack of previous history, which gets erased whenever the settings
        // are changed manually.
      }
    }, true);
  }

  // --- EnigmaOnUpdateCallback ---

  public onPlugboardChange(permutation: logic.Permutation, setting: string) {
    this._clear();
    // Note: the css 'd' property is Chrome-only as of March 2018. It might be
    // good to add a non-animated fallback for other browsers.
    permutation.eachPair((plain, cipher) => {
      const offset = kAlphabet.indexOf(cipher) - kAlphabet.indexOf(plain);
      setClassKeyValue(getElementByIdOrThrow(`g-plugboard-${plain}`), 'offset',
                       '' + offset);
    });
  }

  public onReflectorChange(selectedName: string) {
    this._clear();
    this._setWires(`g-reflector-wires`, Object.keys(this._spec.reflectors),
                   selectedName);
  }

  public onRotorOrderChange(order: string) {}

  public onRotorChange(position: logic.RotorPosition, selectedName: string) {
    this._clear();
    this._setWires(`g-rotor-${position}-wires`, Object.keys(this._spec.rotors),
                   selectedName);
    this._setNotches(`g-rotor-${position}-ring-letter`,
                     this._spec.rotors[selectedName].notch);
  }

  private _setWires(idPrefix: string, allNames: string[],
                    selectedName: string) {
    let found = false;
    for (const name of allNames) {
      const el = getElementByIdOrThrow(`${idPrefix}-${name}`);
      if (name === selectedName) {
        // TODO It would be nice to raise the selected wire to the front. But
        // sadly SVG does not have a z-index so we'd need to remove the element
        // and re-add it to the end of its sibling list. And this won't raise it
        // above any other container, such as the keyboard keys. Given this
        // challenge, it's probably not worth fixing.
        el.classList.add('selected');
        found = true;
      } else {
        el.classList.remove('selected');
      }
    }
    if (!found) {
      console.error(`element ${name} not found in array ${allNames}`);
    }
  }

  private _setNotches(idPrefix: string, notch: string) {
    kAlphabet.each((letter) => {
      const el = getElementByIdOrThrow(`${idPrefix}-${letter}`);
      if (notch.indexOf(letter) >= 0) {
        el.classList.add('notch');
      } else {
        el.classList.remove('notch');
      }
    });
  }

  public onRingSettingChange(value: string) {
    console.assert(value.length === 3, 'expected length 3, got', value);
    this._clear();
    this._rotateRotor('g-rotor-l-wires', value[0], 'clockwise');
    this._rotateRotor('g-rotor-m-wires', value[1], 'clockwise');
    this._rotateRotor('g-rotor-r-wires', value[2], 'clockwise');
  }

  public onIndicatorChange(value: string) {
    console.assert(value.length === 3, 'expected length 3, got', value);
    this._clear();
    this._rotateRotor('g-rotor-l', value[0], 'counter-clockwise');
    this._rotateRotor('g-rotor-m', value[1], 'counter-clockwise');
    this._rotateRotor('g-rotor-r', value[2], 'counter-clockwise');
  }

  public onRingLocked(value: boolean): void { this._ring_locked = value; }

  private _rotateRotor(id_or_el: string|SVGElement, position: string|number,
                       direction: 'clockwise'|'counter-clockwise') {
    const el = (typeof id_or_el === 'string') ?
        getSVGGraphicsElementByIdOrThrow(id_or_el) :
        id_or_el;
    position = (typeof position === 'string') ? kAlphabet.indexOf(position) :
                                                mod(position, kAlphabet.length);
    // If we just set the rotation directly, there would be a jarring jump from
    // Z->A, spinning all the way backward. So instead we keep track of current
    // rotation and keep going past 360 degrees as necessary to keep the
    // animation smooth. We store the position as an index (0..25) as a data
    // attribute so we can retrieve it next time.
    const old_position = this._rotorPosition(el);
    const delta = circularDistance(position - old_position, kAlphabet.length);
    const new_position = old_position + delta;
    const tick = (direction === 'clockwise' ? 1 : -1) * 360 / kAlphabet.length;
    el.dataset.position = '' + new_position;
    el.style.transform = `rotate(${tick * new_position}deg)`;
  }

  private _rotorPosition(el: SVGElement): number {
    return +(el.dataset.position || 0);
  }

  public onEncrypt(values: logic.LastValueFullEnigma) {
    function highlight(id: string, letter: string|logic.LastValueBidi,
                       showOutput?: boolean) {
      if (typeof letter === 'string') {
        setClassKeyValue(getElementByIdOrThrow(id), 'selected-letter', letter);
      } else if (showOutput) {
        setClassKeyValue(getElementByIdOrThrow(id), 'selected-letter',
                         [letter.forward.output, letter.inverse.input]);
      } else {
        setClassKeyValue(getElementByIdOrThrow(id), 'selected-letter',
                         [letter.forward.input, letter.inverse.output]);
      }
    }
    highlight('g-display', values.plugboard.inverse.output);
    highlight('g-display-to-keyboard', values.plugboard.inverse.output);
    highlight('g-keyboard', values.plugboard.forward.input);
    highlight('g-keyboard-to-plugboard', values.plugboard);
    highlight('g-plugboard', values.plugboard);
    highlight('g-plugboard-to-rotor', values.plugboard, true);
    highlight('g-rotor-r', values.rotors[2]);
    highlight('g-rotor-m', values.rotors[1]);
    highlight('g-rotor-l', values.rotors[0]);
    highlight('g-reflector', values.reflector.input);
  }

  private _clear() {
    function clear(id: string) {
      clearClassKey(getElementByIdOrThrow(id), 'selected-letter');
    }
    clear('g-display');
    clear('g-display-to-keyboard');
    clear('g-keyboard');
    clear('g-keyboard-to-plugboard');
    clear('g-plugboard');
    clear('g-plugboard-to-rotor');
    clear('g-rotor-r');
    clear('g-rotor-m');
    clear('g-rotor-l');
    clear('g-reflector');
  }
}

// vim: set sw=2:
