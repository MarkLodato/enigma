// Helper library for drawing SVG.

'use strict';

interface XY {
  x: number;
  y: number;
}

interface ArcOptionsRxRy {
  rx: number;
  ry: number;
  rotation?: number;
  largeArc?: boolean;
  sweep?: boolean;
}

interface ArcOptionsR {
  r: number;
  largeArc?: boolean;
  sweep?: boolean;
}

type ArcOptions = ArcOptionsRxRy|ArcOptionsR;

function isArcOptionsR(o: ArcOptions): o is ArcOptionsR {
  return 'r' in o;
}

export function fromPolar({r, deg}: {r: number, deg: number}): XY {
  const radians = deg * Math.PI / 180;
  return {x: r * Math.cos(radians), y: r * Math.sin(radians)};
}

export function addPoints(a: XY, b: XY) {
  return {x: a.x + b.x, y: a.y + b.y};
}

// Used to construct an SVG <path>'s `d` attribute.
// TODO: break lines so as not to exceed 255 chars
// TODO: round numbers to proper number of significant digits
export class SvgPathBuilder {
  private elements: string[];

  constructor() { this.elements = []; }

  public build(): string { return this.elements.join(' '); }

  public close() { return this.Z(); }
  public moveTo(p: XY) { return this.M(p.x, p.y); }
  public lineTo(p: XY) { return this.L(p.x, p.y); }
  public quadraticCurveTo(c: XY, p: XY) { return this.Q(c.x, c.y, p.x, p.y); }
  public cubicCurveTo(c1: XY, c2: XY, p: XY) {
    return this.C(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  }
  public arcTo(o: ArcOptions, p: XY) {
    if (isArcOptionsR(o)) {
      return this.A(o.r, o.r, 0, o.largeArc || false, o.sweep || false, p.x,
                    p.y);
    } else {
      return this.A(o.rx, o.ry, o.rotation || 0, o.largeArc || false,
                    o.sweep || false, p.x, p.y);
    }
  }

  public M(x: number, y: number) { return this.push(`M${x},${y}`); }
  public m(dx: number, dy: number) { return this.push(`m${dx},${dy}`); }
  public Z() { return this.push('Z'); }
  public z() { return this.push('z'); }
  public L(x: number, y: number) { return this.push(`L${x},${y}`); }
  public l(dx: number, dy: number) { return this.push(`l${dx},${dy}`); }
  public H(x: number) { return this.push(`H${x}`); }
  public h(dx: number) { return this.push(`h${dx}`); }
  public V(y: number) { return this.push(`V${y}`); }
  public v(dy: number) { return this.push(`v${dy}`); }
  public C(c1x: number, c1y: number, c2x: number, c2y: number, x: number,
           y: number) {
    return this.push(`C${c1x},${c1y},${c2x},${c2y},${x},${y}`);
  }
  public c(c1dx: number, c1dy: number, c2dx: number, c2dy: number, dx: number,
           dy: number) {
    return this.push(`c${c1dx},${c1dy},${c2dx},${c2dy},${dx},${dy}`);
  }
  public S(c2x: number, c2y: number, x: number, y: number) {
    return this.push(`S${c2x},${c2y},${x},${y}`);
  }
  public s(c2dx: number, c2dy: number, dx: number, dy: number) {
    return this.push(`s${c2dx},${c2dy},${dx},${dy}`);
  }
  public Q(cx: number, cy: number, x: number, y: number) {
    return this.push(`Q${cx},${cy},${x},${y}`);
  }
  public q(cdx: number, cdy: number, dx: number, dy: number) {
    return this.push(`q${cdx},${cdy},${dx},${dy}`);
  }
  public T(x: number, y: number) { return this.push(`T${x},${y}`); }
  public t(dx: number, dy: number) { return this.push(`t${dx},${dy}`); }
  public A(rx: number, ry: number, xAxisRotate: number,
           largeArc: number|boolean, sweep: number|boolean, x: number,
           y: number) {
    const lAF = largeArc ? 1 : 0;
    const sF = sweep ? 1 : 0;
    return this.push(`A${rx},${ry},${xAxisRotate},${lAF},${sF},${x},${y}`);
  }
  public a(rdx: number, rdy: number, xAxisRotate: number,
           largeArc: number|boolean, sweep: number|boolean, dx: number,
           dy: number) {
    const lAF = largeArc ? 1 : 0;
    const sF = sweep ? 1 : 0;
    return this.push(`a${rdx},${rdy},${xAxisRotate},${lAF},${sF},${dx},${dy}`);
  }

  private push(s: string) {
    this.elements.push(s);
    return this;
  }
}

// Returns an SVG path 'd' attribute for a donut.
export function donut(outer_radius: number, width: number): string {
  const inner_radius = outer_radius - width;
  return new SvgPathBuilder()
      .moveTo({x: 0, y: outer_radius})
      .arcTo({r: outer_radius, largeArc: true, sweep: false},
             {x: 0, y: -outer_radius})
      .arcTo({r: outer_radius, largeArc: true, sweep: false},
             {x: 0, y: outer_radius})
      .close()
      .moveTo({x: 0, y: inner_radius})
      .arcTo({r: inner_radius, largeArc: true, sweep: true},
             {x: 0, y: -inner_radius})
      .arcTo({r: inner_radius, largeArc: true, sweep: true},
             {x: 0, y: inner_radius})
      .close()
      .build();
}
