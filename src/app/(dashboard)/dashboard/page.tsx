import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarCheck, CreditCard, Users, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id);

  const { count: confirmedBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("status", "confirmed");

  const { data: revenueData } = await supabase
    .from("payments")
    .select("amount")
    .eq("business_id", business.id)
    .eq("status", "success");

  const totalRevenue =
    revenueData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const { count: todayBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("booking_date", new Date().toISOString().split("T")[0])
    .in("status", ["confirmed", "completed"]);

  const stats = [
    {
      title: "Total Bookings",
      value: totalBookings || 0,
      icon: CalendarCheck,
      description: "All time",
    },
    {
      title: "Active Bookings",
      value: confirmedBookings || 0,
      icon: Users,
      description: "Confirmed",
    },
    {
      title: "Revenue",
      value: `GHS ${totalRevenue.toFixed(2)}`,
      icon: CreditCard,
      description: "Deposits collected",
    },
    {
      title: "Today",
      value: todayBookings || 0,
      icon: TrendingUp,
      description: "Bookings today",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Welcome back, {user.user_metadata?.full_name?.split(" ")[0] || "there"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s an overview of {business.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <CardDescription>{stat.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
