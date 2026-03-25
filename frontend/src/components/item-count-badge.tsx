type ItemCountBadgeProps = {
  className?: string;
  count: number;
  testId?: string;
};

export function ItemCountBadge({
  className = "",
  count,
  testId,
}: ItemCountBadgeProps) {
  return (
    <span
      className={`inline-flex min-w-7 items-center justify-center rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold leading-none text-white shadow-sm ${className}`.trim()}
      data-testid={testId}
    >
      {count}
    </span>
  );
}
