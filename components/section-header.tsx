import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * Page section title row with an optional primary action.
 */
export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-aviation-slate">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
