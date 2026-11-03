# Zaviro

Zaviro es un espacio personal para estudiar cualquier materia, adaptado al nivel académico del estudiante (desde bachillerato hasta doctorado, según la estructura de la educación en Colombia). No tiene red social, cuentas ni chat: todo se guarda en el dispositivo.

La app es inteligente por lógica propia, no por IA. Cruza los errores de todas las materias para encontrar las raíces compartidas (por ejemplo, despejes o comprensión lectora), decide cuándo repasar con repetición espaciada y señala dónde una hora de estudio da más puntos.

## Estado

| Fase | Contenido                                                                           | Estado |
| ---- | ----------------------------------------------------------------------------------- | ------ |
| 0    | Estructura, sistema de diseño, rutas y base de datos local                          | Lista  |
| 1    | Perfiles académicos y reglas por nivel, materias, cortes, créditos, temas y apuntes | Lista  |
| 2    | Registro de errores, conceptos raíz y árbol vivo                                    | Lista  |
| 3    | Repetición espaciada y pantalla de repaso                                           | Lista  |
| 4    | Calculadora de notas, promedio ponderado, rendimiento de estudio y plan             | Lista  |
| 5    | Módulos por nivel: Saber 11, Trabajo de grado, Lecturas, Saber Pro / TyT            | Lista  |
| 6    | Ejemplos resueltos por área con diagrama de cuerpo libre                            | Lista  |
| 7    | Respaldo JSON, PWA y pulido                                                         | Lista  |

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
  config/       valores externos que hay que verificar (pesos del Saber 11)
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

## Repaso espaciado y dominio

- Las tarjetas se crean desde un apunte, desde un error (automáticamente si tiene enunciado y solución), desde una base de un nivel anterior o a mano.
- El algoritmo es SM-2 con cuatro calificaciones (olvidé, difícil, bien, fácil). Los primeros intervalos salen de las reglas del perfil, así que bachillerato repasa más seguido y posgrado deja más espacio. Si olvidas una tarjeta vuelve a salir en 10 minutos, dentro de la misma sesión. Ver `src/dominio/repaso.ts`.
- El dominio de cada tema (de 0 a 1) combina los aciertos en los repasos (los recientes pesan más), la caída por el tiempo sin repasar (más lenta si las tarjetas ya tienen intervalos largos) y los errores recientes sin resolver. Se recalcula después de cada repaso y al abrir la app. Ver `src/dominio/dominio.ts`.
- En la pantalla Repasar se usa Espacio para ver la respuesta y las teclas 1 a 4 para calificar.

## Notas, promedio y plan

- La calculadora usa la escala y la nota aprobatoria del perfil. Con las notas de los cortes ya calificados dice cuánto necesitas en promedio en lo que falta para aprobar o para tu meta, y si ya es imposible o ya está asegurado. Ver `src/dominio/notas.ts`.
- El promedio puede ser simple o ponderado por créditos, según las reglas del perfil. Se muestran el semestral, el acumulado (solo materias con nota final) y el proyectado (si terminas como vas). Si el perfil tiene un promedio mínimo, también cuánto necesitas para mantenerlo.
- Rendimiento de estudio: puntos ganables por hora = peso del tema en el examen × (1 − dominio) ÷ horas estimadas. Con créditos, las horas salen de créditos × horas por crédito × trabajo independiente × peso del corte × peso del tema; sin créditos se usa una estimación por peso. Ver `src/dominio/rendimiento.ts`.
- El plan reparte las horas de cada tema entre hoy y su examen. Reserva primero el tiempo de los repasos y luego asigna bloques por rendimiento, subiendo las materias apretadas (lo que les falta frente a las horas que quedarían antes del examen). Avisa si las horas no alcanzan. Las horas por día y los días sin estudio se guardan por perfil. Ver `src/dominio/plan.ts`.
- Al marcar un bloque como hecho se guarda una sesión de estudio; el plan descuenta esas horas y se recalcula solo si te atrasas.

## Módulos por nivel

- Saber 11 (bachillerato): registra simulacros con el puntaje de las cinco pruebas (0 a 100). El global (0 a 500) es el promedio ponderado por 5, con pesos 3 para Lectura Crítica, Matemáticas, Sociales y Ciudadanas y Ciencias Naturales, y 1 para Inglés. Los pesos están en `src/config/saber11.ts` con una nota para verificarlos contra la resolución vigente del ICFES. La pantalla muestra la evolución del global y qué prueba reforzar primero: la que deja más puntos de global por ganar según el promedio de los últimos tres simulacros, subiendo un poco las que vienen bajando. Ver `src/dominio/saber11.ts`.
- Saber Pro / Saber TyT (técnico, tecnólogo y profesional, opcional): el estudiante define los módulos genéricos y específicos (hay nombres sugeridos para los genéricos). Cada práctica se guarda como aciertos sobre preguntas y se compara en porcentaje; la app no convierte a la escala oficial porque no se puede verificar. Ver `src/dominio/saberPro.ts`.
- Trabajo de grado (especialización y maestría) e hitos de investigación (doctorado): hitos con fecha, estado y notas, con hitos sugeridos por nivel, progreso, próxima entrega, atrasados y calendario de entregas por mes. Muestra también la regla de promedio del perfil (nota mínima por curso y acumulado mínimo) frente al acumulado actual. Ver `src/dominio/hitos.ts`.
- Lecturas (posgrado): cola de lectura (primero lo que estás leyendo), estado por lectura, notas y citas con fuente y página. El banco de citas reúne todas las citas, se busca sin importar tildes y copia cada cita con su fuente. Ver `src/dominio/lecturas.ts`.
- Bitácora de avances (doctorado; se puede activar en especialización y maestría): entradas con fecha, horas y el hito al que aportan, con horas de la semana, de los últimos 30 días y aviso si llevas una semana sin registrar. Ver `src/dominio/bitacora.ts`.
- Los datos de ejemplo traen un perfil de bachillerato con simulacros, prácticas de Saber TyT en el perfil de tecnólogo y un perfil de maestría con hitos, lecturas y bitácora.

## Ejemplos resueltos

- Biblioteca de ejemplos que se resuelven solos: cambias los datos y cada paso, despeje, valor y la comprobación se recalculan. Hay uno o dos por área: plano inclinado con fricción y peso colgado de dos cables (ingeniería y ciencias exactas, también naturales), dilución, dosis según el peso (ejercicio académico), búsqueda binaria, elasticidad precio de la demanda y escalar una imagen. Primero aparecen los del área del perfil. Ver `src/dominio/ejemplos/`.
- Cada paso tiene una explicación en palabras, el cálculo con los números reemplazados y el resultado con su unidad. La comprobación se verifica en el código (por ejemplo, que la suma de fuerzas dé m · a o cero).
- Los de mecánica muestran el diagrama de cuerpo libre en SVG: cada fuerza como flecha desde el centro, con un color por tipo (peso, normal, fricción, tensión, aplicada), largo proporcional a su magnitud y una tabla con sus componentes. Ver `src/dominio/fuerzas.ts` y `src/componentes/DiagramaCuerpoLibre.tsx`.
- Mis ejemplos: guarda una copia de la biblioteca en un tema o escribe los tuyos con pasos, comprobación y, si quieres, las fuerzas del diagrama (se muestra la suma de fuerzas mientras las escribes).

## Datos y privacidad

Toda la información vive en IndexedDB del navegador. Nada se envía a ningún servidor. Los datos de ejemplo se marcan con `esEjemplo` y se pueden borrar desde Ajustes con el botón "Borrar datos de ejemplo", sin afectar los datos reales.

### Respaldo

- En Ajustes, "Descargar respaldo" guarda un archivo `zaviro-respaldo-AAAA-MM-DD.json` con todas las tablas y los ajustes. La app recuerda la fecha del último respaldo.
- "Importar respaldo" valida cada registro con los mismos esquemas Zod de la app. Si algún registro no es válido, no se importa nada y se muestra cuál falla y por qué. Se puede combinar con lo que ya hay (gana el registro del respaldo si el id coincide) o reemplazar todo.
- En la pantalla de bienvenida también se puede restaurar un respaldo, para pasar los datos a un equipo nuevo.
- Ajustes permite pedir almacenamiento persistente para que el navegador no borre los datos cuando le falta espacio. Ver `src/db/respaldo.ts`.

### Instalación y uso sin internet

Zaviro es una PWA: se puede instalar desde el navegador (íconos de 192 y 512 px, ícono adaptable para Android y ícono para iOS) y funciona sin conexión, porque el service worker guarda en caché la app completa, incluida la fuente. Tiene accesos directos a Repasar, Errores y Notas y plan. Las pantallas menos usadas y las librerías se cargan en archivos separados.

## Diseño

La interfaz sigue una estructura de tablero: barra lateral en tono arena con la navegación y un consejo del día, encabezado con saludo y fecha, y el contenido en tarjetas. La paleta usa fondo crema grisáceo, tarjetas claras, acciones en café oscuro, verde para lo dominado, óxido para lo que toca repasar y ámbar para las raíces responsables de los fallos. Los colores están definidos como variables en `src/styles/index.css`.

## Accesibilidad

- Navegación completa con teclado, enlace para saltar al contenido y foco visible.
- Contraste verificado en modo claro y oscuro.
- Respeta la preferencia del sistema de reducir animaciones.
