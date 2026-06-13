import type { ReactNode } from "react";

type SimpleFormPageProps = {
  children: ReactNode;
};

/**
 * Centred layout for standalone auth and setup forms.
 */
export function SimpleFormPage({ children }: SimpleFormPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
