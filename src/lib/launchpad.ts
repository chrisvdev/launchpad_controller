import easymidi from "easymidi";
import {
  AxisCoordinate,
  CodeCoordinate,
  Coordinate,
  Log,
  MIDIData,
  MIDIEventListener,
  MIDIMessageType,
  PalletCode,
  PalletColorCode,
  PalletPrimaryColor,
  RGBPrimaryColor,
  SysexData,
} from "./types.js";

const INPUT_NAME = "MIDIIN2 (LPMiniMK3 MIDI)";
const OUTPUT_NAME = "MIDIOUT2 (LPMiniMK3 MIDI)";

const lightModes = [0, 1, 2];

const [STATIC, FLASHING, PULSING] = lightModes;

function sysexMessage(data: SysexData) {
  return [240, ...data, 247];
}

function getPosition(x: AxisCoordinate, y: AxisCoordinate) {
  const res = 10 * (y + 1) + (x + 1); /* 
  console.log(x, y, res); */
  return res as CodeCoordinate;
}

export function getColor(
  red: PalletPrimaryColor,
  green: PalletPrimaryColor,
  blue: PalletPrimaryColor,
  h = false
) {
  return (red * 16 + green * 4 + blue + (h ? 64 : 0)) as PalletColorCode;
}

export interface Pixel {
  getSysexMessage(): SysexData;
  getPosition(): Coordinate;
}

export class RGBPixel implements Pixel {
  #x;
  #y;
  #red;
  #green;
  #blue;
  constructor(
    x: AxisCoordinate,
    y: AxisCoordinate,
    red: RGBPrimaryColor = 0,
    green: RGBPrimaryColor = 0,
    blue: RGBPrimaryColor = 0
  ) {
    this.#x = x;
    this.#y = y;
    this.#red = red;
    this.#green = green;
    this.#blue = blue;
  }
  getSysexMessage() {
    return [
      3,
      getPosition(this.#x, this.#y),
      this.#red,
      this.#green,
      this.#blue,
    ] as SysexData;
  }
  getPosition() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}

export class StaticPixel implements Pixel {
  #x;
  #y;
  #code;
  constructor(x: AxisCoordinate, y: AxisCoordinate, code: PalletCode = 0) {
    this.#x = x;
    this.#y = y;
    this.#code = code;
  }
  getSysexMessage() {
    return [0, getPosition(this.#x, this.#y), this.#code] as SysexData;
  }
  getPosition() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}

export class PulsingPixel {
  #x;
  #y;
  #code;
  constructor(x: AxisCoordinate, y: AxisCoordinate, code: PalletCode = 0) {
    this.#x = x;
    this.#y = y;
    this.#code = code;
  }
  getSysexMessage() {
    return [2, getPosition(this.#x, this.#y), this.#code] as SysexData;
  }
  getPosition() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}

export class FlashingPixel {
  #x;
  #y;
  #code;
  #code2;
  constructor(
    x: AxisCoordinate,
    y: AxisCoordinate,
    code: PalletCode = 0,
    code2: PalletCode = 0
  ) {
    this.#x = x;
    this.#y = y;
    this.#code = code;
    this.#code2 = code2;
  }
  getSysexMessage() {
    return [
      1,
      getPosition(this.#x, this.#y),
      this.#code,
      this.#code2,
    ] as SysexData;
  }
  getPosition() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}

export default class Launchpad {
  #input;
  #output;
  #log;
  #listeners = [] as MIDIEventListener[];
  constructor(log: Log = false) {
    this.#input = new easymidi.Input(INPUT_NAME);
    this.#output = new easymidi.Output(OUTPUT_NAME);
    this.#setInProgrammerMode();
    this.#log = log;
    this.#activateListeners();
    if (this.#log) {
      this.addListener((msg) => {
        console.log("Log:", msg);
      });
    }
    this.render();
  }
  #setInProgrammerMode() {
    this.#output.send("sysex", sysexMessage([0, 32, 41, 2, 13, 14, 1]));
  }
  #baseListener(data: MIDIData) {
    this.#listeners.forEach((listener) => {
      listener(data);
    });
  }
  #activateListeners() {
    const messageTypes = [
      "noteon",
      "noteoff",
      "poly aftertouch",
      "cc",
      "program",
      "channel aftertouch",
      "pitch",
      "position",
      "mtc",
      "select",
      "clock",
      "start",
      "continue",
      "stop",
      "activesense",
      "reset",
      "sysex",
    ] as MIDIMessageType[];
    messageTypes.forEach((type: MIDIMessageType) => {
      this.#input.on(
        // @ts-ignore
        type,
        (msg: MIDIData) => {
          this.#baseListener(msg);
        }
      );
    });
  }
  addListener(listener: MIDIEventListener) {
    this.#listeners.push(listener);
  }
  render(...pixels: Pixel[]) {
    const pixelsData = [] as SysexData;
    pixels.forEach((pixel) => {
      pixelsData.push(...pixel.getSysexMessage());
    });
    this.#output.send(
      "sysex",
      sysexMessage([0, 32, 41, 2, 13, 3, ...pixelsData])
    );
  }
  getPallet() {
    function getColorCode(code: number, h = false) {
      const res = h ? 21 * code : 10 * code;
      return res === 64 ? 63 : res;
    }

    function getCodeColor(num: number) {
      const blue = num % 4;
      const green = Math.floor(num / 4) % 4;
      const red = Math.floor(num / 16) % 4;
      console.log(
        `${num}, ${getColorCode(red, num > 63)} ${getColorCode(
          green,
          num > 63
        )} ${getColorCode(blue, num > 63)};`
      );
    }

    for (let i = 0; i < 128; i++) {
      getCodeColor(i);
    }
  }
}
