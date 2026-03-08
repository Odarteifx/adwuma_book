import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    redirect("/onboarding");
  }

  const userName = user.user_metadata?.full_name || user.email || "User";
  const oauthAvatar =
    user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
  const emailNorm = (user.email || "").trim().toLowerCase();
  const gravatarHash = createHash("md5").update(emailNorm).digest("hex");
  const gravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?s=80&d=404`;

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden md:flex-row">
      <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:block">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-lg font-bold text-primary">Adwuma Book</h1>
        </div>
        <SidebarNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <DashboardHeader
          userEmail={user.email || ""}
          userName={userName}
          oauthAvatarUrl={oauthAvatar}
          gravatarUrl={gravatarUrl}
          businessSlug={business.slug}
        />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
