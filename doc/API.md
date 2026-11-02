# API de Launchpad Controller

Referencia de la API implementada en `src/lib/launchpad`. La implementación
actual está orientada al **Novation Launchpad Mini MK3** y usa MIDI/SysEx a
través de `easymidi`.

## Importación

La API pública se importa desde la raíz del paquete. En este repositorio el
nombre configurado es `launchpad`; antes de publicar, confirma su disponibilidad
en npm o sustituye ese nombre por el que vayas a utilizar.

## Inicio rápido

En este repositorio, crea una instancia y registra eventos sobre un botón:

```ts
import Launchpad from "launchpad";

const launchpad = await Launchpad.connect({ log: true });
const button = launchpad.buttons.at(0, 0);

if (button) {
  button.setRGB(63, 0, 20);
  const unsubscribe = button.onPress((pressedButton) => {
    pressedButton.setPulsing(5);
  });
  unsubscribe();
}

launchpad.disconnect();
```

`Launchpad.connect()` abre los puertos MIDI, cambia el dispositivo a Programmer
Mode y renderiza inicialmente los 81 botones. El adaptador MIDI se carga al
conectar; importar `Launchpad` por sí solo no abre los puertos.

## Coordenadas y botones

La superficie se representa como una cuadrícula de 9 × 9. Las coordenadas
empiezan en cero: `x` es la columna y `y` la fila. El acceso recomendado es
`buttons.at(x, y)`, que devuelve `undefined` si una coordenada no es entera o
queda fuera de 0–8.

```ts
const button = launchpad.buttons.at(8, 0);
button?.setStatic(5);

launchpad.buttons.forEach((currentButton, x, y) => {
  if (x === y) currentButton.setRGB(40, 0, 40);
});
```

`buttons.matrix` es una vista de solo lectura y se indexa como
`matrix[x][y]`. `buttons.getPixels()` devuelve los píxeles actuales en orden de
columnas y filas. Los botones comienzan con un píxel RGB tenue `(2, 2, 2)`.
Una pulsación no cambia automáticamente su apariencia: el callback registrado
decide qué acción visual realizar.

`ButtonGrid` expone `matrix`, `at(x, y)`, `forEach(callback)` y `getPixels()`.
`forEach` recorre las columnas y luego las filas, y llama al callback con
`(button, x, y)`. `GRID_SIZE` vale `9`. Su constructor de bajo nivel recibe una
fábrica `(x, y) => Button`; normalmente no hace falta crear una cuadrícula
manualmente.

### Métodos de `Button`

| Método | Comportamiento |
| --- | --- |
| `onPress(listener)` | Añade un listener de pulsación. Devuelve una función que lo elimina. |
| `onRelease(listener)` | Añade un listener de liberación. Devuelve una función que lo elimina. |
| `setStatic(code = 0)` | Aplica un color fijo de la paleta. |
| `setFlashing(code = 0, code2 = 0)` | Alterna entre dos colores de paleta mediante el dispositivo. |
| `setPulsing(code = 0)` | Aplica un color pulsante mediante el dispositivo. |
| `setRGB(red, green, blue)` | Aplica color RGB directo. Cada componente debe ser un valor aceptado por el dispositivo, de 0 a 127. |
| `setDefaultPixelMaker(maker)` | Guarda y aplica una fábrica de píxeles en reposo. |
| `setDefaultPixel()` | Vuelve a crear y aplicar el píxel en reposo actual; devuelve ese píxel. |
| `getPixel()` | Devuelve el objeto `Pixel` actualmente almacenado. |
| `getCoordinate()` | Devuelve `{ x, y }` para el botón. |
| `renderPixel()` | Vuelve a solicitar el renderizado del píxel actual. |

Las fábricas tienen la firma `(x, y) => Pixel`. Se ejecutan al llamar a
`setDefaultPixel()` o `setDefaultPixelMaker()`; cambiar el píxel actual con
`setStatic`, `setPulsing`, `setFlashing` o `setRGB` no cambia la fábrica.

Cada listener recibe `(button, launchpad, message)`. Los listeners son
acumulables; cada función de cancelación elimina únicamente su listener. La
excepción o el error de un listener no se intercepta por esta API.

```ts
const release = button?.onRelease((releasedButton, source, message) => {
  console.log(releasedButton.getCoordinate(), message._type);
  source.render();
});

release?.();
```

## Eventos MIDI

El transporte reenvía eventos MIDI al objeto `Launchpad`. La API de botones
interpreta únicamente `noteon`, `noteoff` y `cc`:

| Entrada MIDI | Acción |
| --- | --- |
| `noteon` con velocidad distinta de cero | `onPress` |
| `noteon` con velocidad cero | `onRelease` |
| `noteoff` | `onRelease` |
| `cc` con valor distinto de cero | `onPress` |
| `cc` con valor cero | `onRelease` |

Los códigos MIDI que no corresponden a una posición de la matriz se ignoran.
Los demás tipos MIDI que el transporte recibe no se convierten en eventos de
botón. Para `noteon`/`noteoff`, la posición se obtiene de `message.note`; para
`cc`, de `message.controller`.

## Renderizado y frames

### Métodos de `Launchpad`

| Método o propiedad | Comportamiento |
| --- | --- |
| `Launchpad.connect(options?)` | Conecta el dispositivo y devuelve `Promise<Launchpad>`. |
| `buttons` | Devuelve el `ButtonGrid` del dispositivo. |
| `render(...pixels)` | Renderiza los píxeles indicados; sin argumentos, renderiza el estado de los 81 botones. |
| `enqueueFrame({ pixels, duration })` | Añade un frame a la cola FIFO y le da prioridad visual durante su duración. |
| `clearFrames()` | Cancela el frame actual y los pendientes, y restaura el estado persistente de los botones. |
| `disconnect()` | Libera listeners, temporizadores y puertos MIDI. Puede llamarse más de una vez. |

Un cambio en un botón renderiza solo ese píxel, salvo mientras se reproduce un
frame: el estado del botón se actualiza, pero el frame conserva la prioridad
visual. Al terminar la cola se vuelve a renderizar la cuadrícula. Cada duración
debe ser finita y mayor que cero; de lo contrario, `enqueueFrame` lanza
`RangeError`. El array `pixels` se copia al encolar el frame, pero los objetos
`Pixel` no se clonan.

```ts
import { RGBPixel } from "launchpad";
import type { Pixel } from "launchpad";

const image: Pixel[] = [
  new RGBPixel(0, 0, 63, 0, 0),
  new RGBPixel(1, 0, 0, 63, 0),
];

launchpad.enqueueFrame({ pixels: image, duration: 1_000 });
launchpad.clearFrames();
```

Después de `disconnect()`, las operaciones `render`, `enqueueFrame` y
`clearFrames` lanzan `Error`. La desconexión cierra los puertos; para volver a
usar el dispositivo hay que llamar otra vez a `Launchpad.connect()`.

## Píxeles

`Pixel` es la interfaz común de los elementos renderizables:

```ts
interface Pixel {
  getSysexMessage(): number[];
  getPosition(): { x: number; y: number };
}
```

| Clase | Constructor | Modo |
| --- | --- | --- |
| `StaticPixel` | `(x, y, code = 0)` | Color de paleta fijo. |
| `FlashingPixel` | `(x, y, code = 0, code2 = 0)` | Alternancia entre dos colores de paleta. |
| `PulsingPixel` | `(x, y, code = 0)` | Color de paleta pulsante. |
| `RGBPixel` | `(x, y, red = 0, green = 0, blue = 0)` | Color RGB directo, componentes 0–127. |

Todos los constructores reciben coordenadas de matriz basadas en cero. Cada
clase implementa `getPosition()` y `getSysexMessage()`; normalmente se pasan
instancias de píxel a `Launchpad.render()` o `enqueueFrame()` en vez de enviar
SysEx directamente.

## Utilidades de color y coordenadas

Las utilidades se importan desde la raíz del paquete.

### `getColor(red, green, blue, h = false)`

Codifica niveles de color de paleta en un índice. Cada componente de paleta va
de 0 a 3. La fórmula es `red * 16 + green * 4 + blue`; con `h = true`, suma 64
para seleccionar el banco alto.

```ts
import { getColor } from "launchpad";

const magenta = getColor(3, 0, 3); // 51
const highBankGreen = getColor(0, 3, 0, true); // 76
button?.setStatic(magenta);
```

La función no valida ni limita los valores: respeta los rangos indicados para
evitar códigos de paleta inválidos.

### `getPosition(x, y)` y `getCoordinates(code)`

Convierten entre coordenadas de la matriz y códigos de posición MIDI. La
codificación es `10 * (y + 1) + (x + 1)`: por ejemplo, `(0, 0)` corresponde al
código `11` y `(8, 8)` al `99`. `getCoordinates(code)` devuelve `{ x, y }` o
`undefined` para un código no válido. `getPosition` no valida los límites.

### `sysexMessage(data)`

Envuelve una carga útil SysEx con los bytes de inicio `240` y fin `247`. Se usa
principalmente en la implementación del transporte.

## Opciones de conexión

`Launchpad.connect(options?)` acepta un `LaunchpadConnectionOptions`:

| Propiedad | Tipo | Valor predeterminado | Uso |
| --- | --- | --- | --- |
| `inputName` | `string` | `MIDIIN2 (LPMiniMK3 MIDI)` | Nombre del puerto MIDI de entrada. |
| `outputName` | `string` | `MIDIOUT2 (LPMiniMK3 MIDI)` | Nombre del puerto MIDI de salida. |
| `log` | `boolean` | `false` | Escribe los mensajes MIDI recibidos en la consola. |

Ejemplo para configurar los nombres mostrados por el sistema:

```ts
const launchpad = await Launchpad.connect({
  inputName: "MIDIIN2 (LPMiniMK3 MIDI)",
  outputName: "MIDIOUT2 (LPMiniMK3 MIDI)",
  log: true,
});
```

Los nombres deben coincidir con los puertos MIDI disponibles en el equipo. La
conexión puede fallar si el dispositivo/puerto no existe, está ocupado o no se
puede abrir mediante el backend MIDI de `easymidi`.

## Contratos TypeScript

Los tipos se importan desde la raíz del paquete. Los alias de rango son
documentales: están definidos como `number` y TypeScript no impone sus límites.

| Tipo | Definición/propósito |
| --- | --- |
| `AxisCoordinate` | Número para un eje de coordenadas. La matriz usa 0–8. |
| `Coordinate` | `{ x: AxisCoordinate; y: AxisCoordinate }`. |
| `CodeCoordinate` | Código de posición MIDI numérico. |
| `PalletCode` | Índice numérico de paleta. |
| `PalletColorCode` | Alias de `PalletCode`. |
| `PalletPrimaryColor` | Componente numérico de paleta; `getColor` espera 0–3. |
| `RGBPrimaryColor` | Componente RGB numérico; el dispositivo espera 0–127. |
| `SysexData` | `number[]` con bytes de carga SysEx. |
| `MIDIMessageType` | Unión de `noteon`, `noteoff`, `poly aftertouch`, `cc`, `program`, `channel aftertouch`, `pitch`, `position`, `mtc`, `select`, `clock`, `start`, `continue`, `stop`, `activesense`, `reset` y `sysex`. |
| `MIDIData` | Mensaje MIDI con `_type`, `note`, `controller`, `velocity`, `value` y campos adicionales. |
| `MIDIEventListener` | Callback `(message: MIDIData) => void`. |
| `DefaultPixelMaker` | Callback `(x, y) => Pixel`. |
| `LaunchpadFrame` | `{ pixels: readonly Pixel[]; duration: number }`, duración en ms. |
| `LaunchpadContext` | Superficie del Launchpad disponible a los listeners: botones, render, frames y desconexión. |
| `LaunchpadButtonEventListener` | Callback `(button, launchpad, message) => void`. |
| `ButtonHost` | Contrato interno que necesita un botón para solicitar render y obtener el contexto. |

`LaunchpadContext` describe el subconjunto accesible a callbacks:
`buttons`, `render(...pixels)`, `enqueueFrame(frame)`, `clearFrames()` y
`disconnect()`. El constructor de `Button` recibe `(x, y, host)` y el de
`ButtonGrid` recibe un `ButtonFactory`; ambos son constructores de bajo nivel.

`MIDIData` es intencionadamente flexible y refleja los mensajes de
`easymidi`; los campos útiles dependen de `_type`. Para pulsación MIDI, usa
`note`/`velocity`; para controladores, `controller`/`value`.

## Transporte personalizado

La abstracción `LaunchpadTransport` permite integrar otro backend. Se importa
desde la raíz del paquete y requiere:

```ts
interface LaunchpadTransport {
  subscribe(listener: MIDIEventListener): () => void;
  render(pixels: readonly Pixel[]): void;
  disconnect(): void;
}
```

`new Launchpad(transport)` construye el agregado con ese transporte. El
transporte debe estar listo para renderizar cuando se construya el `Launchpad`,
ya que el constructor se suscribe y envía el estado inicial de la cuadrícula.
`EasymidiLaunchpadTransport` es la implementación incluida. Está separada de la
entrada raíz para que importar la API normal no cargue el backend MIDI nativo.
Se importa explícitamente junto con sus nombres de puerto predeterminados:

```ts
import EasymidiLaunchpadTransport, {
  DEFAULT_INPUT_NAME,
  DEFAULT_OUTPUT_NAME,
} from "launchpad/easymidi";
```

La construcción directa, `Button`, `ButtonGrid`, `ButtonFactory`,
`EasymidiLaunchpadTransport` y `LaunchpadTransport` son APIs de nivel bajo. En
uso normal, basta con `Launchpad.connect()` y los métodos de sus botones.