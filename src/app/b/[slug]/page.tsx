import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingPageClient } from "@/components/booking/booking-page-client";
import type { Business, Service } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name, description, category")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!business) return { title: "Not Found" };

  return {
    title: `Book with ${business.name} — Adwuma Book`,
    description:
      business.description ||
      `Book an appointment with ${business.name}`,
  };
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!business) notFound();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("sort_order");

  return (
    <BookingPageClient
      business={business as Business}
      services={(services as Service[]) || []}
    />
  );
}
