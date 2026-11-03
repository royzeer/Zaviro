import { num, type Generador, type Paso } from './tipos';

/** Dilución de una solución: C1·V1 = C2·V2. */
export const dilucion: Generador = {
  id: 'g-dilucion',
  areas: ['naturales', 'salud'],
  titulo: 'Preparar una dilución',
  tema: 'Concentración de soluciones',
  parametros: [
    {
      clave: 'C1',
      etiqueta: 'Concentración de la solución madre',
      unidad: 'mol/L',
      valor: 2,
      min: 0.001,
      max: 100,
    },
    {
      clave: 'C2',
      etiqueta: 'Concentración que necesitas',
      unidad: 'mol/L',
      valor: 0.5,
      min: 0.001,
      max: 100,
    },
    { clave: 'V2', etiqueta: 'Volumen final', unidad: 'mL', valor: 250, min: 1, max: 100000 },
  ],
  resolver: ({ C1 = 2, C2 = 0.5, V2 = 250 }) => {
    const V1 = (C2 * V2) / C1;
    const agua = V2 - V1;
    const posible = C2 <= C1;
    return {
      enunciado: `Tienes una solución de ${num(C1)} mol/L y necesitas ${num(V2)} mL a ${num(C2)} mol/L. ¿Cuánto de la solución madre tomas y cuánta agua agregas?`,
      ...(posible
        ? {}
        : {
            aviso:
              'Diluir solo baja la concentración: la que necesitas debe ser menor o igual a la de la solución madre.',
          }),
      pasos: [
        {
          descripcion:
            'Al diluir no cambia la cantidad de soluto, solo el volumen. Por eso la concentración por el volumen es igual antes y después.',
          calculo: 'C1 · V1 = C2 · V2',
        },
        {
          descripcion: 'Despeja V1 dividiendo entre C1 a ambos lados.',
          calculo: `V1 = C2 · V2 / C1 = ${num(C2)} mol/L · ${num(V2)} mL / ${num(C1)} mol/L`,
          valor: `V1 = ${num(V1)} mL`,
        },
        {
          descripcion:
            'El agua que falta es el volumen final menos lo que tomaste de la solución madre.',
          calculo: `agua = V2 − V1 = ${num(V2)} − ${num(V1)}`,
          valor: `${num(agua)} mL de agua`,
        },
      ],
      comprobacion: `Moles antes: ${num(C1)} · ${num(V1 / 1000, 4)} L = ${num((C1 * V1) / 1000, 4)} mol. Moles después: ${num(C2)} · ${num(V2 / 1000, 4)} L = ${num((C2 * V2) / 1000, 4)} mol. Son iguales, como debe ser.`,
      comprobado: posible && Math.abs(C1 * V1 - C2 * V2) < 1e-9,
    };
  },
};

/** Dosis por peso y volumen a administrar (ejercicio académico). */
export const dosisPorPeso: Generador = {
  id: 'g-dosis',
  areas: ['salud'],
  titulo: 'Dosis según el peso',
  tema: 'Cálculo de dosis',
  parametros: [
    { clave: 'peso', etiqueta: 'Peso del paciente', unidad: 'kg', valor: 18, min: 1, max: 250 },
    {
      clave: 'dosis',
      etiqueta: 'Dosis indicada',
      unidad: 'mg/kg',
      valor: 15,
      min: 0.01,
      max: 1000,
    },
    {
      clave: 'conc',
      etiqueta: 'Concentración del frasco',
      unidad: 'mg/mL',
      valor: 32,
      min: 0.01,
      max: 1000,
    },
  ],
  resolver: ({ peso = 18, dosis = 15, conc = 32 }) => {
    const total = peso * dosis;
    const volumen = total / conc;
    return {
      enunciado: `Ejercicio académico: un paciente de ${num(peso)} kg necesita ${num(dosis)} mg/kg de un medicamento que viene a ${num(conc)} mg/mL. ¿Cuántos mg y cuántos mL corresponden?`,
      aviso:
        'Es un ejercicio para practicar el cálculo. No reemplaza la indicación de un profesional ni los protocolos de tu institución.',
      pasos: [
        {
          descripcion:
            'La dosis total sale de multiplicar la dosis por kilo por el peso. Los kg se cancelan y quedan mg.',
          calculo: `dosis total = ${num(dosis)} mg/kg · ${num(peso)} kg`,
          valor: `${num(total)} mg`,
        },
        {
          descripcion:
            'Para pasar de mg a mL divide entre la concentración: cada mL trae esa cantidad de mg.',
          calculo: `volumen = ${num(total)} mg / ${num(conc)} mg/mL`,
          valor: `${num(volumen)} mL`,
        },
      ],
      comprobacion: `Vuelve atrás: ${num(volumen)} mL · ${num(conc)} mg/mL = ${num(volumen * conc)} mg, y ${num(volumen * conc)} mg / ${num(peso)} kg = ${num((volumen * conc) / peso)} mg/kg, la dosis indicada.`,
      comprobado: Math.abs((volumen * conc) / peso - dosis) < 1e-9,
    };
  },
};

/** Elasticidad precio de la demanda con el método del punto medio. */
export const elasticidad: Generador = {
  id: 'g-elasticidad',
  areas: ['sociales'],
  titulo: 'Elasticidad precio de la demanda',
  tema: 'Elasticidad',
  parametros: [
    { clave: 'P1', etiqueta: 'Precio inicial', unidad: '$', valor: 2000, min: 1, max: 1e9 },
    { clave: 'P2', etiqueta: 'Precio final', unidad: '$', valor: 2500, min: 1, max: 1e9 },
    {
      clave: 'Q1',
      etiqueta: 'Cantidad inicial',
      unidad: 'unidades',
      valor: 1200,
      min: 1,
      max: 1e9,
    },
    { clave: 'Q2', etiqueta: 'Cantidad final', unidad: 'unidades', valor: 900, min: 1, max: 1e9 },
  ],
  resolver: ({ P1 = 2000, P2 = 2500, Q1 = 1200, Q2 = 900 }) => {
    const pq = (Q2 - Q1) / ((Q1 + Q2) / 2);
    const pp = (P2 - P1) / ((P1 + P2) / 2);
    const E = pp === 0 ? NaN : pq / pp;
    const abs = Math.abs(E);
    const tipo = !Number.isFinite(E)
      ? 'no se puede calcular porque el precio no cambió'
      : abs > 1
        ? 'elástica: la cantidad cambia proporcionalmente más que el precio'
        : abs < 1
          ? 'inelástica: la cantidad cambia proporcionalmente menos que el precio'
          : 'unitaria: cambian en la misma proporción';
    return {
      enunciado: `Cuando el precio pasa de $${num(P1, 0)} a $${num(P2, 0)}, la cantidad demandada pasa de ${num(Q1, 0)} a ${num(Q2, 0)} unidades. ¿Cuál es la elasticidad precio de la demanda?`,
      ...(pp === 0 ? { aviso: 'Si el precio no cambia, la elasticidad no está definida.' } : {}),
      pasos: [
        {
          descripcion:
            'Con el método del punto medio, el cambio porcentual se calcula sobre el promedio de los dos valores. Así da lo mismo si el precio sube o baja.',
        },
        {
          descripcion: 'Cambio porcentual de la cantidad.',
          calculo: `%ΔQ = (${num(Q2, 0)} − ${num(Q1, 0)}) / ((${num(Q1, 0)} + ${num(Q2, 0)}) / 2)`,
          valor: `${num(pq * 100)} %`,
        },
        {
          descripcion: 'Cambio porcentual del precio.',
          calculo: `%ΔP = (${num(P2, 0)} − ${num(P1, 0)}) / ((${num(P1, 0)} + ${num(P2, 0)}) / 2)`,
          valor: `${num(pp * 100)} %`,
        },
        {
          descripcion: 'La elasticidad es el cociente. Se interpreta con su valor absoluto.',
          calculo: `E = %ΔQ / %ΔP = ${num(pq * 100)} % / ${num(pp * 100)} %`,
          valor: Number.isFinite(E) ? `E = ${num(E)}, |E| = ${num(abs)}` : 'No definida',
        },
      ],
      comprobacion: Number.isFinite(E)
        ? `La demanda es ${tipo}. ${E < 0 ? 'El signo negativo confirma la ley de la demanda: si el precio sube, la cantidad baja.' : 'Ojo: el signo es positivo, algo raro para un bien normal; revisa los datos.'}`
        : 'Sin cambio de precio no hay elasticidad que calcular.',
      comprobado: Number.isFinite(E) && E < 0,
    };
  },
};

/** Escalar una imagen sin deformarla. */
export const proporcion: Generador = {
  id: 'g-proporcion',
  areas: ['arte'],
  titulo: 'Escalar una imagen sin deformarla',
  tema: 'Proporción y composición',
  parametros: [
    {
      clave: 'ancho',
      etiqueta: 'Ancho original',
      unidad: 'px',
      valor: 1920,
      min: 1,
      max: 100000,
      entero: true,
    },
    {
      clave: 'alto',
      etiqueta: 'Alto original',
      unidad: 'px',
      valor: 1080,
      min: 1,
      max: 100000,
      entero: true,
    },
    {
      clave: 'nuevo',
      etiqueta: 'Ancho nuevo',
      unidad: 'px',
      valor: 1200,
      min: 1,
      max: 100000,
      entero: true,
    },
  ],
  resolver: ({ ancho = 1920, alto = 1080, nuevo = 1200 }) => {
    const mcd = (a: number, b: number): number => (b === 0 ? a : mcd(b, a % b));
    const d = mcd(Math.round(ancho), Math.round(alto));
    const altoNuevo = (alto * nuevo) / ancho;
    return {
      enunciado: `Una imagen mide ${num(ancho, 0)} × ${num(alto, 0)} px y la necesitas de ${num(nuevo, 0)} px de ancho. ¿Qué alto debe tener para no deformarse?`,
      pasos: [
        {
          descripcion:
            'Simplifica la relación de aspecto dividiendo ancho y alto entre su máximo común divisor.',
          calculo: `MCD(${num(ancho, 0)}, ${num(alto, 0)}) = ${num(d, 0)} → ${num(ancho / d, 0)} : ${num(alto / d, 0)}`,
          valor: `Relación ${num(ancho / d, 0)}:${num(alto / d, 0)}`,
        },
        {
          descripcion:
            'Para no deformar, el alto nuevo es al ancho nuevo lo que el alto original es al ancho original. Despeja el alto nuevo con una regla de tres.',
          calculo: `alto nuevo = alto · ancho nuevo / ancho = ${num(alto, 0)} · ${num(nuevo, 0)} / ${num(ancho, 0)}`,
          valor: `${num(altoNuevo)} px (redondeado: ${num(Math.round(altoNuevo), 0)} px)`,
        },
      ],
      comprobacion: `${num(nuevo, 0)} / ${num(altoNuevo)} = ${num(nuevo / altoNuevo, 4)} y ${num(ancho, 0)} / ${num(alto, 0)} = ${num(ancho / alto, 4)}: la proporción se mantiene.`,
      comprobado: Math.abs(nuevo / altoNuevo - ancho / alto) < 1e-9,
    };
  },
};

/** Búsqueda binaria paso a paso. */
export const busquedaBinaria: Generador = {
  id: 'g-busqueda-binaria',
  areas: ['programacion'],
  titulo: 'Búsqueda binaria paso a paso',
  tema: 'Algoritmos de búsqueda',
  parametros: [
    {
      clave: 'n',
      etiqueta: 'Tamaño del arreglo',
      unidad: 'elementos',
      valor: 15,
      min: 1,
      max: 63,
      entero: true,
    },
    {
      clave: 'objetivo',
      etiqueta: 'Valor a buscar',
      unidad: '',
      valor: 33,
      min: -1000,
      max: 1000,
      entero: true,
    },
  ],
  resolver: ({ n = 15, objetivo = 33 }) => {
    const arreglo = Array.from({ length: n }, (_, i) => 3 * (i + 1));
    const pasos: Paso[] = [
      {
        descripcion: `El arreglo está ordenado: [${arreglo.join(', ')}]. La búsqueda binaria mira el elemento del medio y descarta la mitad donde no puede estar el valor.`,
        calculo: 'izq = 0, der = n − 1, medio = ⌊(izq + der) / 2⌋',
      },
    ];
    let izq = 0;
    let der = n - 1;
    let encontrado = -1;
    let comparaciones = 0;
    while (izq <= der) {
      const medio = Math.floor((izq + der) / 2);
      const v = arreglo[medio]!;
      comparaciones++;
      if (v === objetivo) {
        encontrado = medio;
        pasos.push({
          descripcion: `Comparación ${comparaciones}: el del medio es justo el que buscas.`,
          calculo: `izq = ${izq}, der = ${der}, medio = ${medio}; arreglo[${medio}] = ${v} = ${objetivo}`,
          valor: `Encontrado en la posición ${medio}`,
        });
        break;
      }
      const derecha = v < objetivo;
      pasos.push({
        descripcion: `Comparación ${comparaciones}: ${v} es ${derecha ? 'menor' : 'mayor'} que ${objetivo}, así que descartas la mitad ${derecha ? 'izquierda' : 'derecha'}.`,
        calculo: `izq = ${izq}, der = ${der}, medio = ${medio}; arreglo[${medio}] = ${v} ${derecha ? '<' : '>'} ${objetivo} → ${derecha ? `izq = ${medio + 1}` : `der = ${medio - 1}`}`,
      });
      if (derecha) izq = medio + 1;
      else der = medio - 1;
    }
    if (encontrado < 0)
      pasos.push({
        descripcion: 'izq quedó mayor que der: ya no queda dónde buscar, así que el valor no está.',
        calculo: `izq = ${izq} > der = ${der}`,
        valor: 'No encontrado (devuelve −1)',
      });
    const maximo = Math.ceil(Math.log2(n + 1));
    return {
      enunciado: `Busca el ${objetivo} en un arreglo ordenado con los primeros ${n} múltiplos de 3 usando búsqueda binaria.`,
      pasos,
      comprobacion: `${encontrado >= 0 ? `arreglo[${encontrado}] = ${arreglo[encontrado]}, el valor buscado.` : `${objetivo} ${objetivo % 3 === 0 && objetivo >= 3 && objetivo <= 3 * n ? 'debería estar; revisa' : 'no es múltiplo de 3 dentro del rango, así que no podía estar'}.`} Hizo ${comparaciones} ${comparaciones === 1 ? 'comparación' : 'comparaciones'}; con ${n} elementos nunca pasa de ⌈log₂(${n} + 1)⌉ = ${maximo}.`,
      comprobado:
        comparaciones <= maximo &&
        (encontrado >= 0 ? arreglo[encontrado] === objetivo : !arreglo.includes(objetivo)),
    };
  },
};
