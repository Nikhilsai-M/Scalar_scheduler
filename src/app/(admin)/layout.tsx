import Link from "next/link";
import styles from "./admin.module.css";
import { Clock, Plus } from "lucide-react";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.logoGroup}>
          <span className={styles.logo}>C</span>
          <span className={styles.logoText}>Scalar Scheduler</span>
        </Link>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/event-types" className={styles.navLink}>
            Event Types
          </Link>
          <Link href="/meetings" className={styles.navLink}>
            Scheduled Events
          </Link>
        </nav>
        <div className={styles.userMenu}>
          <Link href="/availability" className={styles.navLinkWithIcon}>
            <Clock size={16} /> Availability
          </Link>
          <Link href="/event-types/new" className={styles.createButton}>
            <Plus size={16} /> Create
          </Link>
          <div className={styles.avatar}>A</div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
