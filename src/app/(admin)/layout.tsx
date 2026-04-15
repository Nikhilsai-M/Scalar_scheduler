import Link from "next/link";
import styles from "./admin.module.css";
import { Clock, Plus } from "lucide-react";
import AdminNavLink from "./AdminNavLink";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/dashboard" className={styles.logoGroup}>
            <span className={styles.logo}>C</span>
            <span className={styles.logoText}>Scalar Scheduler</span>
          </Link>
          <nav className={styles.nav}>
            <AdminNavLink href="/dashboard" match="exact" className={styles.navLink} activeClassName={styles.navLinkActive}>
              Dashboard
            </AdminNavLink>
            <AdminNavLink href="/event-types" className={styles.navLink} activeClassName={styles.navLinkActive}>
              Event Types
            </AdminNavLink>
            <AdminNavLink href="/meetings" className={styles.navLink} activeClassName={styles.navLinkActive}>
              Meetings
            </AdminNavLink>
          </nav>
          <div className={styles.userMenu}>
            <AdminNavLink href="/availability" className={styles.navLinkWithIcon} activeClassName={styles.navLinkActive}>
              <Clock size={16} /> Availability
            </AdminNavLink>
            <Link href="/event-types/new" className={styles.createButton}>
              <Plus size={16} /> Create
            </Link>
            <div className={styles.avatar}>A</div>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
