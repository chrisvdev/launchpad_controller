import Launchpad, {
  FlashingPixel,
  StaticPixel,
  PulsingPixel,
  RGBPixel,
  Pixel,
  getColor,
} from "./launchpad.js";
import {
  AxisCoordinate,
  ButtonEventListener,
  CodeCoordinate,
  Coordinate,
  DefaultPixelMaker,
  MIDIData,
  PalletCode,
  PalletPrimaryColor,
} from "./types.js";

export class Button {
  #x;
  #y;
  #panel;
  #defaultPixelMaker: DefaultPixelMaker = (x, y) => new RGBPixel(x, y, 2, 2, 2);
  #pixel: Pixel = new StaticPixel(0, 0, 0);
  #onPressCB: ButtonEventListener = (btn, panel) => {
    btn.setPulsing(getColor(3, 0, 0));
    console.log(`Pressed not defined: ${this.#y + 1}${this.#x + 1}`);
    setTimeout(() => {
      btn.setDefaultPixel();
      panel.render();
    }, 2000);
  };
  #onLeaveCB: ButtonEventListener = (btn) => {
    console.log(`Leaved not defined: ${this.#y + 1}${this.#x + 1}`);
  };
  constructor(x: AxisCoordinate, y: AxisCoordinate, panel: Panel) {
    this.#x = x;
    this.#y = y;
    this.#panel = panel;
    this.setDefaultPixel();
  }
  onPressSuscribe(cb: ButtonEventListener) {
    this.#onPressCB = cb;
  }
  onPress(msg: MIDIData) {
    this.#onPressCB(this, this.#panel, msg);
  }
  onLeaveSuscribe(cb: ButtonEventListener) {
    this.#onLeaveCB = cb;
  }
  onLeave(msg: MIDIData) {
    this.#onLeaveCB(this, this.#panel, msg);
  }
  setStatic(code: PalletCode = 0) {
    this.#pixel = new StaticPixel(this.#x, this.#y, code);
  }
  setFlashing(code: PalletCode = 0, code2: PalletCode = 0) {
    this.#pixel = new FlashingPixel(this.#x, this.#y, code, code2);
  }
  setPulsing(code: PalletCode = 0) {
    this.#pixel = new PulsingPixel(this.#x, this.#y, code);
  }
  setRGB(r: PalletPrimaryColor, g: PalletPrimaryColor, b: PalletPrimaryColor) {
    this.#pixel = new RGBPixel(this.#x, this.#y, r, g, b);
  }
  setDefaultPixel() {
    const pixel = this.#defaultPixelMaker(this.#x, this.#y);
    this.#pixel = pixel;
    return pixel;
  }
  setDefaultPixelMaker(maker: DefaultPixelMaker) {
    this.#defaultPixelMaker = maker;
    this.setDefaultPixel();
    this.#panel.render();
  }
  getPixel() {
    return this.#pixel;
  }
  getCoordinate() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}

function getCoordinates(code: CodeCoordinate) {
  return {
    x: (code % 10) - 1,
    y: Math.floor(code / 10) - 1,
  };
}

export function makePanelButtons(panel: Panel) {
  const buttons: Button[][] = [];
  for (let x = 0; x <= 8; x++) {
    buttons.push([]);
    for (let y = 0; y <= 8; y++) {
      buttons[x]?.push(new Button(x, y, panel));
    }
  }
  return buttons;
}
export default class Panel {
  #launchpad;
  #buttons;
  #timer: number = 0;
  constructor() {
    this.#launchpad = new Launchpad();
    this.#buttons = makePanelButtons(this);
    this.#launchpad.addListener(this.panelListener.bind(this));
  }
  getButton(x: AxisCoordinate, y: AxisCoordinate) {
    const row: Button[] = this.#buttons[x] as Button[];
    if (row) {
      const res = row[y];
      return res as Button;
    }
  }
  panelListener(msg: MIDIData) {
    const { x, y } = getCoordinates(msg.note);
    let renderNeeded = true;
    if (msg._type === "noteon") {
      const { x, y } = getCoordinates(msg.note);
      const btn = this.getButton(x, y);
      if (msg.velocity > 0) {
        // @ts-ignore
        if (btn.onPress(msg)) renderNeeded = false;
      } else {
        // @ts-ignore
        if (btn.onLeave(msg)) renderNeeded = false;
      }
    }
    if (msg._type === "cc") {
      const { x, y } = getCoordinates(msg.controller);
      const btn = this.getButton(x, y);
      if (msg.value > 0) {
        // @ts-ignore
        if (btn.onPress(msg)) renderNeeded = false;
      } else {
        // @ts-ignore
        if (btn.onLeave(msg)) renderNeeded = false;
      }
    }
    console.log("render", renderNeeded);

    if (renderNeeded) this.render();
  }
  render() {
    if (!this.#timer) {
      const pixels = [];
      for (let x = 0; x <= 8; x++) {
        for (let y = 0; y <= 8; y++) {
          const btn = this.getButton(x, y);
          if (btn) {
            pixels.push(btn.getPixel());
          }
        }
      }
      this.#launchpad.render(...pixels);
    }
  }
  renderFromPixels(time: number, ...pixels: Pixel[]) {
    this.#launchpad.render(...pixels);
    if (this.#timer) {
      clearTimeout(this.#timer);
    }
    this.#timer = setTimeout(() => {
      this.#timer = 0;
      this.render();
    }, time);
  }
  suscribeOnPressButton(
    x: AxisCoordinate,
    y: AxisCoordinate,
    cb: ButtonEventListener
  ) {
    // @ts-ignore
    this.#buttons[x][y].onPressSuscribe(cb);
  }
  suscribeOnLeaveButton(
    x: AxisCoordinate,
    y: AxisCoordinate,
    cb: ButtonEventListener
  ) {
    // @ts-ignore
    this.#buttons[x][y].onLeaveSuscribe(cb);
  }
}
