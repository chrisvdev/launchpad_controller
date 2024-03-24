import easymidi from "easymidi";
import type Pixel from "@launchpad/pixel.js";
import type {
  Log,
  MIDIData,
  MIDIEventListener,
  MIDIMessageType,
  SysexData,
} from "@launchpad/types.js";
import { sysexMessage } from "@launchpad/utils.js";

const INPUT_NAME = "MIDIIN2 (LPMiniMK3 MIDI)";
const OUTPUT_NAME = "MIDIOUT2 (LPMiniMK3 MIDI)";

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
