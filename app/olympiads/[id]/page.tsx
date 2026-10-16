import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { OlympiadRoom } from "@/components/olympiads/OlympiadRoom";

export default async function OlympiadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/admin/olympiads");
  const { id } = await params;
  return <div className="min-h-screen"><Header user={session.user} /><OlympiadRoom olympiadId={id} currentUserId={session.user.id} /></div>;
}

