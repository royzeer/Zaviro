import { hrefDe } from '@/app/enrutador';
import type { PerfilAcademico } from '@/db/esquemas';
import { useConsulta } from '@/db/useConsulta';
import { NOMBRE_NIVEL, type Nivel } from '@/dominio/catalogo';
import { duracion } from '@/utilidades/numeros';
import { cargarPlan } from '../notas/datosPlan';

interface Props {
  perfil: PerfilAcademico;
  /** Concepto base de un nivel anterior que más está fallando, si lo hay. */
  base?: { nombre: string; nivelOrigen: Nivel; noResueltos: number };
}

function Casilla({
  titulo,
  children,
  href,
  accion,
}: {
  titulo: string;
  children: React.ReactNode;
  href: string;
  accion: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-linea/70 bg-superficie-2/60 p-4">
      <p className="text-xs font-semibold text-tinta-suave">{titulo}</p>
      <div className="mt-1 flex-1 text-sm">{children}</div>
      <a href={hrefDe(href)} className="mt-3 self-start text-xs font-semibold underline">
        {accion}
      </a>
    </div>
  );
}

export function PlanDeHoy({ perfil, base }: Props) {
  const datos = useConsulta(() => cargarPlan(perfil), [perfil]);
  const hoy = datos?.plan.dias[0];
  const tema = new Map((datos?.temas ?? []).map((t) => [t.id, t]));
  const materia = new Map((datos?.materias ?? []).map((m) => [m.id, m]));
  const pendientesHoy = hoy?.bloques.filter((b) => !b.hecho) ?? [];
  const primero = pendientesHoy[0];
  const top = datos?.rendimiento[0];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Casilla titulo="Tema con más rendimiento" href="/notas" accion="Ver el plan completo">
        {primero ? (
          <>
            <p className="font-bold">{tema.get(primero.temaId)?.titulo}</p>
            <p className="text-xs text-tinta-suave">
              {materia.get(primero.materiaId)?.nombre} · {duracion(primero.horas)} hoy
              {pendientesHoy.length > 1
                ? ` · y ${pendientesHoy.length - 1} ${pendientesHoy.length === 2 ? 'tema más' : 'temas más'}`
                : ''}
            </p>
          </>
        ) : hoy?.bloques.some((b) => b.hecho) ? (
          <p className="text-tinta-suave">Ya cumpliste los bloques de hoy.</p>
        ) : top ? (
          <p className="text-tinta-suave">
            Hoy no hay bloques en tu plan. El tema que más rinde es {top.tema.titulo}.
          </p>
        ) : (
          <p className="text-tinta-suave">
            Agrega temas con su peso y la fecha del examen para calcular dónde rinde más tu hora.
          </p>
        )}
      </Casilla>
      <Casilla titulo="Repaso corto" href="/repasar" accion="Repasar ahora">
        {hoy && hoy.minutosRepaso > 0 ? (
          <>
            <p className="font-bold">{hoy.minutosRepaso} minutos</p>
            <p className="text-xs text-tinta-suave">Tarjetas que vencen hoy o están atrasadas.</p>
          </>
        ) : (
          <p className="text-tinta-suave">No tienes tarjetas por repasar hoy.</p>
        )}
      </Casilla>
      <Casilla titulo="Base de un nivel anterior" href="/errores" accion="Ver raíces">
        {base ? (
          <>
            <p className="font-bold">{base.nombre}</p>
            <p className="text-xs text-tinta-suave">
              Viene de {NOMBRE_NIVEL[base.nivelOrigen].toLowerCase()} · {base.noResueltos} sin
              resolver
            </p>
          </>
        ) : (
          <p className="text-tinta-suave">
            Ninguna base de niveles anteriores está fallando. Buen cimiento.
          </p>
        )}
      </Casilla>
    </div>
  );
}
