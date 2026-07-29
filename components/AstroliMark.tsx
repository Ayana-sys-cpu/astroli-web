/**
 * The Astroli star mark. Purple is reserved for the mark itself — brand.json
 * forbids #9D5FFF as a text or fill accent anywhere else, which is what keeps
 * the mark findable on a bar where teal means "the system".
 *
 * The inner diamond and corner dots from the full logo are dropped below ~24px:
 * their 1.3px strokes turn to mud at header scale.
 */
export default function AstroliMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <g fill="none" stroke="#9D5FFF" strokeLinejoin="round" strokeLinecap="round">
        <path strokeWidth="4" d="M50,4 Q51.768,48.232 96,50 Q51.768,51.768 50,96 Q48.232,51.768 4,50 Q48.232,48.232 50,4 Z" />
        <path strokeWidth="3.4" d="M55.47,15.43 A35,35 0 0 1 55.47,84.57" />
        <path strokeWidth="3.4" d="M44.53,15.43 A35,35 0 0 0 44.53,84.57" />
      </g>
    </svg>
  );
}
