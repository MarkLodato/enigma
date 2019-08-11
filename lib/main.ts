// Top level JavaScript for the Enigma simulator.

'use strict';

import {getElementByIdOrThrow} from './dom';
import {EnigmaGraphics} from './graphics';
import {Enigma, EnigmaOnUpdateCallback, M3_DEF, Permutation} from './logic';

function main() {
  const graphics = new EnigmaGraphics('drawing', M3_DEF);
  const enigma = new Enigma(M3_DEF);
  enigma.registerOnUpdateCallback(graphics);
  graphics.addEventListeners(enigma);
  const html_interface = new HtmlInterface(enigma);
  SetupOnHashChange(enigma);

  // TODO remove this?
  enigma.encryptSingleNoStep('A');
}

function getInputElementByIdOrThrow(id: string): HTMLInputElement {
  return getElementByIdOrThrow(id) as HTMLInputElement;
}

function SetupOnHashChange(enigma: Enigma) {
  function onHashChange() {
    const state = new URLSearchParams(window.location.hash.substring(1));
    enigma.loadState(state);
  }
  onHashChange();
  window.addEventListener('hashchange', onHashChange, false);
}

class HtmlInterface implements EnigmaOnUpdateCallback {
  private readonly _enigma: Enigma;
  private readonly _rotor_order: HTMLInputElement;
  private readonly _ring_setting: HTMLInputElement;
  private readonly _indicator: HTMLInputElement;
  private readonly _plugboard: HTMLInputElement;
  private readonly _ring_locked: HTMLInputElement;

  constructor(enigma: Enigma) {
    this._enigma = enigma;
    this._rotor_order =
        this.SetupInputHandler('rotor_order',                        //
                               (v) => enigma.validateRotorOrder(v),  //
                               (v) => enigma.setRotorOrder(v));
    this._ring_setting =
        this.SetupInputHandler('ring_setting',                        //
                               (v) => enigma.validateRingSetting(v),  //
                               (v) => enigma.setRingSetting(v));
    this._indicator =
        this.SetupInputHandler('indicator',                         //
                               (v) => enigma.validateIndicator(v),  //
                               (v) => enigma.setIndicator(v));
    this._plugboard =
        this.SetupInputHandler('plugboard',                         //
                               (v) => enigma.validatePlugboard(v),  //
                               (v) => enigma.setPlugboard(v));
    this._ring_locked =
        this.SetupCheckbox('ring_locked', (v) => enigma.setRingLocked(v));
    this._enigma.registerOnUpdateCallback(this);
  }

  private SetupInputHandler(id: string, validate: (value: string) => string,
                            set: (value: string) => void): HTMLInputElement {
    const element = getInputElementByIdOrThrow(id);
    element.oninput = (event) => {
      if (validate(element.value) === '') {
        element.classList.remove('bad');
      } else {
        element.classList.add('bad');
      }
    };
    element.onchange = (event) => {
      try {
        set(element.value);
        element.classList.remove('bad');
      } catch (e) {
        element.classList.add('bad');
      }
    };
    return element;
  }


  private SetupCheckbox(id: string,
                        set: (value: boolean) => void): HTMLInputElement {
    const element = getInputElementByIdOrThrow(id);
    element.onchange = (event) => { set(element.checked); };
    return element;
  }

  public onPlugboardChange(permutation: Permutation, setting: string): void {
    this._plugboard.value = setting;
  }
  public onRotorOrderChange(order: string): void {
    this._rotor_order.value = order;
  }
  public onRingSettingChange(value: string): void {
    this._ring_setting.value = value;
  }
  public onIndicatorChange(value: string): void {
    this._indicator.value = value;
  }
  public onRingLocked(value: boolean): void {
    this._ring_locked.checked = value;
  }
  // Things that aren't HTML options:
  public onReflectorChange(): void {}
  public onRotorChange(): void {}
  public onEncrypt(): void {}
}

main();
