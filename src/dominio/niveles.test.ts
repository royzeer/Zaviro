import { describe, expect, it } from 'vitest';
import { reglasEsquema } from '@/db/esquemas';
import { NIVELES } from './catalogo';
import {
  categoriaDeNota,
  horasDeMateria,
  modulosDisponibles,
  modulosSugeridos,
  reglasSugeridas,
  revisarReglas,
  sumaPesos,
  vocabulario,
} from './niveles';

describe('reglas sugeridas por nivel', () => {
  it.each(NIVELES)('las de %s son válidas según el esquema', (nivel) => {
    expect(() => reglasEsquema.parse(reglasSugeridas(nivel))).not.toThrow();
  });

  it.each(NIVELES)('las de %s no tienen avisos al crearse', (nivel) => {
    expect(revisarReglas(reglasSugeridas(nivel))).toEqual([]);
  });

  it('bachillerato: escala 1 a 5, aprobatoria 3, cuatro períodos y sin créditos', () => {
    const r = reglasSugeridas('bachillerato');
    expect(r.escala).toMatchObject({ minimo: 1, maximo: 5, aprobatoria: 3 });
    expect(r.evaluacion.tipo).toBe('periodos');
    expect(r.evaluacion.componentes).toHaveLength(4);
    expect(r.creditos.activados).toBe(false);
  });

  it('bachillerato: categorías nacionales sin rangos fijos', () => {
    const r = reglasSugeridas('bachillerato');
    expect(r.categoriasDesempeno.map((c) => c.nombre)).toEqual([
      'Superior',
      'Alto',
      'Básico',
      'Bajo',
    ]);
    expect(r.categoriasDesempeno.every((c) => c.desde === null && c.hasta === null)).toBe(true);
  });

  it('técnico y tecnólogo: escala 0 a 5 con evidencias y créditos opcionales', () => {
    for (const n of ['tecnico', 'tecnologo'] as const) {
      const r = reglasSugeridas(n);
      expect(r.escala).toMatchObject({ minimo: 0, maximo: 5, aprobatoria: 3 });
      expect(r.evaluacion.tipo).toBe('evidencias');
      expect(r.creditos.activados).toBe(false);
    }
  });

  it('profesional: cortes 30, 30 y 40 con créditos y promedio ponderado', () => {
    const r = reglasSugeridas('profesional');
    expect(r.evaluacion.componentes.map((c) => c.peso)).toEqual([30, 30, 40]);
    expect(r.creditos).toMatchObject({ activados: true, horasPorCredito: 48 });
    expect(r.promedio.ponderadoPorCreditos).toBe(true);
  });

  it('especialización y maestría: mínimo 3.5 por materia y en el acumulado', () => {
    for (const n of ['especializacion', 'maestria'] as const) {
      const r = reglasSugeridas(n);
      expect(r.promedio.notaMinimaMateria).toBe(3.5);
      expect(r.promedio.promedioAcumuladoMinimo).toBe(3.5);
      expect(r.creditos.activados).toBe(true);
    }
  });

  it('doctorado: sin notas y organizado por hitos', () => {
    const r = reglasSugeridas('doctorado');
    expect(r.usaNotas).toBe(false);
    expect(r.evaluacion.tipo).toBe('hitos');
  });

  it('los intervalos iniciales de repaso crecen con el nivel', () => {
    const primero = (n: (typeof NIVELES)[number]) =>
      reglasSugeridas(n).repaso.intervalosIniciales.at(-1)!;
    expect(primero('bachillerato')).toBeLessThan(primero('profesional'));
    expect(primero('profesional')).toBeLessThan(primero('maestria'));
    expect(primero('maestria')).toBeLessThan(primero('doctorado'));
  });

  it('devuelve copias independientes para que editar un perfil no afecte otro', () => {
    const a = reglasSugeridas('profesional');
    a.evaluacion.componentes[0]!.peso = 99;
    expect(reglasSugeridas('profesional').evaluacion.componentes[0]!.peso).toBe(30);
  });
});

describe('módulos por nivel', () => {
  it('todos los niveles tienen los módulos base', () => {
    for (const n of NIVELES) {
      expect(modulosDisponibles(n)).toEqual(
        expect.arrayContaining([
          'materias',
          'apuntes',
          'errores',
          'arbol',
          'repaso',
          'notas',
          'plan',
        ]),
      );
    }
  });

  it('cada nivel tiene sus módulos propios', () => {
    expect(modulosSugeridos('bachillerato')).toContain('saber11');
    expect(modulosDisponibles('profesional')).toContain('saberPro');
    expect(modulosSugeridos('profesional')).not.toContain('saberPro');
    expect(modulosSugeridos('maestria')).toEqual(
      expect.arrayContaining(['trabajoGrado', 'lecturas']),
    );
    expect(modulosSugeridos('doctorado')).toEqual(
      expect.arrayContaining(['trabajoGrado', 'lecturas', 'bitacora']),
    );
    expect(modulosSugeridos('doctorado')).not.toContain('notas');
    expect(modulosDisponibles('bachillerato')).not.toContain('trabajoGrado');
  });
});

describe('vocabulario', () => {
  it('usa período y logro en bachillerato, corte en pregrado e hito en doctorado', () => {
    expect(vocabulario('bachillerato')).toMatchObject({ componente: 'Período', logro: 'Logro' });
    expect(vocabulario('profesional').componente).toBe('Corte');
    expect(vocabulario('doctorado').componente).toBe('Hito');
    expect(vocabulario('tecnologo').componente).toBe('Evidencia');
  });
});

describe('créditos y horas', () => {
  it('3 créditos son 144 horas en el período', () => {
    const h = horasDeMateria(3, reglasSugeridas('profesional'))!;
    expect(h.total).toBe(144);
    expect(h.conDocente).toBeCloseTo(48);
    expect(h.independientes).toBeCloseTo(96);
  });

  it('respeta la proporción editada entre horas con docente e independientes', () => {
    const r = reglasSugeridas('profesional');
    r.creditos.proporcionDocente = 0.5;
    expect(horasDeMateria(2, r)).toEqual({ total: 96, conDocente: 48, independientes: 48 });
  });

  it('no calcula horas si los créditos están desactivados', () => {
    expect(horasDeMateria(3, reglasSugeridas('bachillerato'))).toBeNull();
    expect(horasDeMateria(0, reglasSugeridas('profesional'))).toBeNull();
  });
});

describe('categorías de desempeño y revisión de reglas', () => {
  function reglasColegio() {
    const r = reglasSugeridas('bachillerato');
    r.categoriasDesempeno = [
      { nombre: 'Superior', desde: 4.6, hasta: 5 },
      { nombre: 'Alto', desde: 4, hasta: 4.5 },
      { nombre: 'Básico', desde: 3, hasta: 3.9 },
      { nombre: 'Bajo', desde: 1, hasta: 2.9 },
    ];
    return r;
  }

  it('ubica la nota en la categoría que definió el colegio', () => {
    const r = reglasColegio();
    expect(categoriaDeNota(4.8, r)).toBe('Superior');
    expect(categoriaDeNota(3.2, r)).toBe('Básico');
    expect(categoriaDeNota(2.1, r)).toBe('Bajo');
  });

  it('no inventa categoría si los rangos no están configurados', () => {
    expect(categoriaDeNota(4.8, reglasSugeridas('bachillerato'))).toBeUndefined();
  });

  it('avisa rangos cruzados, incompletos o fuera de escala', () => {
    const r = reglasColegio();
    r.categoriasDesempeno[1] = { nombre: 'Alto', desde: 3.8, hasta: 4.5 };
    r.categoriasDesempeno[0] = { nombre: 'Superior', desde: 4.6, hasta: null };
    r.categoriasDesempeno[3] = { nombre: 'Bajo', desde: 0, hasta: 2.9 };
    const avisos = revisarReglas(r);
    expect(avisos.some((a) => a.includes('se cruzan'))).toBe(true);
    expect(avisos.some((a) => a.includes('Completa'))).toBe(true);
    expect(avisos.some((a) => a.includes('se sale'))).toBe(true);
  });

  it('avisa si los pesos no suman 100', () => {
    const r = reglasSugeridas('profesional');
    r.evaluacion.componentes[2]!.peso = 30;
    expect(sumaPesos(r.evaluacion.componentes)).toBe(90);
    expect(revisarReglas(r)).toContain('Los pesos de evaluación suman 90% y deben sumar 100%.');
  });

  it('no exige pesos cuando el perfil no usa notas', () => {
    expect(revisarReglas(reglasSugeridas('doctorado'))).toEqual([]);
  });
});
