# Zaviro

Zaviro es un espacio personal para estudiar cualquier materia, adaptado al nivel académico del estudiante (desde bachillerato hasta doctorado, según la estructura de la educación en Colombia). No tiene red social, cuentas ni chat: todo se guarda en el dispositivo.

La app es inteligente por lógica propia, no por IA. Cruza los errores de todas las materias para encontrar las raíces compartidas (por ejemplo, despejes o comprensión lectora), decide cuándo repasar con repetición espaciada y señala dónde una hora de estudio da más puntos.

## Estado

| Fase | Contenido                                                                           | Estado    |
| ---- | ----------------------------------------------------------------------------------- | --------- |
| 0    | Estructura, sistema de diseño, rutas y base de datos local                          | Lista     |
| 1    | Perfiles académicos y reglas por nivel, materias, cortes, créditos, temas y apuntes | Pendiente |
| 2    | Registro de errores, conceptos raíz y árbol vivo                                    | Pendiente |
| 3    | Repetición espaciada y pantalla de repaso                                           | Pendiente |
| 4    | Calculadora de notas, promedio ponderado, rendimiento de estudio y plan             | Pendiente |
| 5    | Módulos por nivel: Saber 11, Trabajo de grado, Lecturas, Saber Pro / TyT            | Pendiente |
| 6    | Ejemplos resueltos por área con diagrama de cuerpo libre                            | Pendiente |
| 7    | Respaldo JSON, PWA y pulido                                                         | Pendiente |

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Uso

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run lint       # ESLint sin advertencias permitidas
npm test           # pruebas unitarias con Vitest
npm run build      # verificación de tipos y compilación de producción en dist/
npm run preview    # sirve la compilación de producción
npm run format     # formatea el código con Prettier
```

## Tecnología

- React 18, TypeScript y Vite
- Tailwind CSS con tokens de color propios (modo claro y oscuro)
- Zustand para el estado de la interfaz
- Dexie sobre IndexedDB para guardar todo en el dispositivo (local-first, sin backend)
- Zod para validar cada registro antes de guardarlo o importarlo
- date-fns para fechas
- d3-hierarchy y d3-force para el árbol en SVG
- Vitest para pruebas
- vite-plugin-pwa para instalarla y usarla sin internet

## Estructura

```
src/
  app/          rutas y enrutador por hash (#/materias), funciona sin servidor
  componentes/  marco de la app (barra lateral, encabezado, navegación móvil), tarjetas e íconos
  db/           base de datos Dexie, esquemas Zod, repositorio y consultas en vivo
  dominio/      catálogo de niveles, áreas, módulos y la lógica de estudio (con pruebas)
  estado/       estado global de la interfaz (tema, menú)
  styles/       estilos globales y tokens de diseño
  vistas/       pantallas de la app
```

## Perfiles y niveles

Al abrir la app por primera vez, un asistente pide el nivel (bachillerato, técnico profesional, tecnólogo, profesional universitario, especialización, maestría o doctorado), el área y la institución, y propone reglas sugeridas para ese nivel. Todas son editables porque cambian entre instituciones:

- Escala de notas (mínima, máxima, aprobatoria y decimales).
- En bachillerato, la equivalencia con la escala nacional (Superior, Alto, Básico y Bajo). Los rangos se dejan vacíos para que el estudiante escriba los de su colegio.
- Períodos, cortes, evidencias o hitos, con su peso.
- Créditos académicos (48 horas por crédito y la proporción entre horas con docente y trabajo independiente).
- Nota mínima por materia, promedio ponderado por créditos y promedio acumulado mínimo.
- Intervalos iniciales del repaso espaciado.
- Módulos activos.

Se pueden tener varios perfiles a la vez (por ejemplo, un tecnólogo y una carrera universitaria) y cambiar entre ellos desde el encabezado. Cambiar el nivel de un perfil no borra datos. Las reglas sugeridas están en `src/dominio/niveles.ts`.

## Errores, raíces y árbol vivo

- Registro rápido: materia, tema y tipo de error con un toque cada uno; la raíz y los detalles son opcionales.
- Cada concepto raíz tiene un nivel de origen. Si un error de un nivel superior apunta a una raíz de un nivel anterior, Zaviro la marca como "base pendiente de un nivel anterior" y propone un repaso corto.
- El ranking de raíces cruza los errores de todas las materias y perfiles. Cada error pesa según su antigüedad (pierde la mitad cada 21 días) y si está resuelto (pesa 0,3). La lógica está en `src/dominio/raices.ts`.
- El árbol vivo de la pantalla de inicio se calcula en `src/dominio/arbol.ts`: d3-hierarchy reparte materias y temas en la copa y d3-force acomoda las raíces bajo tierra, más profundas cuanto más bajo es su nivel de origen. El color de cada hoja muestra el dominio, las hojas con repasos vencidos se ven oxidadas y las raíces de los temas con errores recientes se iluminan.

## Datos y privacidad

Toda la información vive en IndexedDB del navegador. Nada se envía a ningún servidor. Los datos de ejemplo se marcan con `esEjemplo` y se pueden borrar desde Ajustes con el botón "Borrar datos de ejemplo", sin afectar los datos reales.

## Diseño

La interfaz sigue una estructura de tablero: barra lateral en tono arena con la navegación y un consejo del día, encabezado con saludo y fecha, y el contenido en tarjetas. La paleta usa fondo crema grisáceo, tarjetas claras, acciones en café oscuro, verde para lo dominado, óxido para lo que toca repasar y ámbar para las raíces responsables de los fallos. Los colores están definidos como variables en `src/styles/index.css`.

## Accesibilidad

- Navegación completa con teclado, enlace para saltar al contenido y foco visible.
- Contraste verificado en modo claro y oscuro.
- Respeta la preferencia del sistema de reducir animaciones.
