import Image from "next/image";
import Link from "next/link";

const signInClassName =
  "inline-flex items-center justify-center rounded-sm bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800";

export function LandingHeader() {
  return (
    <header className="border-b border-neutral-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo_square.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide text-neutral-900 uppercase">
              Jet Operations
            </p>
            <p className="text-xs text-aviation-slate">NOTAM analysis</p>
          </div>
        </Link>

        <Link href="/auth" className={signInClassName}>
          Sign in
        </Link>
      </div>
    </header>
  );
}

export { signInClassName };
