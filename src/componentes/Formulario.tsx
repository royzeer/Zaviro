import { useEffect, useId, useState, type ReactNode } from 'react';
import { leerNumero } from '@/utilidades/numeros';

export function Campo({
  etiqueta,
  ayuda,
  children,
  className = '',
}: {
  etiqueta: string;
  ayuda?: ReactNode;
  children: (id: string, idAyuda?: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
      </label>
      {children(id, idAyuda)}
      {ayuda && (
        <p id={idAyuda} className="mt-1.5 text-xs leading-snug text-tinta-suave">
          {ayuda}
        </p>
      )}
    </div>
  );
}

/** Campo numérico que acepta coma decimal (como se escribe en Colombia). */
export function NumeroEntrada({
  valor,
  onCambio,
  id,
  vacioPermitido = false,
  className = '',
  ...resto
}: {
  valor: number | null | undefined;
  onCambio: (v: number | null) => void;
  id?: string;
  vacioPermitido?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-label'?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  const formatear = (v: number | null | undefined) =>
    v === null || v === undefined ? '' : String(Math.round(v * 1000) / 1000).replace('.', ',');
  const [texto, setTexto] = useState(formatear(valor));
  useEffect(() => {
    if (leerNumero(texto) !== (valor ?? null)) setTexto(formatear(valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);
  const fuera =
    valor !== null &&
    valor !== undefined &&
    ((resto.min !== undefined && valor < resto.min) ||
      (resto.max !== undefined && valor > resto.max));
  const invalido =
    (texto !== '' && leerNumero(texto) === null) || (texto === '' && !vacioPermitido) || fuera;
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={`campo tabular-nums ${invalido ? 'border-peligro' : ''} ${className}`}
      aria-invalid={invalido || undefined}
      aria-describedby={resto['aria-describedby']}
      aria-label={resto['aria-label']}
      placeholder={resto.placeholder}
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value);
        const n = leerNumero(e.target.value);
        if (n !== null) onCambio(n);
        else if (e.target.value.trim() === '' && vacioPermitido) onCambio(null);
      }}
      onBlur={() => setTexto(formatear(valor))}
    />
  );
}

export function Interruptor({
  activo,
  onCambio,
  etiqueta,
  descripcion,
}: {
  activo: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string;
  descripcion?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p id={id} className="text-sm font-semibold">
          {etiqueta}
        </p>
        {descripcion && <p className="text-xs leading-snug text-tinta-suave">{descripcion}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        aria-labelledby={id}
        onClick={() => onCambio(!activo)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          activo ? 'bg-exito' : 'bg-linea'
        }`}
      >
        <span
          className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-superficie shadow transition-transform ${
            activo ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function Avisos({ avisos }: { avisos: string[] }) {
  if (avisos.length === 0) return null;
  return (
    <ul
      className="flex flex-col gap-1 rounded-xl border border-peligro/30 bg-peligro/5 p-3 text-sm text-peligro"
      role="alert"
    >
      {avisos.map((a) => (
        <li key={a}>{a}</li>
      ))}
    </ul>
  );
}
