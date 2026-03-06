import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  CreditCard,
  MessageSquare,
  BarChart3,
  Bot,
  Bell,
} from "lucide-react";

const features = [
  {
    icon: CalendarCheck,
    title: "Online Booking",
    description:
      "Customers book from your custom link — no calls or DMs needed.",
  },
  {
    icon: CreditCard,
    title: "Deposit Payments",
    description:
      "Collect deposits via Paystack to lock slots and reduce no-shows.",
  },
  {
    icon: Bell,
    title: "WhatsApp Alerts",
    description:
      "Get instant WhatsApp notifications when a booking is confirmed.",
  },
  {
    icon: Bot,
    title: "AI Customer Service",
    description:
      "An AI assistant trained on your business answers customer questions 24/7.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Track bookings, revenue, conversions, and AI impact from your dashboard.",
  },
  {
    icon: MessageSquare,
    title: "Customer Management",
    description:
      "View booking history, manage appointments, and keep customers happy.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            Adwuma Book
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center md:py-32">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            The booking platform for{" "}
            <span className="text-primary">Ghanaian service businesses</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Accept deposits, reduce no-shows, and delight your customers with
            AI-powered booking. Built for salons, barbers, photographers,
            clinics, and more.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Start Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">See Features</Link>
            </Button>
          </div>
        </section>

        <section id="features" className="border-t bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything you need to run your bookings
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border bg-card p-6 shadow-sm"
                >
                  <feature.icon className="mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold">Ready to take bookings?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Set up in minutes. No technical knowledge required.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/signup">Create Your Booking Page</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Adwuma Book. Built in Ghana.
        </div>
      </footer>
    </div>
  );
}
