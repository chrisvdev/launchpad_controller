import Button from "@launchpad/button.js";
import ButtonGrid from "@launchpad/button_grid.js";
import type Pixel from "@launchpad/pixel.js";
import type {
  ButtonHost,
  LaunchpadContext,
  LaunchpadFrame,
  MIDIData,
} from "@launchpad/types.js";
import type {
  LaunchpadConnectionOptions,
  default as LaunchpadTransport,
} from "@launchpad/transport.js";
import { getCoordinates } from "@launchpad/utils.js";

/** Dispositivo Launchpad conectado, su cuadrícula y su ciclo de renderizado. */
export default class Launchpad implements ButtonHost, LaunchpadContext {
  #transport: LaunchpadTransport;
  #buttons: ButtonGrid;
  #unsubscribeTransport: (() => void) | undefined;
  #frames: LaunchpadFrame[] = [];
  #frameTimer: ReturnType<typeof setTimeout> | undefined;
  #isRenderingFrames = false;
  #disconnected = false;

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

  /** Libera listeners, temporizadores y recursos del transporte MIDI. */
  disconnect() {
    if (this.#disconnected) return;
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

  #assertConnected() {
    if (this.#disconnected) {
      throw new Error("Launchpad is disconnected.");
    }
  }
}