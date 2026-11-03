// Anota cada registro que se crea, cambia o borra en IndexedDB para subirlo después.
// Funciona como middleware de Dexie, así cubre todas las formas de escribir
// (put, bulkPut, update, delete, where().delete(), clear) sin tocar cada pantalla.
import Dexie, {
  type DBCore,
  type DBCoreMutateRequest,
  type DBCoreTransaction,
  type Middleware,
} from 'dexie';
import { marcarPendientes } from './pendientes';

/** Transacciones que aplican datos traídos del servidor: esos cambios no se vuelven a subir. */
const transaccionesRemotas = new WeakSet<object>();

export function marcarTransaccionRemota() {
  const t = Dexie.currentTransaction as unknown as { idbtrans?: object } | null;
  if (t?.idbtrans) transaccionesRemotas.add(t.idbtrans);
}

function esRemota(trans: DBCoreTransaction) {
  return transaccionesRemotas.has(trans);
}

export function rastrearCambios(
  base: Dexie,
  tablas: readonly string[],
  alCambiar: () => void = () => {},
) {
  const rastreadas = new Set(tablas);
  const middleware: Middleware<DBCore> = {
    stack: 'dbcore',
    name: 'rastreoSincronizacion',
    create(abajo: DBCore) {
      return {
        ...abajo,
        table(nombre: string) {
          const tabla = abajo.table(nombre);
          if (!rastreadas.has(nombre)) return tabla;
          const clavePrimaria = tabla.schema.primaryKey;
          const extraer = (v: unknown) =>
            clavePrimaria.extractKey ? clavePrimaria.extractKey(v) : undefined;
          return {
            ...tabla,
            async mutate(req: DBCoreMutateRequest) {
              if (esRemota(req.trans)) return tabla.mutate(req);
              let claves: unknown[] = [];
              if (req.type === 'add' || req.type === 'put') {
                claves = req.keys ?? req.values.map(extraer);
              } else if (req.type === 'delete') {
                claves = req.keys;
              } else {
                // deleteRange (por ejemplo clear()): se averigua qué claves se van a borrar.
                const r = await tabla.query({
                  trans: req.trans,
                  values: false,
                  query: { index: clavePrimaria, range: req.range },
                });
                claves = r.result;
              }
              const respuesta = await tabla.mutate(req);
              const ids = claves.filter((c): c is string => typeof c === 'string');
              if (ids.length) {
                marcarPendientes(nombre, ids);
                alCambiar();
              }
              return respuesta;
            },
          };
        },
      };
    },
  };
  base.use(middleware);
}
