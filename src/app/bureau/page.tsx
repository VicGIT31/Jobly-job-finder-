import { notFound } from "next/navigation";
import { DesktopPanel } from "./panel";

export const dynamic = "force-dynamic";
export default function DesktopPage() {
  if (process.env.JOBLY_DESKTOP !== "1") notFound();
  return <DesktopPanel />;
}
