import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scalar Scheduler",
  description: "Professional scheduling platform for managing availability, event types, and bookings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="main-wrapper">{children}</main>
      </body>
    </html>
  );
}
