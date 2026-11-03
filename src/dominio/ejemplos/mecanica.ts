import { enEquilibrio, resultante, type Fuerza } from '../fuerzas';
import { num, type Generador } from './tipos';

const rad = (g: number) => (g * Math.PI) / 180;

/** Bloque que baja por un plano inclinado con fricción. */
export const planoInclinado: Generador = {
  id: 'g-plano-inclinado',
  areas: ['ingenieria', 'naturales'],
  titulo: 'Bloque en un plano inclinado con fricción',
  tema: 'Segunda ley de Newton',
  parametros: [
    { clave: 'm', etiqueta: 'Masa', unidad: 'kg', valor: 10, min: 0.1, max: 1000 },
    { clave: 'theta', etiqueta: 'Inclinación', unidad: '°', valor: 30, min: 1, max: 89 },
    { clave: 'mu', etiqueta: 'Coeficiente de fricción', unidad: '', valor: 0.2, min: 0, max: 2 },
    { clave: 'g', etiqueta: 'Gravedad', unidad: 'm/s²', valor: 9.81, min: 1, max: 30 },
  ],
  resolver: ({ m = 10, theta = 30, mu = 0.2, g = 9.81 }) => {
    const W = m * g;
    const paralela = W * Math.sin(rad(theta));
    const perpendicular = W * Math.cos(rad(theta));
    const N = perpendicular;
    const friccionMax = mu * N;
    const desliza = paralela > friccionMax;
    const f = desliza ? friccionMax : paralela;
    const a = desliza ? (paralela - f) / m : 0;
    const fuerzas: Fuerza[] = [
      { nombre: 'W', tipo: 'peso', magnitud: W, angulo: 270, unidad: 'N' },
      { nombre: 'N', tipo: 'normal', magnitud: N, angulo: theta + 90, unidad: 'N' },
      { nombre: 'f', tipo: 'friccion', magnitud: f, angulo: theta, unidad: 'N' },
    ];
    // La resultante debe ir a lo largo del plano, hacia abajo, y valer m·a.
    const R = resultante(fuerzas);
    const comprobado = Math.abs(R.magnitud - m * a) < 1e-6 * Math.max(1, W);
    return {
      enunciado: `Un bloque de ${num(m)} kg está sobre un plano inclinado ${num(theta)}° con coeficiente de fricción ${num(mu)}. ¿Desliza? Si lo hace, ¿con qué aceleración baja? Usa g = ${num(g)} m/s².`,
      diagrama: { cuerpo: 'bloque', inclinacion: theta, fuerzas },
      pasos: [
        {
          descripcion:
            'Dibuja las fuerzas sobre el bloque: el peso hacia abajo, la normal perpendicular al plano y la fricción a lo largo del plano, en contra del movimiento (hacia arriba del plano).',
        },
        {
          descripcion: 'Calcula el peso: la masa por la gravedad.',
          calculo: `W = m · g = ${num(m)} kg · ${num(g)} m/s²`,
          valor: `W = ${num(W)} N`,
        },
        {
          descripcion:
            'Gira los ejes para que x vaya a lo largo del plano y y perpendicular a él. Así solo el peso tiene dos componentes: la que empuja el bloque plano abajo (con seno) y la que lo aprieta contra el plano (con coseno).',
          calculo: `W∥ = W · sen ${num(theta)}° = ${num(W)} · ${num(Math.sin(rad(theta)), 4)}\nW⊥ = W · cos ${num(theta)}° = ${num(W)} · ${num(Math.cos(rad(theta)), 4)}`,
          valor: `W∥ = ${num(paralela)} N; W⊥ = ${num(perpendicular)} N`,
        },
        {
          descripcion:
            'En la dirección perpendicular el bloque no se mueve, así que las fuerzas se cancelan: la normal es igual a la componente perpendicular del peso.',
          calculo: `ΣFy = 0 → N − W⊥ = 0 → N = W⊥`,
          valor: `N = ${num(N)} N`,
        },
        {
          descripcion:
            'La fricción máxima que puede hacer el plano es el coeficiente por la normal. Compárala con la componente que empuja el bloque.',
          calculo: `f máx = μ · N = ${num(mu)} · ${num(N)} = ${num(friccionMax)} N; W∥ = ${num(paralela)} N`,
          valor: desliza
            ? 'W∥ es mayor: el bloque desliza'
            : 'W∥ no alcanza: el bloque se queda quieto',
        },
        desliza
          ? {
              descripcion:
                'Aplica la segunda ley de Newton a lo largo del plano: la fuerza neta es la componente del peso menos la fricción, y es igual a la masa por la aceleración. Despeja a dividiendo entre m.',
              calculo: `ΣFx = m · a → W∥ − f = m · a → a = (W∥ − f) / m = (${num(paralela)} − ${num(f)}) / ${num(m)}`,
              valor: `a = ${num(a)} m/s² plano abajo`,
            }
          : {
              descripcion:
                'Como no desliza, la fricción solo hace la fuerza necesaria para equilibrar: vale lo mismo que W∥, y la aceleración es cero.',
              calculo: `f = W∥ = ${num(paralela)} N`,
              valor: 'a = 0 m/s²',
            },
      ],
      comprobacion: desliza
        ? `Suma las tres fuerzas como vectores: la resultante mide ${num(R.magnitud)} N, que es igual a m · a = ${num(m)} · ${num(a)} = ${num(m * a)} N. Las unidades cuadran: kg · m/s² = N.`
        : `Suma las tres fuerzas como vectores: la resultante mide ${num(R.magnitud)} N, es decir, el bloque está en equilibrio, como corresponde a a = 0.`,
      comprobado,
    };
  },
};

/** Peso colgado de dos cables. */
export const dosCables: Generador = {
  id: 'g-dos-cables',
  areas: ['ingenieria', 'naturales'],
  titulo: 'Peso colgado de dos cables',
  tema: 'Equilibrio de partículas',
  parametros: [
    { clave: 'W', etiqueta: 'Peso', unidad: 'N', valor: 500, min: 1, max: 100000 },
    {
      clave: 'alfa',
      etiqueta: 'Ángulo del cable izquierdo',
      unidad: '°',
      valor: 40,
      min: 1,
      max: 89,
    },
    {
      clave: 'beta',
      etiqueta: 'Ángulo del cable derecho',
      unidad: '°',
      valor: 55,
      min: 1,
      max: 89,
    },
  ],
  resolver: ({ W = 500, alfa = 40, beta = 55 }) => {
    const s = Math.sin(rad(alfa + beta));
    const T1 = (W * Math.cos(rad(beta))) / s;
    const T2 = (W * Math.cos(rad(alfa))) / s;
    const fuerzas: Fuerza[] = [
      { nombre: 'T1', tipo: 'tension', magnitud: T1, angulo: 180 - alfa, unidad: 'N' },
      { nombre: 'T2', tipo: 'aplicada', magnitud: T2, angulo: beta, unidad: 'N' },
      { nombre: 'W', tipo: 'peso', magnitud: W, angulo: 270, unidad: 'N' },
    ];
    const R = resultante(fuerzas);
    return {
      enunciado: `Un objeto de ${num(W)} N cuelga de dos cables. El izquierdo forma ${num(alfa)}° con la horizontal y el derecho ${num(beta)}°. ¿Qué tensión soporta cada cable?`,
      diagrama: { cuerpo: 'particula', inclinacion: 0, fuerzas },
      pasos: [
        {
          descripcion:
            'Aísla el nudo donde se unen los cables y dibuja las tres fuerzas: T1 hacia arriba a la izquierda, T2 hacia arriba a la derecha y el peso hacia abajo.',
        },
        {
          descripcion:
            'Como el nudo está quieto, las fuerzas horizontales se cancelan: lo que T1 jala a la izquierda lo jala T2 a la derecha.',
          calculo: `ΣFx = 0 → T2 · cos ${num(beta)}° − T1 · cos ${num(alfa)}° = 0`,
        },
        {
          descripcion:
            'Las fuerzas verticales también se cancelan: entre los dos cables sostienen el peso.',
          calculo: `ΣFy = 0 → T1 · sen ${num(alfa)}° + T2 · sen ${num(beta)}° − ${num(W)} = 0`,
        },
        {
          descripcion:
            'De la primera ecuación despeja T2 en función de T1 y reemplázalo en la segunda. Al simplificar queda una fórmula con el seno de la suma de los ángulos.',
          calculo: `T2 = T1 · cos ${num(alfa)}° / cos ${num(beta)}°\nT1 = W · cos β / sen(α + β) = ${num(W)} · ${num(Math.cos(rad(beta)), 4)} / ${num(s, 4)}`,
          valor: `T1 = ${num(T1)} N`,
        },
        {
          descripcion: 'Con T1 ya conocida, calcula T2 con la fórmula del despeje.',
          calculo: `T2 = W · cos α / sen(α + β) = ${num(W)} · ${num(Math.cos(rad(alfa)), 4)} / ${num(s, 4)}`,
          valor: `T2 = ${num(T2)} N`,
        },
      ],
      comprobacion: `Reemplaza en las dos ecuaciones: ΣFx = ${num(R.x, 4)} N y ΣFy = ${num(R.y, 4)} N, prácticamente cero. ${
        T1 > T2
          ? 'T1 es mayor porque'
          : T2 > T1
            ? 'T2 es mayor porque'
            : 'Las tensiones son iguales porque'
      } ${T1 === T2 ? 'los ángulos son iguales' : 'el cable más empinado carga más peso'}.`,
      comprobado: enEquilibrio(fuerzas),
    };
  },
};
