"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { businessSchema, type BusinessInput } from "@/lib/validations";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/location/location-picker";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import type { BusinessCategory } from "@/types";

const STEPS = ["Business Info", "Contact & Location", "Review"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [form, setForm] = useState<BusinessInput>({
    name: "",
    slug: "",
    description: "",
    category: "salon",
    whatsapp_number: "+233",
    location: "",
  });

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
  }

  function handleNameChange(name: string) {
    const slug = generateSlug(name);
    setForm({ ...form, name, slug });
    setSlugAvailable(null);
  }

  async function checkSlug() {
    if (form.slug.length < 3) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", form.slug)
      .maybeSingle();
    setSlugAvailable(!data);
  }

  async function handleSubmit() {
    const parsed = businessSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("businesses").insert({
      owner_id: user.id,
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      category: form.category,
      whatsapp_number: form.whatsapp_number,
      location: form.location || null,
      latitude,
      longitude,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("This slug is already taken. Please choose another.");
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    toast.success("Business created!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Set up your business
          </CardTitle>
          <CardDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </CardDescription>
          <div className="mt-4 flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Business name</Label>
                <Input
                  id="name"
                  placeholder="Akua's Hair Studio"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Booking link</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    /b/
                  </span>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setForm({ ...form, slug: e.target.value.toLowerCase() });
                      setSlugAvailable(null);
                    }}
                    onBlur={checkSlug}
                  />
                </div>
                {slugAvailable === true && (
                  <p className="text-xs text-green-600">Available!</p>
                )}
                {slugAvailable === false && (
                  <p className="text-xs text-destructive">Already taken</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as BusinessCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell customers what makes your business special..."
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp number</Label>
                <Input
                  id="whatsapp"
                  placeholder="+233241234567"
                  value={form.whatsapp_number}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_number: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Ghana format: +233XXXXXXXXX
                </p>
              </div>
              <div className="space-y-2">
                <Label>Location (optional)</Label>
                <LocationPicker
                  value={form.location || ""}
                  latitude={latitude}
                  longitude={longitude}
                  onChange={(loc, lat, lng) => {
                    setForm({ ...form, location: loc });
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <p className="text-xs text-muted-foreground">Business name</p>
                <p className="font-medium">{form.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Booking link</p>
                <p className="font-medium">/b/{form.slug}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium capitalize">
                  {form.category.replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="font-medium">{form.whatsapp_number}</p>
              </div>
              {form.location && (
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{form.location}</p>
                  {latitude && longitude && (
                    <p className="text-xs text-muted-foreground">
                      Coordinates: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between border-t pt-6">
            {step > 0 ? (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Create Business
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
