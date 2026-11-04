import Button from "@launchpad/button.js";
import ButtonGrid from "@launchpad/button_grid.js";
import type Pixel from "@launchpad/pixel.js";
import type {
  ButtonHost,
  LaunchpadContext,
  LaunchpadFrame,
  MIDIData,
  SysexData,
} from "@launchpad/types.js";
import type {
  LaunchpadConnectionOptions,
  default as LaunchpadTransport,
} from "@launchpad/transport.js";
import { getCoordinates } from "@launchpad/utils.js";

export const MIN_TEMPO = 40;
export const MAX_TEMPO = 240;
const CLOCKS_PER_BEAT = 24;

/** Dispositivo Launchpad conectado, su cuadrícula y su ciclo de renderizado. */
export default class Launchpad implements ButtonHost, LaunchpadContext {
  #transport: LaunchpadTransport;
  #buttons: ButtonGrid;
  #unsubscribeTransport: (() => void) | undefined;
  #frames: LaunchpadFrame[] = [];
  #frameTimer: ReturnType<typeof setTimeout> | undefined;
  #isRenderingFrames = false;
  #disconnected = false;
  #tempo: number | null = null;
  #clockInterval = 0;
  #nextClock = 0;
  #clockTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(transport: LaunchpadTransport) {
    this.#transport = transport;
    this.#buttons = new ButtonGrid((x, y) => new Button(x, y, this));
    this.#unsubscribeTransport = this.#transport.subscribe(this.#handleMessage);
    this.render();
  }

  /** Conecta el agregado a un Launchpad Mini MK3 físico mediante easymidi. */
  static async connect(
    options: LaunchpadConnectionOptions = {}
  ): Promise<Launchpad> {
    const { default: EasymidiLaunchpadTransport } = await import(
      "./easymidi_launchpad_transport.js"
    );
    return new Launchpad(new EasymidiLaunchpadTransport(options));
  }

  /** Cuadrícula de botones indexada como `[x][y]`. */
  get buttons(): ButtonGrid {
    return this.#buttons;
  }

  /** Renderiza píxeles explícitos o el estado completo de la cuadrícula. */
  render(...pixels: Pixel[]) {
    this.#assertConnected();
    this.#transport.render(pixels.length ? pixels : this.#buttons.getPixels());
  }

  /** Encola un frame que toma prioridad visual durante su duración. */
  enqueueFrame(frame: LaunchpadFrame) {
    this.#assertConnected();
    if (!Number.isFinite(frame.duration) || frame.duration <= 0) {
      throw new RangeError("A frame duration must be greater than zero.");
    }

    this.#frames.push({
      pixels: [...frame.pixels],
      duration: frame.duration,
    });
    if (!this.#isRenderingFrames) {
      this.#isRenderingFrames = true;
      this.#renderNextFrame();
    }
  }

  /** Cancela frames pendientes y restaura el estado persistente de los botones. */
  clearFrames() {
    this.#assertConnected();
    if (this.#frameTimer) clearTimeout(this.#frameTimer);
    this.#frameTimer = undefined;
    this.#frames = [];
    this.#isRenderingFrames = false;
    this.render();
  }

  /**
   * Envía MIDI clock continuo para fijar la velocidad de los LEDs pulsantes e
   * intermitentes. Con `null` deja de enviarlo y el dispositivo vuelve a su
   * tempo interno (120 BPM).
   */
  setTempo(bpm: number | null) {
    this.#assertConnected();
    if (bpm !== null && (!Number.isInteger(bpm) || bpm < MIN_TEMPO || bpm > MAX_TEMPO)) {
      throw new RangeError(`Tempo must be an integer between ${MIN_TEMPO} and ${MAX_TEMPO}.`);
    }
    if (bpm !== null && !this.#transport.sendClock) {
      throw new Error("The transport does not support MIDI clock.");
    }

    this.#stopClock();
    this.#tempo = bpm;
    if (bpm === null) return;

    this.#clockInterval = 60_000 / (bpm * CLOCKS_PER_BEAT);
    this.#nextClock = Date.now();
    this.#tickClock();
  }

  /** Tempo enviado actualmente, o `null` si se usa el interno del dispositivo. */
  getTempo() {
    return this.#tempo;
  }

  /** Ajusta el brillo global de los LEDs (0–127). */
  setBrightness(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 127) {
      throw new RangeError("Brightness must be an integer between 0 and 127.");
    }
    this.#sendSysex([8, level]);
  }

  /** Apaga (`true`) o vuelve a encender (`false`) los LEDs sin perder su estado. */
  setSleep(sleep: boolean) {
    this.#sendSysex([9, sleep ? 0 : 1]);
  }

  /** Libera listeners, temporizadores y recursos del transporte MIDI. */
  disconnect() {
    if (this.#disconnected) return;
    this.#stopClock();
    this.#tempo = null;
    if (this.#frameTimer) clearTimeout(this.#frameTimer);
    this.#frameTimer = undefined;
    this.#frames = [];
    this.#isRenderingFrames = false;
    this.#unsubscribeTransport?.();
    this.#unsubscribeTransport = undefined;
    this.#disconnected = true;
    this.#transport.disconnect();
  }

  /** @internal */
  renderFromButton(pixel: Pixel) {
    if (!this.#isRenderingFrames) this.render(pixel);
  }

  /** @internal */
  getLaunchpad(): LaunchpadContext {
    return this;
  }

  #handleMessage = (message: MIDIData) => {
    if (message._type === "noteon" || message._type === "noteoff") {
      const button = this.#buttonAtCode(message.note);
      if (!button) return;

      if (message._type === "noteoff" || message.velocity === 0) {
        button.onRelease(message);
      } else {
        button.onPress(message);
      }
      return;
    }

    if (message._type === "cc") {
      const button = this.#buttonAtCode(message.controller);
      if (!button) return;

      if (message.value === 0) {
        button.onRelease(message);
      } else {
        button.onPress(message);
      }
    }
  };

  #buttonAtCode(code: number): Button | undefined {
    const coordinates = getCoordinates(code);
    return coordinates
      ? this.#buttons.at(coordinates.x, coordinates.y)
      : undefined;
  }

  #renderNextFrame() {
    const frame = this.#frames[0];
    if (!frame) {
      this.#isRenderingFrames = false;
      this.#frameTimer = undefined;
      this.render();
      return;
    }

    this.#transport.render(frame.pixels);
    this.#frameTimer = setTimeout(() => {
      this.#frames.shift();
      this.#renderNextFrame();
    }, frame.duration);
  }

  #sendSysex(data: SysexData) {
    this.#assertConnected();
    if (!this.#transport.sendSysex) {
      throw new Error("The transport does not support SysEx commands.");
    }
    this.#transport.sendSysex(data);
  }

  // Scheduled against absolute time so timer jitter doesn't drift the tempo.
  #tickClock = () => {
    const now = Date.now();
    let sent = 0;
    while (this.#nextClock <= now && sent < CLOCKS_PER_BEAT) {
      this.#transport.sendClock?.();
      this.#nextClock += this.#clockInterval;
      sent++;
    }
    if (this.#nextClock <= now) this.#nextClock = now + this.#clockInterval;
    this.#clockTimer = setTimeout(this.#tickClock, this.#nextClock - now);
  };

  #stopClock() {
    if (this.#clockTimer) clearTimeout(this.#clockTimer);
    this.#clockTimer = undefined;
  }

  #assertConnected() {
    if (this.#disconnected) {
      throw new Error("Launchpad is disconnected.");
    }
  }
}