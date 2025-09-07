import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Specialisci",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="flex items-center justify-between border-b border-white/10 pb-4">
          <h1 className="text-xl font-semibold">Panel administratora</h1>
          <nav className="flex gap-3 text-sm">
            <Link href="/admin" className="hover:underline">Dashboard</Link>
            <Link href="/admin/users" className="hover:underline">Użytkownicy</Link>
            <Link href="/admin/skills" className="hover:underline">Umiejętności</Link>
            <Link href="/admin/certifications" className="hover:underline">Certyfikaty</Link>
            <Link href="/admin/cities" className="hover:underline">Miasta</Link>
            <Link href="/admin/client-ads" className="hover:underline">Ogłoszenia klientów</Link>
            <Link href="/admin/specialist-ads" className="hover:underline">Ogłoszenia specjalistów</Link>
            <Link href="/" className="hover:underline">Powrót do serwisu</Link>
          </nav>
        </header>
        <main className="pt-6">{children}</main>
      </div>
    </div>
  );
}
