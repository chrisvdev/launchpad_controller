import Launchpad from "@launchpad/launchpad.js";
import type Pixel from "@launchpad/pixel.js";
import {
  AxisCoordinate,
  ButtonEventListener,
  CodeCoordinate,
  Coordinate,
  DefaultPixelMaker,
  MIDIData,
  PalletCode,
  PalletPrimaryColor,
} from "@launchpad/types.js";
import type Button from "@launchpad/button.js";
import { makePanelButtons, getCoordinates } from "@launchpad/utils.js";
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
