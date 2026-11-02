import easymidi from "easymidi";
import type Pixel from "@launchpad/pixel.js";
import type {
  MIDIData,
  MIDIEventListener,
  SysexData,
} from "@launchpad/types.js";
import { sysexMessage } from "@launchpad/utils.js";
import type LaunchpadTransport from "@launchpad/transport.js";
import type { LaunchpadConnectionOptions } from "@launchpad/transport.js";

export const DEFAULT_INPUT_NAME = "MIDIIN2 (LPMiniMK3 MIDI)";
export const DEFAULT_OUTPUT_NAME = "MIDIOUT2 (LPMiniMK3 MIDI)";

/** Adaptador de easymidi para un Novation Launchpad Mini MK3. */
export default class EasymidiLaunchpadTransport implements LaunchpadTransport {
  #input: easymidi.Input;
  #output: easymidi.Output;
  #listeners = new Set<MIDIEventListener>();
  #disconnected = false;
  #log: boolean;

  constructor(options: LaunchpadConnectionOptions = {}) {
    const {
      inputName = DEFAULT_INPUT_NAME,
      outputName = DEFAULT_OUTPUT_NAME,
      log = false,
    } = options;

    this.#input = new easymidi.Input(inputName);
    this.#output = new easymidi.Output(outputName);
    this.#log = log;
    this.#setInProgrammerMode();
    this.#activateListeners();
  }

  subscribe(listener: MIDIEventListener) {
    this.#assertConnected();
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  render(pixels: readonly Pixel[]) {
    this.#assertConnected();
    const pixelsData: SysexData = [];
    for (const pixel of pixels) {
      pixelsData.push(...pixel.getSysexMessage());
    }
    this.#sendSysex([0, 32, 41, 2, 13, 3, ...pixelsData]);
  }

  disconnect() {
    if (this.#disconnected) return;
    this.#disconnected = true;
    this.#listeners.clear();
    this.#input.close();
    this.#output.close();
  }

  #setInProgrammerMode() {
    this.#sendSysex([0, 32, 41, 2, 13, 14, 1]);
  }

  #sendSysex(data: SysexData) {
    this.#output.send("sysex", sysexMessage(data));
  }

  #activateListeners() {
    const forward = (message: unknown) => this.#emit(message as MIDIData);

    this.#input.on("noteon", forward);
    this.#input.on("noteoff", forward);
    this.#input.on("poly aftertouch", forward);
    this.#input.on("cc", forward);
    this.#input.on("program", forward);
    this.#input.on("channel aftertouch", forward);
    this.#input.on("pitch", forward);
    this.#input.on("position", forward);
    this.#input.on("mtc", forward);
    this.#input.on("select", forward);
    this.#input.on("sysex", forward);
    this.#input.on("clock", () => this.#emit({ _type: "clock" } as MIDIData));
    this.#input.on("start", () => this.#emit({ _type: "start" } as MIDIData));
    this.#input.on("continue", () =>
      this.#emit({ _type: "continue" } as MIDIData)
    );
    this.#input.on("stop", () => this.#emit({ _type: "stop" } as MIDIData));
    this.#input.on("activesense", () =>
      this.#emit({ _type: "activesense" } as MIDIData)
    );
    this.#input.on("reset", () => this.#emit({ _type: "reset" } as MIDIData));
  }

  #emit(message: MIDIData) {
    if (this.#log) console.log("MIDI:", message);
    for (const listener of this.#listeners) {
      listener(message);
    }
  }

  #assertConnected() {
    if (this.#disconnected) {
      throw new Error("Launchpad transport is disconnected.");
    }
  }
}