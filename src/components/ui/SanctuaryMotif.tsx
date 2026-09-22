/** A shared, decorative constellation. Never part of the reading order. */
export default function SanctuaryMotif() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -right-12 -top-20 h-80 w-80 rounded-full border border-white/15" />
      <div className="absolute -right-4 -top-12 h-64 w-64 rounded-full border border-white/15" />
      <svg
        viewBox="0 0 240 200"
        className="absolute right-0 top-0 h-full w-60 opacity-30"
      >
        <path
          d="M30 155 70 65 128 120 188 34 215 143"
          fill="none"
          stroke="white"
          strokeWidth="0.7"
        />
        {[
          [30, 155],
          [70, 65],
          [128, 120],
          [188, 34],
          [215, 143],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="white" />
        ))}
      </svg>
    </div>
  );
}
