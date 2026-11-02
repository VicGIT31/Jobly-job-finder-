import { MonEspaceNav } from "@/components/account/mon-espace-nav";
export const dynamic = "force-dynamic";
export default function PersonalLayout({children}:{children:React.ReactNode}) { return <div className="container-page py-8"><h1 className="text-3xl font-semibold">Mon espace</h1><p className="mt-2 text-ink/60">Vos favoris, vos recherches et vos candidatures restent sur cet ordinateur.</p><div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]"><MonEspaceNav/><div className="min-w-0">{children}</div></div></div>; }
