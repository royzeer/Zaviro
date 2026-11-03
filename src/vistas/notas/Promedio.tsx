import { useState } from 'react';
import type { Materia, PerfilAcademico } from '@/db/esquemas';
import { categoriaDeNota, vocabulario } from '@/dominio/niveles';
import { necesarioParaPromedio, resumenPromedio } from '@/dominio/notas';
import { Tarjeta } from '@/componentes/Tarjeta';
import { formatoNota } from '@/utilidades/fechas';

function Cifra({ titulo, valor, ayuda }: { titulo: string; valor: string; ayuda?: string }) {
  return (
    <div className="rounded-xl bg-superficie-2/70 px-3 py-3">
      <p className="text-xs font-semibold text-tinta-suave">{titulo}</p>
      <p className="text-2xl font-extrabold tabular-nums">{valor}</p>
      {ayuda && <p className="text-[11px] text-tinta-suave">{ayuda}</p>}
    </div>
  );
}

export function Promedio({ perfil, materias }: { perfil: PerfilAcademico; materias: Materia[] }) {
  const vocab = vocabulario(perfil.nivel);
  const periodos = [
    ...new Set(materias.map((m) => m.periodoAcademico).filter((p): p is string => Boolean(p))),
  ]
    .sort()
    .reverse();
  const [periodo, setPeriodo] = useState(periodos[0] ?? '');
  if (!perfil.reglas.usaNotas) return null;
  const { reglas } = perfil;
  const d = reglas.escala.decimales;
  const r = resumenPromedio(materias, reglas, periodo || undefined);
  const minimo = reglas.promedio.promedioAcumuladoMinimo;
  const necesario = minimo !== null ? necesarioParaPromedio(materias, reglas, minimo) : null;
  const fmt = (n: number | null) => (n === null ? '—' : formatoNota(n, d + 1));
  const ponderado = reglas.promedio.ponderadoPorCreditos && reglas.creditos.activados;

  return (
    <Tarjeta titulo="Promedio" icono="saber">
      <p className="mb-4 text-xs text-tinta-suave">
        {ponderado ? 'Ponderado por créditos.' : 'Promedio simple: todas las materias pesan igual.'}{' '}
        {vocab.ayudaPromedio}
      </p>
      {periodos.length > 0 && (
        <label className="mb-3 flex items-center gap-2 text-sm">
          <span className="font-semibold text-tinta-suave">Período</span>
          <select
            className="campo w-auto py-1.5"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            {periodos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Cifra
          titulo={periodos.length ? 'Semestral' : 'Del período'}
          valor={fmt(r.semestral)}
          ayuda={periodo ? `Período ${periodo}` : 'Asigna el período en cada materia'}
        />
        <Cifra
          titulo="Acumulado"
          valor={fmt(r.acumulado)}
          ayuda={
            ponderado ? `${r.creditosCalificados} créditos calificados` : 'Materias terminadas'
          }
        />
        <Cifra titulo="Proyectado" valor={fmt(r.proyectado)} ayuda="Si terminas como vas" />
      </div>
      {r.acumulado !== null && categoriaDeNota(r.acumulado, reglas) && (
        <p className="mt-3 text-sm">
          Desempeño: <strong>{categoriaDeNota(r.acumulado, reglas)}</strong>
        </p>
      )}
      {minimo !== null && necesario && (
        <p
          className={`mt-4 rounded-xl px-3 py-2 text-sm font-semibold ${
            necesario.veredicto === 'imposible' || necesario.veredicto === 'no-logrado'
              ? 'bg-peligro/10 text-peligro'
              : necesario.veredicto === 'posible'
                ? 'bg-superficie-2'
                : 'bg-exito/10 text-exito'
          }`}
        >
          {necesario.veredicto === 'asegurado' &&
            `Tu promedio acumulado mínimo (${formatoNota(minimo, d)}) está asegurado.`}
          {necesario.veredicto === 'posible' &&
            `Para mantener el promedio acumulado mínimo de ${formatoNota(minimo, d)} necesitas ${formatoNota(necesario.nota!, d)} en promedio en lo que estás cursando.`}
          {necesario.veredicto === 'imposible' &&
            `Con lo que falta ya no alcanzas el promedio mínimo de ${formatoNota(minimo, d)} este período. Habla con tu coordinación sobre las opciones.`}
          {necesario.veredicto === 'logrado' &&
            `Cumples el promedio acumulado mínimo de ${formatoNota(minimo, d)}.`}
          {necesario.veredicto === 'no-logrado' &&
            `Tu promedio acumulado está por debajo del mínimo de ${formatoNota(minimo, d)}.`}
        </p>
      )}
      {minimo === null && (
        <p className="mt-4 text-xs text-tinta-suave">
          Si tu programa exige un promedio acumulado mínimo, escríbelo en las reglas de tu perfil y
          aquí verás cuánto necesitas para mantenerlo.
        </p>
      )}
    </Tarjeta>
  );
}
