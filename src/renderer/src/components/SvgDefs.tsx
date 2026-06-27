/**
 * Globale, unsichtbare SVG-Defs (einmal an der App-Wurzel gerendert).
 * Stellt den „doodle-wobble"-Filter bereit, der über die CSS-Klasse `.wobble`
 * auf Ränder/Deko angewandt wird und ihnen einen handgezeichneten, leicht
 * zittrigen Look gibt (feTurbulence + feDisplacementMap).
 */
export default function SvgDefs(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <defs>
        <filter id="doodle-wobble">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018"
            numOctaves={3}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
