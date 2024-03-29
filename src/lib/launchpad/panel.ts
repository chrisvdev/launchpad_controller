import Launchpad from "@launchpad/launchpad.js";
import type Pixel from "@launchpad/pixel.js";
import {
  AxisCoordinate,
  ButtonEventListener,
  CodeCoordinate,
  Coordinate,
  DefaultPixelMaker,
  Frame,
  Frames,
  MIDIData,
  PalletCode,
  PalletPrimaryColor,
} from "@launchpad/types.js";
import type Button from "@launchpad/button.js";
import { makePanelButtons, getCoordinates } from "@launchpad/utils.js";
export default class Panel {
  #launchpad;
  #buttons;
  #onPriorityRender = false;
  #framesToRender: Frames = [];
  #frameTicker = 0;
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
        btn.onPress(msg);
      } else {
        // @ts-ignore
        btn.onLeave(msg);
      }
    }
    if (msg._type === "cc") {
      const { x, y } = getCoordinates(msg.controller);
      const btn = this.getButton(x, y);
      if (msg.value > 0) {
        // @ts-ignore
        btn.onPress(msg);
      } else {
        // @ts-ignore
        btn.onLeave(msg);
      }
    }
  }
  render(...pixels: Pixel[]) {
    if (!pixels.length) {
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
    } else this.#launchpad.render(...pixels);
  }
  renderFromPixels(...pixels: Pixel[]) {
    if (!this.#onPriorityRender) this.render(...pixels);
  }
  addFrameToRender(frame: Frame) {
    this.#framesToRender.push(frame);
    if (!this.#onPriorityRender) {
      this.#onPriorityRender = true;
      this.#renderFrames();
    }
  }
  clearFramesToRender() {
    clearTimeout(this.#frameTicker);
    this.#frameTicker = 0;
    this.#framesToRender = [];
    this.#onPriorityRender = false;
    this.render();
  }
  #renderFrames() {
    if (!this.#onPriorityRender) return;
    if (this.#framesToRender.length) {
      const { pixels, TTL } = this.#framesToRender[0] as Frame;
      this.render(...pixels);
      if (TTL) {
        this.#frameTicker = setTimeout(() => {
          this.#framesToRender.shift();
          this.#renderFrames();
        }, TTL);
      }
    } else {
      this.#onPriorityRender = false;
      this.render();
    }
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
