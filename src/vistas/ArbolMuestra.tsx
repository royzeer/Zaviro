/**
 * Ilustración estática del árbol para el estado vacío del inicio.
 * El árbol vivo (con d3) llega en la fase 2.
 */
const HOJAS = [
  { x: 150, y: 70, r: 20, c: 'fill-exito/80' },
  { x: 205, y: 52, r: 24, c: 'fill-exito' },
  { x: 262, y: 74, r: 19, c: 'fill-acento/70' },
  { x: 120, y: 112, r: 17, c: 'fill-exito/60' },
  { x: 178, y: 108, r: 22, c: 'fill-exito/90' },
  { x: 238, y: 112, r: 21, c: 'fill-oxido/80' },
  { x: 292, y: 118, r: 15, c: 'fill-exito/70' },
];

export function ArbolMuestra() {
  return (
    <svg
      viewBox="0 0 410 290"
      className="h-full w-full"
      role="img"
      aria-label="Ilustración de un árbol con hojas y raíces"
    >
      <line
        x1="20"
        x2="390"
        y1="178"
        y2="178"
        className="stroke-linea"
        strokeWidth="2"
        strokeDasharray="4 6"
      />
      <g className="stroke-acento" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M205 178 V110" strokeWidth="9" />
        <path d="M205 140 L150 85 M205 128 L262 88 M205 150 L120 118 M205 120 L205 70 M205 142 L238 118 M205 156 L292 124" />
      </g>
      {HOJAS.map((h, i) => (
        <circle
          key={i}
          cx={h.x}
          cy={h.y}
          r={h.r}
          className={`${h.c} stroke-superficie`}
          strokeWidth="3"
        />
      ))}
      <g className="stroke-tinta-suave/50" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M205 178 C200 205 160 215 130 228" />
        <path d="M205 178 C212 210 250 222 285 236" />
        <path d="M205 178 C205 220 200 245 196 268" />
      </g>
      <circle cx="130" cy="228" r="7" className="fill-brillo" />
      <circle cx="285" cy="236" r="7" className="fill-tinta-suave/50" />
      <circle cx="196" cy="268" r="7" className="fill-tinta-suave/50" />
    </svg>
  );
}
