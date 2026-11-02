import StaticPixel from "@launchpad/static_pixel.js";
import PulsingPixel from "@launchpad/pulsing_pixel.js";
import FlashingPixel from "@launchpad/flashing_pixel.js";
import RGBPixel from "@launchpad/rgb_pixel.js";
import type Pixel from "@launchpad/pixel.js";
import type {
  AxisCoordinate,
  ButtonHost,
  Coordinate,
  DefaultPixelMaker,
  LaunchpadButtonEventListener,
  MIDIData,
  PalletCode,
  RGBPrimaryColor,
} from "@launchpad/types.js";

/**
 * Mantiene el estado visual y el comportamiento de pulsación/liberación de un
 * botón del Launchpad.
 *
 * Los botones nuevos se renderizan como RGB `(2, 2, 2)`. Sin callbacks
 * personalizados, una pulsación emite un pulso rojo durante dos segundos y una
 * liberación solo registra el evento.
 */
export default class Button {
  #x: AxisCoordinate;
  #y: AxisCoordinate;
  #host: ButtonHost;
  #defaultPixelMaker: DefaultPixelMaker = (x, y) =>
    new RGBPixel(x, y, 2, 2, 2);
  #pixel: Pixel;
  #pressListeners = new Set<LaunchpadButtonEventListener>();
  #releaseListeners = new Set<LaunchpadButtonEventListener>();

  constructor(x: AxisCoordinate, y: AxisCoordinate, host: ButtonHost) {
    this.#x = x;
    this.#y = y;
    this.#pixel = this.#defaultPixelMaker(x, y);
    this.#host = host;
  }

  /** Agrega un listener de pulsación y devuelve una función para cancelarlo. */
  onPress(listener: LaunchpadButtonEventListener): () => void;
  onPress(message: MIDIData): void;
  onPress(value: LaunchpadButtonEventListener | MIDIData): void | (() => void) {
    if (typeof value === "function") {
      this.#pressListeners.add(value);
      return () => this.#pressListeners.delete(value);
    }

    this.#notify(this.#pressListeners, value);
  }

  /** Agrega un listener de liberación y devuelve una función para cancelarlo. */
  onRelease(listener: LaunchpadButtonEventListener): () => void;
  onRelease(message: MIDIData): void;
  onRelease(
    value: LaunchpadButtonEventListener | MIDIData
  ): void | (() => void) {
    if (typeof value === "function") {
      this.#releaseListeners.add(value);
      return () => this.#releaseListeners.delete(value);
    }

    this.#notify(this.#releaseListeners, value);
  }

  /**
    * Aplica un color de paleta fijo y solicita un renderizado.
   *
    * @param code - Índice de paleta del Launchpad.
   */
  setStatic(code: PalletCode = 0) {
    this.#pixel = new StaticPixel(this.#x, this.#y, code);
    this.renderPixel();
  }

  /**
    * Aplica un color de paleta alternante administrado por el dispositivo y
    * solicita un renderizado.
   *
    * @param code - Primer índice de paleta del Launchpad.
    * @param code2 - Segundo índice de paleta del Launchpad.
   */
  setFlashing(code: PalletCode = 0, code2: PalletCode = 0) {
    this.#pixel = new FlashingPixel(this.#x, this.#y, code, code2);
    this.renderPixel();
  }

  /**
    * Aplica un color de paleta pulsante administrado por el dispositivo y
    * solicita un renderizado.
   *
    * @param code - Índice de paleta del Launchpad.
   */
  setPulsing(code: PalletCode = 0) {
    this.#pixel = new PulsingPixel(this.#x, this.#y, code);
    this.renderPixel();
  }

  /**
    * Aplica un color RGB directo y solicita un renderizado. Los tipos públicos
    * actuales restringen cada componente al rango primario de paleta, aunque
    * {@link RGBPixel} puede serializar valores de hasta 127.
   *
    * @param r - Componente rojo.
    * @param g - Componente verde.
    * @param b - Componente azul.
   */
  setRGB(red: RGBPrimaryColor, green: RGBPrimaryColor, blue: RGBPrimaryColor) {
    this.#pixel = new RGBPixel(this.#x, this.#y, red, green, blue);
    this.renderPixel();
  }

  /**
    * Construye, almacena y renderiza el píxel devuelto por el creador de píxel
    * predeterminado actual.
   *
    * @returns El píxel predeterminado recién aplicado.
   */
  setDefaultPixel() {
    const pixel = this.#defaultPixelMaker(this.#x, this.#y);
    this.#pixel = pixel;
    this.renderPixel();
    return pixel;
  }

  /**
    * Cambia la fábrica usada por {@link setDefaultPixel} y la aplica ahora.
   *
    * @param maker - Fábrica para el píxel en reposo de este botón.
   */
  setDefaultPixelMaker(maker: DefaultPixelMaker) {
    this.#defaultPixelMaker = maker;
    return this.setDefaultPixel();
  }

  /**
    * Devuelve el píxel que representa actualmente este botón.
   */
  getPixel() {
    return this.#pixel;
  }

  /**
    * Solicita al panel propietario que renderice el píxel actual de este botón.
   */
  renderPixel() {
    this.#host.renderFromButton(this.#pixel);
  }

  /**
    * Devuelve la coordenada de matriz basada en cero de este botón.
   */
  getCoordinate() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }

  #notify(
    listeners: ReadonlySet<LaunchpadButtonEventListener>,
    message: MIDIData
  ) {
    for (const listener of listeners) {
      listener(this, this.#host.getLaunchpad(), message);
    }
  }
}
