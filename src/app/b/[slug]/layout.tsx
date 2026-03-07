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
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 flex-col">{children}</main>
      <BusinessFooter business={business as Business} />
    </div>
  );
}
