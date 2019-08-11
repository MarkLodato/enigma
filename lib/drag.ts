'use strict';

export class Point {
  constructor(readonly x: number, readonly y: number) {}

  // Returns the number of degrees to the given point.
  public degreesTo(other: Point) {
    const radians = Math.atan2(other.y - this.y, other.x - this.x);
    return radians * 180 / Math.PI;
  }
}

export interface DragState {
  // Note: all points are in SVG's global coordinate system.
  mouse: {start: Point; current: Point;};
  target: {
    // start and current are for the center of element.
    start: Point; current: Point; element: SVGGraphicsElement;
  };
}

export interface DragParams {
  element: SVGGraphicsElement;
  onStart?: (state: DragState) => void;
  onMove?: (state: DragState) => void;
  onFinish?: (state: DragState) => void;
}

export function draggable(params: DragParams) {
  let state: DragState|null = null;  // null if not currently dragging
  const svg: SVGSVGElement =
      params.element.ownerSVGElement || params.element as SVGSVGElement;

  // Returns the center point of the element in the element's coordinate system.
  const computeCenter = (element: SVGGraphicsElement) => {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 + window.scrollX;
    const cy = rect.top + rect.height / 2 + window.scrollY;
    return new Point(cx, cy);
  };

  // Returns the point translated to param.element's coordinate system.
  const translatePoint = (event: MouseEvent) => {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const p = point.matrixTransform(svg.getScreenCTM()!.inverse());
    return new Point(p.x, p.y);
  };

  const mouseDownHandler = (event: MouseEvent) => {
    const center = computeCenter(params.element);
    const mouse = translatePoint(event);
    state = {
      mouse: {
        start: mouse,
        current: mouse,
      },
      target: {
        start: center,
        current: center,
        element: params.element,
      },
    };
    if (params.onStart) {
      params.onStart(state);
    }
    window.addEventListener('mousemove', mouseMoveHandler, false);
  };

  const mouseMoveHandler = (event: MouseEvent) => {
    if (state === null) {
      // Should we error out or do any cleanup?
      return;
    }
    state.target.current = computeCenter(params.element);
    state.mouse.current = translatePoint(event);
    if (params.onMove) {
      params.onMove(state);
    }
  };

  const mouseUpHandler = (event: MouseEvent) => {
    if (state === null) {
      // Should we error out or do any cleanup?
      return;
    }
    window.removeEventListener('mousemove', mouseMoveHandler, false);
    state.target.current = computeCenter(params.element);
    state.mouse.current = translatePoint(event);
    if (params.onFinish) {
      params.onFinish(state);
    }
    state = null;
  };

  window.addEventListener('mouseup', mouseUpHandler, false);
  params.element.addEventListener('mousedown', mouseDownHandler, false);
}
