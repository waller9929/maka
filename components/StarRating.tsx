export default function StarRating({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-brand-blueDark font-medium">
      ★ {Number(value ?? 0).toFixed(1)}
      {label && <span className="text-brand-gray font-normal">{label}</span>}
    </span>
  );
}
