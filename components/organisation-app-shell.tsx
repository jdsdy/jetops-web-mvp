"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";

type OrganisationAppShellProps = {
  organisationId: string;
  organisationName: string;
  isAdmin: boolean;
  children: ReactNode;
};

const navLinkClassName =
  "block rounded-sm px-3 py-2 text-sm font-medium transition-colors";
const navLinkActiveClassName = "bg-white/10 text-white";
const navLinkInactiveClassName = "text-neutral-300 hover:bg-white/5 hover:text-white";

function isNavItemActive(pathname: string, basePath: string, href: string): boolean {
  if (href === basePath) {
    return pathname === basePath || pathname.startsWith(`${basePath}/flights`);
  }

  return pathname.startsWith(href);
}

/**
 * Portal shell with sidebar navigation for organisation app sections.
 */
export function OrganisationAppShell({
  organisationId,
  organisationName,
  isAdmin,
  children,
}: OrganisationAppShellProps) {
  const pathname = usePathname();
  const basePath = `/app/organisation/${organisationId}`;

  const navItems = [
    { label: "Flights", href: basePath },
    { label: "Fleet", href: `${basePath}/fleet` },
    { label: "Users", href: `${basePath}/users` },
  ];

  const activeNavItem = navItems.find((item) =>
    isNavItemActive(pathname, basePath, item.href),
  );
  const sectionTitle = pathname.endsWith("/flights")
    ? "Flight analysis"
    : (activeNavItem?.label ?? "Flights");

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="flex w-56 shrink-0 flex-col bg-aviation-navy text-white">
        <div className="border-b border-white/10 px-4 py-5">
          <Link href={basePath} className="flex items-center gap-3">
            <Image
              src="/logo_square.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold uppercase tracking-wide">
                Jet Operations
              </p>
              <p className="truncate text-xs text-neutral-300">
                {organisationName}
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, basePath, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${navLinkClassName} ${
                  isActive ? navLinkActiveClassName : navLinkInactiveClassName
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-aviation-slate">
              Organisation portal
            </p>
            <p className="text-lg font-semibold text-neutral-900">{sectionTitle}</p>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin ? (
              <span className="rounded-sm bg-neutral-100 px-2 py-1 text-xs font-medium text-aviation-navy">
                Admin
              </span>
            ) : null}
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
