import { ProjectorBoard } from "@/components/olympiads/ProjectorBoard";
import { requireSuperAdminPage } from "@/lib/admin";

export default async function ProjectorOlympiadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdminPage();
  const { id } = await params;
  return <ProjectorBoard olympiadId={id} />;
}
