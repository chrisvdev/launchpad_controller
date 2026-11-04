import assert from "node:assert/strict";
import test, { mock } from "node:test";
import Launchpad from "@launchpad/launchpad.js";
import StaticPixel from "@launchpad/static_pixel.js";
import type Pixel from "@launchpad/pixel.js";
import type {
  MIDIData,
  MIDIEventListener,
  SysexData,
} from "@launchpad/types.js";
import type LaunchpadTransport from "@launchpad/transport.js";

class FakeLaunchpadTransport implements LaunchpadTransport {
  readonly renders: Pixel[][] = [];
  readonly sysex: SysexData[] = [];
  clocks = 0;
  #listeners = new Set<MIDIEventListener>();
  disconnected = false;

  subscribe(listener: MIDIEventListener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  render(pixels: readonly Pixel[]) {
    this.renders.push([...pixels]);
  }

  sendSysex(data: SysexData) {
    this.sysex.push(data);
  }

  sendClock() {
    this.clocks++;
  }

  disconnect() {
    this.disconnected = true;
    this.#listeners.clear();
  }

  emit(message: MIDIData) {
    for (const listener of this.#listeners) listener(message);
  }
}

function noteMessage(note: number, velocity: number): MIDIData {
  return {
    _type: "noteon",
    note,
    velocity,
    controller: 0,
    value: 0,
  };
}

test("crea una matriz 9x9 y renderiza su estado inicial una sola vez", () => {
  const transport = new FakeLaunchpadTransport();
  const launchpad = new Launchpad(transport);

  assert.equal(launchpad.buttons.matrix.length, 9);
  launchpad.buttons.matrix.forEach((column, x) => {
    assert.equal(column.length, 9);
    column.forEach((button, y) => {
      assert.deepEqual(button.getCoordinate(), { x, y });
    });
  });
  assert.equal(Object.isFrozen(launchpad.buttons.matrix), true);
  assert.equal(Object.isFrozen(launchpad.buttons.matrix[0]), true);
  assert.equal(transport.renders.length, 1);
  assert.equal(transport.renders[0]?.length, 81);
  assert.equal(launchpad.buttons.at(-1, 0), undefined);
  assert.equal(launchpad.buttons.at(0, 9), undefined);

  launchpad.disconnect();
  assert.equal(transport.disconnected, true);
});

test("enruta eventos, respeta cancelaciones y restaura el estado tras frames", () => {
  const transport = new FakeLaunchpadTransport();
  const launchpad = new Launchpad(transport);
  const button = launchpad.buttons.at(0, 0);
  if (!button) throw new Error("Expected a button at (0, 0).");

  let presses = 0;
  let releases = 0;
  const unsubscribePress = button.onPress((_button, source) => {
    presses++;
    assert.equal(source, launchpad);
  });
  button.onRelease(() => {
    releases++;
  });

  transport.emit(noteMessage(11, 127));
  transport.emit(noteMessage(11, 0));
  transport.emit(noteMessage(10, 127));
  assert.equal(presses, 1);
  assert.equal(releases, 1);

  unsubscribePress();
  transport.emit(noteMessage(11, 127));
  assert.equal(presses, 1);

  button.setRGB(12, 34, 56);
  assert.deepEqual(transport.renders.at(-1)?.[0]?.getSysexMessage(), [3, 11, 12, 34, 56]);

  const framePixel = new StaticPixel(0, 0, 7);
  launchpad.enqueueFrame({ pixels: [framePixel], duration: 100 });
  assert.deepEqual(transport.renders.at(-1)?.[0]?.getSysexMessage(), [0, 11, 7]);
  launchpad.clearFrames();
  assert.equal(transport.renders.at(-1)?.length, 81);
  assert.throws(
    () => launchpad.enqueueFrame({ pixels: [], duration: 0 }),
    RangeError
  );

  launchpad.disconnect();
  transport.emit(noteMessage(11, 127));
  assert.equal(presses, 1);
});

test("envía MIDI clock al tempo indicado y lo detiene", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  // Mocked Date only advances per tick() call, so step in 1 ms increments.
  const advance = (ms: number) => {
    for (let i = 0; i < ms; i++) mock.timers.tick(1);
  };
  try {
    const transport = new FakeLaunchpadTransport();
    const launchpad = new Launchpad(transport);

    launchpad.setTempo(120);
    assert.equal(launchpad.getTempo(), 120);
    advance(1_000);
    assert.ok(Math.abs(transport.clocks - 48) <= 1, `got ${transport.clocks} clocks`);

    launchpad.setTempo(60);
    const before = transport.clocks;
    advance(1_000);
    assert.ok(Math.abs(transport.clocks - before - 24) <= 1);

    launchpad.setTempo(null);
    assert.equal(launchpad.getTempo(), null);
    const stopped = transport.clocks;
    advance(1_000);
    assert.equal(transport.clocks, stopped);

    launchpad.setTempo(200);
    launchpad.disconnect();
    const disconnected = transport.clocks;
    advance(1_000);
    assert.equal(transport.clocks, disconnected);
    assert.equal(launchpad.getTempo(), null);
  } finally {
    mock.timers.reset();
  }
});

test("valida tempo y brillo, y envía los SysEx de brillo y sleep", () => {
  const transport = new FakeLaunchpadTransport();
  const launchpad = new Launchpad(transport);

  assert.throws(() => launchpad.setTempo(39), RangeError);
  assert.throws(() => launchpad.setTempo(241), RangeError);
  assert.throws(() => launchpad.setTempo(120.5), RangeError);
  assert.throws(() => launchpad.setBrightness(128), RangeError);

  launchpad.setBrightness(64);
  launchpad.setSleep(true);
  launchpad.setSleep(false);
  assert.deepEqual(transport.sysex, [
    [8, 64],
    [9, 0],
    [9, 1],
  ]);

  launchpad.disconnect();
  assert.throws(() => launchpad.setBrightness(10), Error);
});

test("falla con claridad si el transporte no soporta clock ni SysEx", () => {
  const transport: LaunchpadTransport = {
    subscribe: () => () => undefined,
    render: () => undefined,
    disconnect: () => undefined,
  };
  const launchpad = new Launchpad(transport);

  assert.throws(() => launchpad.setTempo(120), /MIDI clock/);
  assert.throws(() => launchpad.setBrightness(10), /SysEx/);
  launchpad.setTempo(null);
  launchpad.disconnect();
});