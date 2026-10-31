export default function VisibilityBadge({
  hidden,
}: {
  hidden?: boolean | null;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${hidden ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}
    >
      {hidden ? 'Hidden' : 'Visible'}
    </span>
  );
}
