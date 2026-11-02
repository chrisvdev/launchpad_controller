import assert from "node:assert/strict";
import test from "node:test";
import Launchpad from "@launchpad/launchpad.js";
import StaticPixel from "@launchpad/static_pixel.js";
import type Pixel from "@launchpad/pixel.js";
import type {
  MIDIData,
  MIDIEventListener,
} from "@launchpad/types.js";
import type LaunchpadTransport from "@launchpad/transport.js";

class FakeLaunchpadTransport implements LaunchpadTransport {
  readonly renders: Pixel[][] = [];
  #listeners = new Set<MIDIEventListener>();
  disconnected = false;

  subscribe(listener: MIDIEventListener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  render(pixels: readonly Pixel[]) {
    this.renders.push([...pixels]);
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