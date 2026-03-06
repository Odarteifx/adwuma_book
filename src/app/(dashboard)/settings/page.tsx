"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { businessSchema, type BusinessInput } from "@/lib/validations";
import { BUSINESS_CATEGORIES, PLANS } from "@/lib/constants";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LocationPicker } from "@/components/location/location-picker";
import { toast } from "sonner";
import { SettingsSkeleton } from "@/components/dashboard/skeletons";
import { Loader2, Upload } from "lucide-react";
import type { Business, BusinessCategory, PlanType } from "@/types";

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState<BusinessInput>({
    name: "",
    slug: "",
    description: "",
    category: "salon",
    whatsapp_number: "+233",
    location: "",
  });
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (data) {
        setBusiness(data as Business);
        setForm({
          name: data.name,
          slug: data.slug,
          description: data.description,
          category: data.category as BusinessCategory,
          whatsapp_number: data.whatsapp_number,
          location: data.location,
        });
        setLatitude(data.latitude ?? null);
        setLongitude(data.longitude ?? null);
        setPrimaryColor(data.primary_color);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!business) return;
    const parsed = businessSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        category: form.category,
        whatsapp_number: form.whatsapp_number,
        location: form.location || null,
        latitude,
        longitude,
        primary_color: primaryColor,
      })
      .eq("id", business.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Settings saved");
    }
    setLoading(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!business || !e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    const ext = file.name.split(".").pop();
    const path = `${business.id}/logo.${ext}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("business-assets")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("business-assets").getPublicUrl(path);

    await supabase
      .from("businesses")
      .update({ logo_url: publicUrl })
      .eq("id", business.id);

    setBusiness({ ...business, logo_url: publicUrl });
    toast.success("Logo uploaded");
    setUploading(false);
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!business || !e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    const ext = file.name.split(".").pop();
    const path = `${business.id}/banner.${ext}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("business-assets")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("business-assets").getPublicUrl(path);

    await supabase
      .from("businesses")
      .update({ banner_url: publicUrl })
      .eq("id", business.id);

    setBusiness({ ...business, banner_url: publicUrl });
    toast.success("Banner uploaded");
    setUploading(false);
  }

  if (!business) {
    return <SettingsSkeleton />;
  }

  const plan = PLANS[business.plan as PlanType];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your business profile and branding
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Your current subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              {plan.name}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {plan.price > 0 ? `GHS ${plan.price}/mo` : "Free"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
          <CardDescription>Update your business information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Booking link slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/b/</span>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value.toLowerCase() })
                }
                className="max-w-60"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm({ ...form, category: v as BusinessCategory })
              }
            >
              <SelectTrigger className="max-w-60">
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
            <Label>Description</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp number</Label>
            <Input
              value={form.whatsapp_number}
              onChange={(e) =>
                setForm({ ...form, whatsapp_number: e.target.value })
              }
              className="max-w-60"
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize the look of your booking page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Logo</Label>
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt="Logo"
                className="mb-2 h-16 w-16 rounded-lg object-cover"
              />
            )}
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                asChild
              >
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Banner</Label>
            {business.banner_url && (
              <img
                src={business.banner_url}
                alt="Banner"
                className="mb-2 h-32 w-full rounded-lg object-cover"
              />
            )}
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                asChild
              >
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Banner"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </div>
  );
}
