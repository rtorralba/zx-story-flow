# 🚀 Novedades — 14 de marzo, 2026 🇪🇸

Pequeña actualización centrada en compatibilidad, robustez del exportador BASIC, mejoras en el editor visual y manejo de imágenes. Estas mejoras llegan sobre lo publicado el 3 de marzo y han sido implementadas para facilitar exportaciones a máquinas Spectrum y mejorar el flujo de creación.

## Versión BASIC mejorada
Ahora puedes añadir pantalla de carga e imágenes en tu aventura usando los 128K y siendo compatible con todos los modelos de ZX Spectrum.

Esta mejora junto con todas las optimizaciones de BASIC ha sido gentileza de [ZXMoe](https://zxmoe.itch.io/) que ha pasado a colaborar más activamente en el proyecto.

<iframe width="560" height="315" src="https://www.youtube.com/embed/5-xBX8oUpSE?si=2s-ayhjuIXtoiaBd" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Detalles relevantes

- Compatibilidad BASIC y loader
  - Entrega soporte para ROMs y dialectos 128K / +2 / +2A / +3 y añade un loader específico para +3.
  - Ajustes en renumeración y compactación para reducir memoria usada en el Spectrum.
  - Corrección de salida `PRINT` para manejar texto multilínea correctamente y añadido de `;` final en impresiones donde hacía falta.

- Editor de nodos y UX
  - Redimensionado de pantallas/nodos individualmente para encajar textos largos.
  - Selección y resaltado mejorados: ahora el glow incluye los hijos y padres inmediatos para facilitar navegación del flujo.
  - Icono de redimensionar mejorado y funcional incluso dentro de grupos.
  - Nuevas opciones de borde y ajustes visuales en la configuración del proyecto.

- Importación, conversión y exportadores
  - Nuevas utilidades `tap2bas` y `img2tap` para facilitar la conversión de activos y juegos.
  - Mejoras en la importación desde MuCho y en la creación/optimización de proyectos al importar.
  - Mejoras en comandos y elegibilidad para exportación a CYD (opciones que aparecen/ocultan según el estado del juego).

- Imágenes y activos
  - Lectura asíncrona y persistencia inmediata de imágenes en el proyecto.
  - Preservación de `imageData` cuando se seleccionan imágenes con el mismo nombre dentro de párrafos.
  - Conversión y limitación de imagen a BW cuando corresponde (optimización Spectrum), y soporte para incluir imágenes en builds BASIC.
  - Editor UDG integrado para diseñar caracteres personalizados (separador y selector).

- Correcciones y estabilización
  - Emisión de atributos optimizada para evitar redundancias.
  - Arreglos en transliteración y preservación de espacios en blanco.
  - Detección de IDs duplicados y validaciones adicionales para prevenir colisiones.

---

# 🚀 Updates — March 14, 2026

Small update focused on compatibility, improved robustness of the BASIC exporter, visual editor enhancements and image handling. These changes build on the March 3 release and have been implemented to simplify exports to Spectrum machines and streamline the authoring flow.

## Improved BASIC version
You can now add a loading screen and images to your adventure using 128K while remaining compatible with all ZX Spectrum models.

This improvement, along with all BASIC optimizations, was kindly contributed by [ZXMoe](https://zxmoe.itch.io/), who has started collaborating more actively on the project.

<iframe width="560" height="315" src="https://www.youtube.com/embed/5-xBX8oUpSE?si=2s-ayhjuIXtoiaBd" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Relevant details

- BASIC compatibility and loader
  - Adds support for 128K / +2 / +2A / +3 ROMs and dialects and includes a dedicated loader for +3.
  - Renumbering and compaction tweaks to reduce memory usage on the Spectrum.
  - Fixes `PRINT` output to correctly handle multi-line text and adds a trailing `;` where needed.

- Node editor and UX
  - Resize individual screens/nodes to fit long texts.
  - Improved selection and highlighting: the glow now includes immediate children and parents to ease flow navigation.
  - Improved resize icon that works even inside groups.
  - New border options and visual settings in project configuration.

- Import, conversion and exporters
  - New utilities `tap2bas` and `img2tap` to ease asset and game conversions.
  - Improvements in MuCho import and in project creation/optimization when importing.
  - Improvements in commands and eligibility for CYD export (options that show/hide based on game state).

- Images and assets
  - Asynchronous reading and immediate persistence of images in the project.
  - Preservation of `imageData` when selecting images with the same name inside paragraphs.
  - Conversion and limitation to BW when appropriate (Spectrum optimization), and support for including images in BASIC builds.
  - Integrated UDG editor to design custom characters (separator and selector).

- Fixes and stabilization
  - Optimized attribute emission to avoid redundancies.
  - Fixes for transliteration and preservation of whitespace.
  - Duplicate ID detection and additional validations to prevent collisions.