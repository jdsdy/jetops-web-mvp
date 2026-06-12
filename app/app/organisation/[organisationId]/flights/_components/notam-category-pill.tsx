type NotamCategoryPillVariant = "category" | "failed" | "unclassified" | "pending";

type NotamCategoryPillProps = {
  label: string;
  variant?: NotamCategoryPillVariant;
  category?: number;
};

const variantClassNames: Record<Exclude<NotamCategoryPillVariant, "category">, string> = {
  failed: "bg-red-50 text-red-800",
  unclassified: "bg-amber-50 text-amber-900",
  pending: "bg-neutral-50 text-aviation-slate",
};

const categoryClassNames: Record<number, string> = {
  1: "bg-red-50 text-red-800",
  2: "bg-orange-50 text-orange-900",
  3: "bg-blue-50 text-blue-900",
};

/**
 * Returns Tailwind classes for a classified NOTAM category pill.
 */
function getCategoryClassName(category: number): string {
  return categoryClassNames[category] ?? "bg-neutral-100 text-aviation-navy";
}

/**
 * Small category tag for analysed NOTAM rows.
 */
export function NotamCategoryPill({
  label,
  variant = "category",
  category,
}: NotamCategoryPillProps) {
  const className =
    variant === "category" && category !== undefined
      ? getCategoryClassName(category)
      : variant === "category"
        ? "bg-neutral-100 text-aviation-navy"
        : variantClassNames[variant];

  return (
    <span
      className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * Returns a display label for a numeric NOTAM category.
 */
export function formatNotamCategoryLabel(category: number): string {
  return `Category ${category}`;
}
