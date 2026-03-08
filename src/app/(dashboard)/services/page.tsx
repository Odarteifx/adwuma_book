"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { serviceSchema } from "@/lib/validations";
import type { Service, DepositType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ServicesSkeleton } from "@/components/dashboard/skeletons";
import { Loader2, Plus, Pencil, Trash2, ImagePlus, X } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  description: "",
  image_url: null as string | null,
  price: 0,
  duration_minutes: 60,
  deposit_type: "percentage" as DepositType,
  deposit_value: 50,
};

export default function ServicesPage() {
  const { business } = useBusiness();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!business) return;
    const businessId = business.id;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });
      if (!cancelled) {
        setServices((data as Service[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [business, reloadKey]);

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description || "",
      image_url: service.image_url || null,
      price: service.price,
      duration_minutes: service.duration_minutes,
      deposit_type: service.deposit_type,
      deposit_value: service.deposit_value,
    });
    setDialogOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!business || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${business.id}/services/${editingId || "new"}-${Date.now()}.${ext}`;

    setUploading(true);
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

    setForm((f) => ({ ...f, image_url: publicUrl }));
    toast.success("Image uploaded");
    setUploading(false);
  }

  function clearImage() {
    setForm((f) => ({ ...f, image_url: null }));
  }

  async function handleSave() {
    if (!business) return;
    const parsed = serviceSchema.safeParse({
      ...form,
      image_url: form.image_url || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: form.name,
      description: form.description || null,
      image_url: form.image_url || null,
      price: form.price,
      duration_minutes: form.duration_minutes,
      deposit_type: form.deposit_type,
      deposit_value: form.deposit_value,
    };

    if (editingId) {
      const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Service updated");
      }
    } else {
      const { error } = await supabase.from("services").insert({
        business_id: business.id,
        ...payload,
        sort_order: services.length,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Service created");
      }
    }

    setSaving(false);
    setDialogOpen(false);
    reload();
  }

  async function handleToggle(service: Service) {
    const supabase = createClient();
    await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);
    reload();
  }

  function openDeleteConfirm(service: Service) {
    setDeleteServiceId(service.id);
  }

  async function handleDeleteConfirm() {
    if (!deleteServiceId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", deleteServiceId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Service deleted");
      reload();
    }
    setDeleteServiceId(null);
  }

  function depositDisplay(service: Service) {
    if (service.deposit_type === "percentage") {
      return `${service.deposit_value}% (GHS ${((service.price * service.deposit_value) / 100).toFixed(2)})`;
    }
    return `GHS ${service.deposit_value.toFixed(2)}`;
  }

  if (!business) {
    return <ServicesSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight sm:text-2xl">
            Services
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage what you offer to customers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Service" : "New Service"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm">Image (optional)</Label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {form.image_url ? (
                  <div className="relative inline-block">
                    <img
                      src={form.image_url}
                      alt=""
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-2 h-3.5 w-3.5" />
                    )}
                    Upload image
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Box Braids"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Description (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">Price (GHS)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price || ""}
                    onChange={(e) =>
                      setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Duration (min)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        duration_minutes: parseInt(e.target.value) || 60,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">Deposit type</Label>
                  <Select
                    value={form.deposit_type}
                    onValueChange={(v) =>
                      setForm({ ...form, deposit_type: v as DepositType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">
                    Deposit{" "}
                    {form.deposit_type === "percentage" ? "(%)" : "(GHS)"}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={form.deposit_type === "percentage" ? 100 : form.price}
                    step={form.deposit_type === "percentage" ? 5 : 0.01}
                    value={form.deposit_value || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deposit_value: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"} Service
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <ServicesSkeleton />
      ) : services.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            No services yet
          </p>
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add your first service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className="overflow-hidden py-0 shadow-none"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 pb-2">
                <div className="flex min-w-0 items-center gap-3">
                  {service.image_url ? (
                    <img
                      src={service.image_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <ImagePlus className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      GHS {Number(service.price).toFixed(2)} ·{" "}
                      {service.duration_minutes} min
                    </p>
                  </div>
                </div>
                <Switch
                  checked={service.is_active}
                  onCheckedChange={() => handleToggle(service)}
                />
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-0">
                <p className="text-xs text-muted-foreground">
                  Deposit: {depositDisplay(service)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 min-h-[44px] flex-1 text-xs sm:h-8 sm:min-h-0"
                    onClick={() => openEdit(service)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 min-h-[44px] text-destructive hover:bg-destructive/10 sm:h-8 sm:min-h-0"
                    onClick={() => openDeleteConfirm(service)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={deleteServiceId !== null}
        onOpenChange={(open) => !open && setDeleteServiceId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              {services.find((s) => s.id === deleteServiceId)?.name ?? "this service"}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
