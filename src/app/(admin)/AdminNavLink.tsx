"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavLinkProps = {
  href: string;
  children: ReactNode;
  className: string;
  activeClassName: string;
  match?: "exact" | "prefix";
};

export default function AdminNavLink({
  href,
  children,
  className,
  activeClassName,
  match = "prefix",
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive =
    match === "exact"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link href={href} className={`${className} ${isActive ? activeClassName : ""}`.trim()}>
      {children}
    </Link>
  );
}
