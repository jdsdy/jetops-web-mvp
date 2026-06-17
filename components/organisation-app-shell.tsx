"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plane,
  Road,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

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

type SidebarNavProps = {
  basePath: string;
  pathname: string;
  navItems: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
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
 * Sidebar navigation links for desktop and mobile overlays.
 */
function SidebarNav({
  basePath,
  pathname,
  navItems,
  collapsed,
  onNavigate,
}: SidebarNavProps) {
  return (
    <nav className={`flex-1 space-y-1 py-4 ${collapsed ? "px-2" : "px-3"}`}>
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, basePath, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`${navLinkClassName} ${
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
            } ${isActive ? navLinkActiveClassName : navLinkInactiveClassName}`}
          >
            {collapsed ? (
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <span className="truncate">{item.label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

type SidebarHeaderProps = {
  basePath: string;
  organisationName: string;
  collapsed: boolean;
  showCollapseButton: boolean;
  onCollapseToggle: () => void;
};

/**
 * Sidebar logo block and optional desktop collapse control.
 */
function SidebarHeader({
  basePath,
  organisationName,
  collapsed,
  showCollapseButton,
  onCollapseToggle,
}: SidebarHeaderProps) {
  return (
    <div
      className={`border-b border-white/10 pb-4 pt-5 ${
        collapsed ? "px-2" : "px-4"
      }`}
    >
      <Link
        href={basePath}
        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
        title={collapsed ? "Jet Operations" : undefined}
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
            collapsed ? "sr-only" : "opacity-100"
          }`}
        >
          <p className="truncate text-sm font-bold uppercase tracking-wide">
            Jet Operations
          </p>
          <p className="truncate text-xs text-neutral-300">{organisationName}</p>
        </div>
      </Link>

      {showCollapseButton ? (
        <button
          type="button"
          onClick={onCollapseToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`mt-6 flex w-full items-center rounded-sm text-neutral-300 transition-colors hover:bg-white/5 hover:text-white ${
            collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" aria-hidden />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      ) : null}
    </div>
  );
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside
        className={`hidden shrink-0 flex-col overflow-hidden bg-aviation-navy text-white transition-[width] duration-300 ease-in-out md:flex ${
          sidebarCollapsed ? sidebarCollapsedClassName : sidebarExpandedClassName
        }`}
      >
        <SidebarHeader
          basePath={basePath}
          organisationName={organisationName}
          collapsed={sidebarCollapsed}
          showCollapseButton
          onCollapseToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
        />
        <SidebarNav
          basePath={basePath}
          pathname={pathname}
          navItems={navItems}
          collapsed={sidebarCollapsed}
        />
      </aside>

      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-neutral-900/40 md:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        aria-hidden={!mobileNavOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-aviation-navy text-white transition-transform duration-300 ease-in-out md:hidden ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarHeader
          basePath={basePath}
          organisationName={organisationName}
          collapsed={false}
          showCollapseButton={false}
          onCollapseToggle={closeMobileNav}
        />
        <SidebarNav
          basePath={basePath}
          pathname={pathname}
          navItems={navItems}
          collapsed={false}
          onNavigate={closeMobileNav}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              className="inline-flex shrink-0 items-center justify-center rounded-sm p-2 text-aviation-navy transition-colors hover:bg-neutral-100 md:hidden"
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5" aria-hidden />
              ) : (
                <Menu className="h-5 w-5" aria-hidden />
              )}
            </button>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-aviation-slate">
                Organisation portal
              </p>
              <p className="truncate text-lg font-semibold text-neutral-900">
                {sectionTitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {isAdmin ? (
              <span className="rounded-sm bg-neutral-100 px-2 py-1 text-xs font-medium text-aviation-navy">
                Admin
              </span>
            ) : null}
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
