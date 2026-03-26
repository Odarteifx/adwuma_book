import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BusinessFooter } from "@/components/booking/business-footer";
import type { Business } from "@/types";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function BookingLayout({ children, params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!business) notFound();

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-pattern-dots"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
        <BusinessFooter business={business as Business} />
      </div>
    </div>
  );
}
