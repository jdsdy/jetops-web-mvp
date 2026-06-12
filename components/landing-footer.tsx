import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo_square.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                Jet Operations
              </p>
              <p className="text-sm text-aviation-slate">
                Flight plan and NOTAM analysis for aviation teams.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-aviation-slate sm:items-end">
            <Link
              href="/auth"
              className="font-medium text-aviation-navy transition-colors hover:text-aviation-blue"
            >
              Sign in
            </Link>
            <p>&copy; {year} Jet Operations</p>
          </div>
        </div>
        <p className="mt-9 text-sm text-aviation-slate">
          The Jet Operations platform is currently in a closed testing
          phase. Public use is not available.
        </p>
      </div>
    </footer>
  );
}
