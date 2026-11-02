import type Pixel from "@launchpad/pixel.js";
import type { MIDIEventListener } from "@launchpad/types.js";

/** Transporte del dispositivo físico usado por el agregado Launchpad. */
export default interface LaunchpadTransport {
  subscribe(listener: MIDIEventListener): () => void;
  render(pixels: readonly Pixel[]): void;
  disconnect(): void;
}

/** Opciones de conexión para el transporte MIDI de easymidi. */
export type LaunchpadConnectionOptions = {
  inputName?: string;
  outputName?: string;
  log?: boolean;
};