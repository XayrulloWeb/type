import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TypingPractice } from "@/components/typing/TypingPractice";
import { getRandomWords } from "@/lib/words";

export default async function TypingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const initialText = getRandomWords("en", 260);
  return <TypingPractice user={session.user} initialText={initialText} />;
}
