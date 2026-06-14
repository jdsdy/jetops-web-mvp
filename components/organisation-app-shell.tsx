"use client";

import Image from "next/image";
import Link from "next/link";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plane,
  Road,
  User,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";

type OrganisationAppShellProps = {
  organisationId: string;
  organisationName: string;
  isAdmin: boolean;
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navLinkClassName =
  "flex items-center rounded-sm text-sm font-medium transition-colors";
const navLinkActiveClassName = "bg-white/10 text-white";
const navLinkInactiveClassName = "text-neutral-300 hover:bg-white/5 hover:text-white";

const sidebarExpandedClassName = "w-56";
const sidebarCollapsedClassName = "w-14";

function isNavItemActive(pathname: string, basePath: string, href: string): boolean {
  if (href === basePath) {
    return pathname === basePath || pathname.startsWith(`${basePath}/flights`);
  }

  return pathname.startsWith(href);
}

/**
 * Portal shell with collapsible sidebar navigation for organisation app sections.
 */
export function OrganisationAppShell({
  organisationId,
  organisationName,
  isAdmin,
  children,
}: OrganisationAppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const basePath = `/app/organisation/${organisationId}`;

  const navItems: NavItem[] = [
    { label: "Flights", href: basePath, icon: Road },
    { label: "Fleet", href: `${basePath}/fleet`, icon: Plane },
    { label: "Users", href: `${basePath}/users`, icon: User },
  ];

  const activeNavItem = navItems.find((item) =>
    isNavItemActive(pathname, basePath, item.href),
  );
  const sectionTitle = pathname.endsWith("/flights")
    ? "Flight analysis"
    : (activeNavItem?.label ?? "Flights");

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside
        className={`flex shrink-0 flex-col overflow-hidden bg-aviation-navy text-white transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? sidebarCollapsedClassName : sidebarExpandedClassName
        }`}
      >
        <div
          className={`border-b border-white/10 pb-4 pt-5 ${
            sidebarCollapsed ? "px-2" : "px-4"
          }`}
        >
          <Link
            href={basePath}
            className={`flex items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            }`}
            title={sidebarCollapsed ? "Jet Operations" : undefined}
          >
            <Image
              src="/logo_square.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
            />
            <div
              className={`min-w-0 leading-tight transition-opacity duration-300 ${
                sidebarCollapsed ? "sr-only" : "opacity-100"
              }`}
            >
              <p className="truncate text-sm font-bold uppercase tracking-wide">
                Jet Operations
              </p>
              <p className="truncate text-xs text-neutral-300">{organisationName}</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`mt-6 flex w-full items-center rounded-sm text-neutral-300 transition-colors hover:bg-white/5 hover:text-white ${
              sidebarCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
            }`}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 shrink-0" aria-hidden />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>

        <nav
          className={`flex-1 space-y-1 py-4 ${
            sidebarCollapsed ? "px-2" : "px-3"
          }`}
        >
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, basePath, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={`${navLinkClassName} ${
                  sidebarCollapsed
                    ? "justify-center px-2 py-2.5"
                    : "gap-3 px-3 py-2"
                } ${isActive ? navLinkActiveClassName : navLinkInactiveClassName}`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span
                  className={`truncate transition-opacity duration-300 ${
                    sidebarCollapsed ? "sr-only" : "opacity-100"
                  }`}
                >
                  {item.label}
                </span>
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
