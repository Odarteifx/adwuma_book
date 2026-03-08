import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarCheck,
  CreditCard,
  MessageSquare,
  BarChart3,
  Bot,
  Bell,
  ArrowRight,
  Scissors,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: CalendarCheck,
    title: "Online Booking",
    description:
      "Customers book from your custom link — no calls or DMs needed.",
    color:
      "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/40",
  },
  {
    icon: CreditCard,
    title: "Deposit Payments",
    description:
      "Collect deposits via Paystack to lock slots and reduce no-shows.",
    color:
      "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40",
  },
  {
    icon: Bell,
    title: "WhatsApp Alerts",
    description:
      "Get instant WhatsApp notifications when a booking is confirmed.",
    color:
      "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40",
  },
  {
    icon: Bot,
    title: "AI Customer Service",
    description:
      "An AI assistant trained on your business answers customer questions 24/7.",
    color:
      "text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950/40",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Track bookings, revenue, conversions, and AI impact from your dashboard.",
    color:
      "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-950/40",
  },
  {
    icon: MessageSquare,
    title: "Customer Management",
    description:
      "View booking history, manage appointments, and keep customers happy.",
    color:
      "text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-950/40",
  },
];

const benefits = [
  "Set up in under 5 minutes",
  "No technical knowledge needed",
  "Works on any device",
  "Secure Paystack payments",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold">Adwuma Book</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">
                Get Started
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,var(--color-primary)/0.08,transparent)]" />
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-32">
            <div className="mx-auto max-w-3xl animate-in fade-in duration-500 text-center">
              <Badge variant="secondary" className="mb-6">
                Built for Ghanaian service businesses
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                The booking platform that{" "}
                <span className="text-primary">works for you</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                Accept deposits, reduce no-shows, and delight your customers
                with AI-powered booking. Built for salons, barbers,
                photographers, clinics, and more.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Start Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">See How It Works</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {benefits.map((b) => (
                  <span key={b} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Features */}
        <section id="features" className="bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything you need to run your bookings
              </h2>
              <p className="mt-3 text-muted-foreground">
                From scheduling to payments, we handle the details so you can
                focus on your craft.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <div
                  key={feature.title}
                  className="group animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-forwards rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
                  style={{ "--tw-animation-delay": `${i * 75}ms` } as React.CSSProperties}
                >
                  <div
                    className={`mb-4 inline-flex rounded-lg p-2.5 ${feature.color}`}
                  >
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator />

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,oklch(0.7_0.15_262/0.3),transparent)]" />
              <h2 className="text-3xl font-bold tracking-tight">
                Ready to take bookings?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
                Set up your booking page in minutes. No technical knowledge
                required — just add your services and share your link.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="mt-8"
                asChild
              >
                <Link href="/signup">
                  Create Your Booking Page
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Scissors className="h-3 w-3" />
            </div>
            <span className="font-medium text-foreground">Adwuma Book</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Built in Ghana.</p>
        </div>
      </footer>
    </div>
  );
}
