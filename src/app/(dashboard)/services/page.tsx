"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { serviceSchema } from "@/lib/validations";
import type { Service, DepositType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ServicesSkeleton } from "@/components/dashboard/skeletons";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  description: "",
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [reloadKey, setReloadKey] = useState(0);

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
      price: service.price,
      duration_minutes: service.duration_minutes,
      deposit_type: service.deposit_type,
      deposit_value: service.deposit_value,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!business) return;
    const parsed = serviceSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (editingId) {
      const { error } = await supabase
        .from("services")
        .update({
          name: form.name,
          description: form.description || null,
          price: form.price,
          duration_minutes: form.duration_minutes,
          deposit_type: form.deposit_type,
          deposit_value: form.deposit_value,
        })
        .eq("id", editingId);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Service updated");
      }
    } else {
      const { error } = await supabase.from("services").insert({
        business_id: business.id,
        name: form.name,
        description: form.description || null,
        price: form.price,
        duration_minutes: form.duration_minutes,
        deposit_type: form.deposit_type,
        deposit_value: form.deposit_value,
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Service deleted");
      reload();
    }
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Services</h2>
          <p className="text-sm text-muted-foreground">
            Manage what you offer to customers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Service" : "New Service"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Box Braids"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (GHS)</Label>
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
                  <Label>Duration (minutes)</Label>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deposit type</Label>
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
                  <Label>
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
              <div className="border-t pt-4">
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Update" : "Create"} Service
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <ServicesSkeleton />
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">No services yet</p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  {service.description && (
                    <CardDescription className="mt-1">
                      {service.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={service.is_active}
                    onCheckedChange={() => handleToggle(service)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    GHS {Number(service.price).toFixed(2)}
                  </Badge>
                  <Badge variant="outline">{service.duration_minutes} min</Badge>
                  <Badge variant="outline">
                    Deposit: {depositDisplay(service)}
                  </Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(service)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
