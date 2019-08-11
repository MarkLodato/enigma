'use strict';

// Returns the given HTML or SVG element by id, throwing an error if not found.
export function getElementByIdOrThrow(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw Error('no such DOM element: ' + id);
  }
  return element;
}

// Same as getElementByIdOrThrow, but doing the type casting for you to SVG.
export function getSVGGraphicsElementByIdOrThrow(id: string):
    SVGGraphicsElement {
  return (getElementByIdOrThrow(id) as unknown) as SVGGraphicsElement;
}

// Adds class "{key}-{value}" and removes any other "{key}-*". If `value` is an
// array, adds one class for each value.
export function setClassKeyValue(element: HTMLElement, key: string,
                                 value: string|string[]) {
  const regexp = new RegExp('(?:^|\\s)' + key + '-\\S*', 'g');
  // Note: We can't use .className because SVGElement.className does not return
  // a string.
  let klass = (element.getAttribute('class') || '').replace(regexp, '');
  if (typeof value === 'string') {
    klass += ` ${key}-${value}`;
  } else {
    for (const v of value) {
      klass += ` ${key}-${v}`;
    }
  }
  element.setAttribute('class', klass);
}

// Removes any class "{key}-*".
export function clearClassKey(element: HTMLElement, key: string) {
  const regexp = new RegExp('(?:^|\\s)' + key + '-\\S*', 'g');
  // Note: We can't use .className because SVGElement.className does not return
  // a string.
  const klass = (element.getAttribute('class') || '').replace(regexp, '');
  element.setAttribute('class', klass);
}
