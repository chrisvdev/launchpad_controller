# Launchpad Controller

## Objetivo

Este proyecto controla un Novation Launchpad Mini MK3 por MIDI. Modela un
Launchpad conectado como un objeto que contiene una matriz de 9 por 9 botones,
recibe eventos de los pads y envia comandos SysEx para actualizar sus LEDs.

## Arquitectura

| Capa | Archivo | Responsabilidad |
| --- | --- | --- |
| API de dominio | `src/lib/launchpad/launchpad.ts` | `Launchpad` contiene la cuadrícula, enruta eventos MIDI, renderiza LEDs, gestiona frames y libera recursos. |
| Cuadrícula | `src/lib/launchpad/button_grid.ts` | Construye y expone los 81 botones con indices `[x][y]`. |
| Botón | `src/lib/launchpad/button.ts` | Mantiene el estado visual y listeners de pulsación/liberación acumulables. |
| Transporte | `src/lib/launchpad/transport.ts` | Contrato inyectable entre el agregado y el dispositivo físico. |
| Hardware | `src/lib/launchpad/easymidi_launchpad_transport.ts` | Implementación `easymidi`: puertos, Programmer mode y SysEx. |
| LEDs | `src/lib/launchpad/*_pixel.ts` | Serializan los modos fijo, flashing, pulsing y RGB. |
| Tipos y conversiones | `types.ts`, `utils.ts` | Definen contratos y convierten entre coordenadas de matriz y codigos MIDI. |

El agregado no importa el adaptador MIDI nativo al cargarse. `Launchpad.connect()`
lo carga solo al conectar un dispositivo, de modo que la logica se puede probar
con un transporte falso sin ALSA ni hardware.

## Uso

```ts
import Launchpad from "@launchpad/launchpad.js";

const launchpad = await Launchpad.connect({
  inputName: "MIDIIN2 (LPMiniMK3 MIDI)",
  outputName: "MIDIOUT2 (LPMiniMK3 MIDI)",
});

const button = launchpad.buttons.at(0, 0);
button?.setRGB(63, 0, 20);

const unsubscribe = button?.onPress((pressedButton, source) => {
  pressedButton.setPulsing(5);
  source.enqueueFrame({ pixels: [pressedButton.getPixel()], duration: 250 });
});

unsubscribe?.();
launchpad.disconnect();
```

`launchpad.buttons.matrix` es una vista de solo lectura y conserva la
orientacion `[x][y]`: `x` es columna, `y` es fila, ambos de 0 a 8. Para acceso
seguro se recomienda `buttons.at(x, y)`, que devuelve `undefined` fuera de la
matriz.

Los eventos `noteon`, `noteoff` y `cc` se traducen a `onPress` y `onRelease`.
Los listeners son acumulables y cada suscripción devuelve una funcion para
cancelarla. Los codigos MIDI que no pertenecen a la matriz se descartan.

## Renderizado y frames

Un cambio visual de un botón renderiza solo su pixel. `launchpad.render()` sin
argumentos renderiza los 81 estados persistentes. `enqueueFrame()` da prioridad
temporal a una cola FIFO de frames; `clearFrames()` la cancela y restaura la
cuadrícula. Cada frame requiere una duracion positiva en milisegundos.

## Desarrollo y validacion

```bash
pnpm build
pnpm test
```

`pnpm test` compila el proyecto y ejecuta pruebas con un transporte falso. La
suite cubre construccion de la matriz, render inicial unico, limites, ruteo MIDI,
suscripciones, frames y desconexion sin abrir puertos MIDI.

Para ejecutar la demostracion con un dispositivo fisico conectado:

```bash
pnpm start
```

El adaptador usa por defecto `MIDIIN2 (LPMiniMK3 MIDI)` y
`MIDIOUT2 (LPMiniMK3 MIDI)`, pero ambos nombres se pueden configurar mediante
`Launchpad.connect()`.