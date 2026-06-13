import type { ReactNode } from "react";

import { simpleFormCardClassName } from "@/components/simple-form-styles";

type SimpleFormCardProps = {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  description?: string;
  children: ReactNode;
};

/**
 * Card shell matching the auth page form styling.
 */
export function SimpleFormCard({
  eyebrow,
  title,
  titleAccent,
  description,
  children,
}: SimpleFormCardProps) {
  return (
    <div className={simpleFormCardClassName}>
      <p className="text-sm font-medium tracking-wide text-aviation-blue uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-2xl leading-tight">
        <span className="font-bold text-neutral-900">{title}</span>
        {titleAccent ? (
          <>
            {" "}
            <span className="font-light text-neutral-400">{titleAccent}</span>
          </>
        ) : null}
      </h1>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-aviation-slate">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
