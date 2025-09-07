import prisma from "@/lib/prismadb";
import { requireAdmin } from "./_lib/admin";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [usersCount, specialistsCount, skillsCount, certsCount, clientAdsCount, specialistAdsCount] = await Promise.all([
    prisma.user.count(),
    prisma.specialistProfile.count(),
    prisma.skill.count(),
    prisma.certification.count(),
    prisma.clientAd.count(),
    prisma.specialistAd.count(),
  ]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card title="Użytkownicy" value={usersCount} />
      <Card title="Specjaliści (profile)" value={specialistsCount} />
      <Card title="Umiejętności" value={skillsCount} />
      <Card title="Certyfikaty" value={certsCount} />
      <Card title="Ogłoszenia klientów" value={clientAdsCount} />
      <Card title="Ogłoszenia specjalistów" value={specialistAdsCount} />
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-neutral-300">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
