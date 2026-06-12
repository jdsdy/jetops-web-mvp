import type { ButtonHTMLAttributes } from "react";

const primaryClassName =
  "inline-flex items-center justify-center rounded-sm bg-aviation-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aviation-blue disabled:cursor-not-allowed disabled:opacity-60";

const secondaryClassName =
  "inline-flex items-center justify-center rounded-sm border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60";

type PortalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

/**
 * Primary and secondary buttons for organisation portal actions.
 */
export function PortalButton({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: PortalButtonProps) {
  const baseClassName = variant === "primary" ? primaryClassName : secondaryClassName;

  return (
    <button type={type} className={`${baseClassName} ${className}`} {...props} />
  );
}

export { primaryClassName as portalPrimaryButtonClassName };
