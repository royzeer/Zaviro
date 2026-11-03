import type { Materia, PerfilAcademico } from '@/db/esquemas';
import { guardar } from '@/db/repositorio';
import { categoriaDeNota, vocabulario } from '@/dominio/niveles';
import { estadoNota, necesarioPara, type Necesario } from '@/dominio/notas';
import { NumeroEntrada } from '@/componentes/Formulario';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { formatoNota } from '@/utilidades/fechas';

const ESTILO: Record<Necesario['veredicto'], string> = {
  asegurado: 'bg-exito/10 text-exito',
  logrado: 'bg-exito/10 text-exito',
  posible: 'bg-superficie-2 text-tinta',
  imposible: 'bg-peligro/10 text-peligro',
  'no-logrado': 'bg-peligro/10 text-peligro',
};

function textoNecesario(n: Necesario, meta: number, restante: number, decimales: number) {
  const m = formatoNota(meta, decimales);
  switch (n.veredicto) {
    case 'asegurado':
      return `Ya tienes asegurado el ${m}, aunque saques la mínima en lo que falta.`;
    case 'logrado':
      return `Lo lograste: tu nota final alcanza ${m}.`;
    case 'no-logrado':
      return `No alcanzó para ${m}.`;
    case 'imposible':
      return `Ya no es posible llegar a ${m}: necesitarías ${formatoNota(n.nota!, decimales)} en el ${Math.round(restante)}% que falta.`;
    case 'posible':
      return n.nota === null
        ? ''
        : `Necesitas ${formatoNota(n.nota, decimales)} en promedio en el ${Math.round(restante)}% que falta para llegar a ${m}.`;
  }
}

function FilaMateria({ perfil, materia }: { perfil: PerfilAcademico; materia: Materia }) {
  const { escala } = perfil.reglas;
  const e = estadoNota(materia.cortes);
  const minimo = Math.max(escala.aprobatoria, perfil.reglas.promedio.notaMinimaMateria);
  const aprobar = necesarioPara(minimo, materia.cortes, escala);
  const meta =
    materia.meta !== undefined ? necesarioPara(materia.meta, materia.cortes, escala) : null;
  const categoria =
    e.promedioEvaluado !== null ? categoriaDeNota(e.promedioEvaluado, perfil.reglas) : undefined;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-linea/70 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="mt-1 h-8 w-1.5 rounded-full" style={{ backgroundColor: materia.color }} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{materia.nombre}</p>
          <p className="text-xs text-tinta-suave">
            Evaluado {Math.round(e.pesoTotal ? (e.pesoEvaluado / e.pesoTotal) * 100 : 0)}% ·
            acumulado {formatoNota(e.acumulado, escala.decimales + 1)}
            {categoria ? ` · desempeño ${categoria}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold tabular-nums">
            {e.promedioEvaluado !== null ? formatoNota(e.promedioEvaluado, escala.decimales) : '—'}
          </p>
          <p className="text-[11px] font-semibold text-tinta-suave">promedio actual</p>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-superficie-2" aria-hidden="true">
        <div
          className="h-full rounded-full bg-acento"
          style={{ width: `${e.pesoTotal ? (e.pesoEvaluado / e.pesoTotal) * 100 : 0}%` }}
        />
      </div>
      <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${ESTILO[aprobar.veredicto]}`}>
        {textoNecesario(
          aprobar,
          minimo,
          (e.pesoRestante / (e.pesoTotal || 1)) * 100,
          escala.decimales,
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-tinta-suave" htmlFor={`meta-${materia.id}`}>
          Mi meta
        </label>
        <NumeroEntrada
          id={`meta-${materia.id}`}
          vacioPermitido
          placeholder="—"
          min={escala.minimo}
          max={escala.maximo}
          valor={materia.meta}
          onCambio={(v) => {
            const { meta: _, ...resto } = materia;
            if (v === null) void guardar('materias', resto);
            else if (v >= escala.minimo && v <= escala.maximo)
              void guardar('materias', { ...resto, meta: v });
          }}
          className="w-20"
        />
        {meta && (
          <p
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${ESTILO[meta.veredicto]}`}
          >
            {textoNecesario(
              meta,
              materia.meta!,
              (e.pesoRestante / (e.pesoTotal || 1)) * 100,
              escala.decimales,
            )}
          </p>
        )}
      </div>
    </li>
  );
}

export function Calculadora({
  perfil,
  materias,
}: {
  perfil: PerfilAcademico;
  materias: Materia[];
}) {
  const vocab = vocabulario(perfil.nivel);
  const enCurso = materias.filter(
    (m) => (m.estado ?? 'cursando') === 'cursando' && m.cortes.length > 0,
  );
  if (!perfil.reglas.usaNotas) {
    return (
      <Tarjeta titulo="Calculadora de notas" icono="notas">
        <EstadoVacio
          texto="Tu perfil no usa notas numéricas. Puedes activarlas en las reglas de tu perfil."
          accion={
            <a href="#/perfil" className="boton-secundario">
              Ir al perfil
            </a>
          }
        />
      </Tarjeta>
    );
  }
  return (
    <Tarjeta titulo="Calculadora de notas" icono="notas">
      <p className="mb-4 text-xs text-tinta-suave">
        Con la escala de tu perfil ({formatoNota(perfil.reglas.escala.minimo, 1)} a{' '}
        {formatoNota(perfil.reglas.escala.maximo, 1)}, aprobatoria{' '}
        {formatoNota(
          Math.max(perfil.reglas.escala.aprobatoria, perfil.reglas.promedio.notaMinimaMateria),
          perfil.reglas.escala.decimales,
        )}
        ). Escribe las notas en cada {vocab.componente.toLowerCase()} desde la{' '}
        {vocab.materia.toLowerCase()}.
      </p>
      {enCurso.length === 0 ? (
        <EstadoVacio
          texto={`No tienes ${vocab.materias.toLowerCase()} en curso con ${vocab.componentes.toLowerCase()}.`}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {enCurso.map((m) => (
            <FilaMateria key={m.id} perfil={perfil} materia={m} />
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
