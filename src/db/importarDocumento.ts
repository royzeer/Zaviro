// Convierte un documento leído en temas, apuntes y tarjetas de una materia.
// Con eso el plan de estudio se arma solo: cada tema entra al plan con un peso
// proporcional a lo largo de su sección y, si el documento trae fecha de examen,
// esa fecha ordena las prioridades.
import { db, type ZaviroDB } from './db';
import type { Materia, PerfilAcademico, Tema } from './esquemas';
import { crearTarjeta, materiasDePerfil } from './operaciones';
import { ahoraIso, guardar, nuevoId } from './repositorio';
import {
  definiciones,
  normalizarPalabra,
  pesosPorExtension,
  type DocumentoLeido,
} from '@/dominio/documentos';
import { materiaNueva } from '@/vistas/materias/materiaNueva';

export interface OpcionesImportacion {
  perfil: PerfilAcademico;
  documento: DocumentoLeido;
  /** Materia existente, o null para crear una con `nombreMateria`. */
  materiaId: string | null;
  nombreMateria: string;
  /** Índices de las secciones que se importan. */
  secciones: number[];
  crearTarjetas: boolean;
  /** Fecha del examen (ISO) para la materia, si no tiene una. */
  fechaExamen?: string;
}

export interface ResultadoImportacion {
  materiaId: string;
  temasNuevos: number;
  temasExistentes: number;
  apuntes: number;
  tarjetas: number;
}

const claveTitulo = (t: string) =>
  normalizarPalabra(t)
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

/** Tema de la materia con el mismo título (sin tildes ni mayúsculas), si existe. */
export function temaParecido<T extends Pick<Tema, 'id' | 'titulo'>>(
  titulo: string,
  temas: T[],
): T | undefined {
  const k = claveTitulo(titulo);
  return temas.find((t) => claveTitulo(t.titulo) === k);
}

export async function importarDocumento(
  o: OpcionesImportacion,
  base: ZaviroDB = db,
): Promise<ResultadoImportacion> {
  const elegidas = o.secciones.map((i) => o.documento.secciones[i]).filter((s) => s !== undefined);
  const pesos = pesosPorExtension(elegidas.map((s) => s.palabras));
  const resultado: ResultadoImportacion = {
    materiaId: '',
    temasNuevos: 0,
    temasExistentes: 0,
    apuntes: 0,
    tarjetas: 0,
  };

  await base.transaction(
    'rw',
    [base.materias, base.temas, base.apuntes, base.tarjetas],
    async () => {
      let materia: Materia | undefined = o.materiaId
        ? await base.materias.get(o.materiaId)
        : undefined;
      if (!materia) {
        const cantidad = (await materiasDePerfil(o.perfil.id, base)).length;
        materia = {
          ...materiaNueva(o.perfil, cantidad),
          nombre: o.nombreMateria.trim() || o.documento.titulo,
        };
      }
      if (o.fechaExamen && !materia.fechaParcial)
        materia = { ...materia, fechaParcial: o.fechaExamen };
      await guardar('materias', materia, base);
      resultado.materiaId = materia.id;

      const temas = await base.temas.where('materiaId').equals(materia.id).toArray();
      const fecha = ahoraIso();
      for (const [i, s] of elegidas.entries()) {
        let tema = temaParecido(s.titulo, temas);
        if (tema) resultado.temasExistentes++;
        else {
          tema = await guardar(
            'temas',
            {
              id: nuevoId(),
              materiaId: materia.id,
              titulo: s.titulo,
              pesoParcial: pesos[i]!,
              dominio: 0,
            },
            base,
          );
          temas.push(tema);
          resultado.temasNuevos++;
        }
        const apunte = await guardar(
          'apuntes',
          {
            id: nuevoId(),
            materiaId: materia.id,
            temaId: tema.id,
            titulo: s.titulo,
            contenido: s.contenido,
            fecha,
          },
          base,
        );
        resultado.apuntes++;
        if (!o.crearTarjetas) continue;
        for (const d of definiciones(s.contenido, 6)) {
          await crearTarjeta(
            {
              origenTipo: 'apunte',
              origenId: apunte.id,
              temaId: tema.id,
              frente: `¿Qué es ${d.termino}?`,
              reverso: d.definicion,
            },
            base,
          );
          resultado.tarjetas++;
        }
      }
    },
  );
  return resultado;
}
