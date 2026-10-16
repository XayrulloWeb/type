import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProjectorBoard } from "@/components/olympiads/ProjectorBoard";

export default async function ProjectorOlympiadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");
  const { id } = await params;
  return <ProjectorBoard olympiadId={id} />;
}

