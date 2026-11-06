import { cookies } from "next/headers";
import { Game } from "@/components/game";

export default async function Home() {
  const cookieStore = await cookies();
  const openingSeen = cookieStore.get("trustless-opening-seen")?.value === "true";

  return <Game initialOpened={openingSeen} />;
}
