# Launchpad Controller

Controlador TypeScript para **Novation Launchpad Mini MK3**. Se conecta por
MIDI, representa los 81 pads como una cuadrícula 9 × 9 y permite reaccionar a
pulsaciones y controlar sus LEDs con colores estáticos, intermitentes, pulsantes
o RGB.

El repositorio incluye una demo ejecutable y una API reutilizable en
`src/lib/launchpad`.

## Requisitos

- Windows, macOS o Linux con Node.js instalado.
- [pnpm](https://pnpm.io/installation).
- Un Novation Launchpad Mini MK3 conectado y reconocido como dispositivo MIDI.

El transporte MIDI usa `easymidi` y su backend nativo. Este workspace permite
la compilación del paquete nativo requerido mediante `pnpm-workspace.yaml`.

## Instalación

```bash
pnpm install
```

## Ejecutar la demo

Conecta el Launchpad y ejecuta:

```bash
pnpm start
```

La aplicación usa por defecto los puertos MIDI `MIDIIN2 (LPMiniMK3 MIDI)` y
`MIDIOUT2 (LPMiniMK3 MIDI)`. Déjala abierta mientras pruebas el dispositivo y
deténla con `Ctrl+C`.

### Controles de la demo

Las coordenadas se escriben como `(x, y)`, con valores de 0 a 8; `x` es la
columna y `y` la fila.

| Pad | Acción |
| --- | --- |
| Cuadrícula `(0..3, 0..3)` | Se ilumina en violeta. Al pulsar, alterna rojo y azul durante 10 segundos y luego vuelve al color de reposo. |
| `(8, 0)` | Encola y reproduce durante 10 segundos una imagen RGB de toda la cuadrícula. |
| `(8, 1)` | Cancela el frame actual y los pendientes, y restaura el estado de los pads. |
| `(8, 8)` | Cambia el color del efecto pulsante cada segundo. |

## Desarrollo

```bash
pnpm build
pnpm test
```

`pnpm test` compila el proyecto y ejecuta las pruebas con un transporte MIDI
falso, por lo que no necesita un Launchpad conectado. Para recompilar y
reiniciar automáticamente la demo al editar el código, el script `pnpm watch`
requiere `concurrently`, que aún no está declarado como dependencia del
proyecto.

## Publicación

GitHub Actions ejecuta build y pruebas en cada push y pull request. Las
publicaciones posteriores a npm ocurren únicamente al subir un tag `vX.Y.Z`
que coincida con la versión de `package.json`.

Para la primera publicación, inicia sesión en npm y publica desde la raíz:

```bash
npm login
npm publish --access public
```

`prepack` compila y ejecuta las pruebas automáticamente. Cuando el paquete ya
exista en npm, configura **Trusted Publishing** en sus ajustes con estos valores:
proveedor GitHub Actions, organización/usuario `chrisvdev`, repositorio
`launchpad_controller`, workflow `publish.yml` (solo el nombre del archivo) y
permiso para publicar directamente con `npm publish`.

Para cada versión posterior, incrementa `version` en `package.json`, integra el
cambio en `main` y crea/sube el tag correspondiente. Por ejemplo, después de
publicar `1.0.0`:

```bash
git tag v1.0.1
git push origin v1.0.1
```

El workflow espera una publicación pública con provenance de npm; no requiere
guardar un token npm en GitHub Secrets.

## Uso de la API

La API principal es `Launchpad.connect()`. El siguiente ejemplo cambia el LED
de un botón y responde a su pulsación:

```ts
import Launchpad from "@chrisvdev/launchpad-controller";

const launchpad = await Launchpad.connect();
const button = launchpad.buttons.at(0, 0);

if (button) {
  button.setRGB(63, 0, 20);
  button.onPress((pressedButton) => pressedButton.setPulsing(5));
}

launchpad.disconnect();
```

La cuadrícula usa coordenadas basadas en cero y el acceso seguro
`buttons.at(x, y)`. Cada listener de `onPress` y `onRelease` devuelve una
función para cancelar la suscripción. `disconnect()` cierra los puertos y
libera los recursos MIDI.

Consulta la [referencia completa de la API](doc/API.md) para ver opciones de
conexión, eventos MIDI, frames, tipos de píxel, utilidades y transportes
personalizados.

## Licencia

Este proyecto se distribuye bajo **GNU LGPL v3.0 o cualquier versión posterior**.
Consulta [LICENSE](LICENSE), [COPYING](COPYING) y [COPYING.LESSER](COPYING.LESSER)
para los términos completos y [NOTICE](NOTICE) para la atribución.

### Puertos MIDI personalizados

Si el sistema muestra nombres de puertos distintos, pásalos a `connect`:

```ts
const launchpad = await Launchpad.connect({
  inputName: "NOMBRE DEL PUERTO DE ENTRADA",
  outputName: "NOMBRE DEL PUERTO DE SALIDA",
  log: true,
});
```

`log: true` imprime los mensajes MIDI recibidos en la terminal.

## Estructura

```text
src/
  index.ts                 Demo ejecutable
  lib/launchpad/           API, botones, píxeles y transporte MIDI
doc/
  API.md                   Referencia detallada
  launchpad_mini- programmers_reference_manual.pdf
```

El código de dominio puede probarse sin abrir puertos MIDI inyectando un
`LaunchpadTransport`. `Launchpad.connect()` utiliza el adaptador `easymidi` del
Launchpad Mini MK3.

## Alcance actual

El código fuente de la API vive en `src/lib/launchpad`. El paquete
`@chrisvdev/launchpad-controller` expone la API desde su entrada raíz; los
ejemplos de la demo dentro de `src/index.ts` siguen usando alias internos de
TypeScript y no forman parte del paquete.