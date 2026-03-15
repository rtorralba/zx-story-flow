# ZX Story Flow

![ZX Spectrum](https://img.shields.io/badge/ZX%20Spectrum-48K-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0-green)
![Status](https://img.shields.io/badge/status-active-success)

**Crea tus propias aventuras conversacionales para el mítico ZX Spectrum de forma visual y sin picar código.**

**ZX Story Flow** (también conocido cariñosamente como *Choice-Lee-Plot*) es una herramienta web diseñada para autores de ficción interactiva y amantes de lo retro. Olvídate de pelearte con el código BASIC; diseña tu historia mediante nodos, conecta las decisiones visualmente y exporta tu juego listo para ser jugado.

## 🚀 Características Principales

### Editor Visual de Nodos
- Crea pantallas y conecta opciones arrastrando cables
- Visualiza el flujo de tu aventura de un vistazo
- Sistema de grupos con nombres personalizados y colores
- Redimensiona y mueve grupos completos

### Sistema de Colores ZX Spectrum
Configuración completa del sistema de atributos del ZX Spectrum:

- **Configuración Global**: Define colores por defecto para toda la aventura
- **Configuración por Página**: Personaliza INK, PAPER, BRIGHT y FLASH para cada nodo individualmente
- **Tres zonas configurables**:
  - **Página**: Color del texto principal de la historia
  - **Separador**: Color de la línea que separa el texto de las opciones
  - **Opciones**: Color del menú de opciones al final de la pantalla

Soporta los 8 colores clásicos del Spectrum (Negro, Azul, Rojo, Magenta, Verde, Cyan, Amarillo, Blanco) con modos BRIGHT y FLASH.

### Generador de BASIC Inteligente
- **Ajuste de línea automático**: Mantiene el texto dentro de las 32 columnas del Spectrum sin cortar palabras
- **Sanitizado de caracteres**: Limpia textos para evitar errores de sintaxis en el microordenador
- **Posicionamiento inteligente de opciones**: Las opciones siempre aparecen al final de la pantalla
- **Gestión automática de atributos**: Aplica correctamente INK, PAPER, BRIGHT y FLASH en cada sección

### Exportación Multi-formato
- **BASIC (.TAP)**: Genera un archivo `.tap` ejecutable en cualquier emulador o hardware real de ZX Spectrum
- **MuCho (.txt)**: Exporta para el motor MuCho (Multiple Choice Adventure Engine) con atributos incluidos

### Editor de Texto Mejorado
- Editor a pantalla completa con simulación de pantalla CRT del Spectrum
- Transliteración automática de caracteres especiales (á→a, ñ→n, etc.)
- Límite de 32×24 caracteres como en el Spectrum real

### Gestión de Nodos
- Icono de eliminar en cada nodo para una gestión rápida
- Panel de propiedades optimizado con controles compactos
- Combinación de controles en línea para ahorrar espacio vertical

### Otras Funcionalidades
- **Exportación de Imágenes**: Guarda tu diagrama de flujo completo como PNG
- **Modo Pantalla Completa**: Ideal para trabajar sin distracciones o embeber la herramienta en otros sitios
- **Gestión de proyectos**: Guarda y carga tus aventuras en formato JSON

## 📼 ¿Cómo funciona?

1. **Configura los colores**: Abre Config (⚙️) y define los colores por defecto para tu aventura
2. **Añade Screens**: Crea los nodos que representan las escenas de tu historia
3. **Escribe tu relato**: Describe la situación y añade opciones (Ir al norte, Abrir cofre, etc.)
4. **Personaliza colores (opcional)**: Marca "Configuración específica" en cualquier nodo para darle colores únicos
5. **Organiza con grupos**: Agrupa nodos relacionados en cajas de colores para mantener el orden
6. **Conecta**: Arrastra desde el punto verde de una opción al nodo de destino
7. **Exporta**: Dale a Export → .TAP y ¡listo! Tienes un juego de Spectrum generado en segundos con todos tus colores

## 🎨 Sistema de Colores Técnico

El ZX Spectrum usa un byte de atributo para cada celda de 8×8 píxeles:

- **Bits 0-2**: INK (color de tinta)
- **Bits 3-5**: PAPER (color de fondo)
- **Bit 6**: BRIGHT (intensidad)
- **Bit 7**: FLASH (parpadeo)

ZX Story Flow gestiona automáticamente estos atributos y los aplica correctamente en el código BASIC generado.

## 🛠️ Tecnologías

- **HTML5/CSS3**: Interfaz de usuario
- **JavaScript (ES6+)**: Lógica de la aplicación
- **Canvas API**: Editor de nodos y exportación de imágenes
- **Custom TAP Generator**: Generación de archivos TAP desde BASIC
- Sin dependencias externas - 100% standalone

## 📁 Estructura del Proyecto

```
zx-story-flow/
├── index.html              # Aplicación principal
├── style.css              # Estilos
├── js/
│   ├── app.js            # Lógica principal y gestión de nodos
│   ├── node-editor.js    # Editor visual de nodos
│   ├── nodes.js          # Definición de nodos y conexiones
│   ├── basic-generator.js # Generador de código BASIC
│   ├── mucho-generator.js # Generador de formato MuCho
│   └── tap-generator.js   # Generador de archivos TAP
├── examples/             # Proyectos de ejemplo
├── images/              # Recursos gráficos
├── LICENSE              # Licencia AGPL-3.0
└── README.md           # Este archivo
```

## 🚀 Uso

### Ejecutar localmente

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/zx-story-flow.git
cd zx-story-flow
```

2. Abre `index.html` en un navegador moderno

O usa un servidor local:
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```

3. Accede a `http://localhost:8000`

### Ejecutar en línea

Visita la versión desplegada: [Tu URL aquí]

## 📖 Formato de Proyecto

Los proyectos se guardan en formato JSON:

```json
{
  "nodes": {
    "n1": {
      "id": "n1",
      "x": 100,
      "y": 100,
      "text": "Te encuentras en una cueva oscura...",
      "outputs": ["Ir al norte", "Ir al sur"],
      "useCustomConfig": true,
      "pageConfig": {
        "ink": 7,
        "paper": 0,
        "bright": 1,
        "flash": 0
      }
    }
  },
  "connections": {
    "c1": {
      "from": "n1",
      "outputIndex": 0,
      "to": "n2"
    }
  },
  "globalConfig": {
    "page": { "ink": 7, "paper": 0, "bright": 0, "flash": 0 },
    "separator": { "ink": 6, "paper": 0, "bright": 1, "flash": 0 },
    "interface": { "ink": 7, "paper": 1, "bright": 1, "flash": 0 }
  }
}
```

## 🎮 Formatos de Exportación

### BASIC (.TAP)

Genera un archivo TAP estándar compatible con:
- **Emuladores**: ZEsarUX, Speccy, SpecEmu, etc.
- **Hardware real**: Usando TZXDuino, CASDuino o similar

El código BASIC generado incluye:
- Gestión automática de pantalla (CLS, PRINT AT)
- Sistema de menú con INPUT
- Saltos condicionales (GO TO)
- Atributos de color por zona

### MuCho (.txt)

Formato para el motor MuCho con marcadores especiales:
- `$Q`: Definición de pregunta/pantalla
- `attr:`: Atributo de página
- `dattr:`: Atributo de separador
- `iattr:`: Atributo de interfaz
- `$A`: Opciones de respuesta
- `$P`: Marcador de párrafo

## 🤝 Contribuir

Las contribuciones son bienvenidas:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está licenciado bajo la **GNU Affero General Public License v3.0 o posterior**.

Esto significa que:
- ✅ Puedes usar, modificar y distribuir este software
- ✅ Puedes usarlo comercialmente
- ⚠️ Debes mantener la misma licencia AGPL-3.0
- ⚠️ Debes compartir el código fuente de tus modificaciones
- ⚠️ Si ofreces el servicio vía web, debes ofrecer el código fuente

Ver el archivo [LICENSE](LICENSE) para más detalles.

### Agradecimientos

Este proyecto no habría sido posible sin el apoyo y contribuciones de la comunidad retro:

#### Inspiración y Referencias Técnicas

- **[txt2bas](https://github.com/remy/txt2bas)** por **Remy Sharp** (MIT License) - Usado como referencia para identificar y corregir casos especiales en la tokenización de BASIC y la implementación del formato TAP. ¡Gracias por tu excelente trabajo y documentación!

- **[MuCho Adventure Engine](https://solhsa.com/mucho/mucho.html)** - Motor de aventuras conversacionales para ZX Spectrum que inspiró uno de los formatos de exportación

#### Apoyo y Motivación

- **David** de [Furillo Productions](https://github.com/Iadvd) - Por animarme a mejorar el proyecto y sugerir la exportación a formato MuCho

- **Darkside29** ([itch.io](https://darkside29.itch.io/)) - Por la idea de integrar MuCho y el feedback constante

#### Otras atribuciones

- **Computer.bin** ([https://www.jimblimey.com/](https://www.jimblimey.com/)) - Fuente de ejemplo transformada a binario de la fuente del repositorio [https://github.com/epto/epto-fonts](https://github.com/epto/epto-fonts)

#### Testing y Consejos

- **CarlosITV** ([itch.io](https://charlyitv.itch.io/)) - Por las pruebas exhaustivas y reportes de bugs

- **SingletonJohn** ([itch.io](https://singletonjohn.itch.io/)) - Por el testing y verificación de funcionalidades

- **ZXMoe** ([itch.io](https://zxmoe.itch.io/)) - Por los valiosos consejos sobre BASIC del ZX Spectrum y optimizaciones

¡Gracias a todos por formar parte de este proyecto y mantener viva la escena retro!

## 👤 Autor

**Raül Torralba Adsuara**

- GitHub: [@raultorralba](https://github.com/raultorralba)

---

*Desarrollado para la comunidad retro. ¡Vuelve a los 80 con un toque moderno!*

*Developed for the retro community. Back to the 80s with a modern twist!*
