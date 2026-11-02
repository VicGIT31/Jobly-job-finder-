import { AdminNav } from "./admin-nav";
export const dynamic = "force-dynamic";
export default function SettingsLayout({ children }: { children: React.ReactNode }) { return <div className="container-page py-8"><h1 className="text-3xl font-semibold">Réglages de Jobly</h1><p className="mt-2 text-ink/60">Paramètres de votre application personnelle.</p><AdminNav /><div className="mt-8">{children}</div></div>; }
