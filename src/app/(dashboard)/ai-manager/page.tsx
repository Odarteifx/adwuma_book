"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { kbDocSchema } from "@/lib/validations";
import type { KBDoc, KBDocType } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AIManagerSkeleton } from "@/components/dashboard/skeletons";
import { Loader2, Plus, Pencil, Trash2, Bot } from "lucide-react";

const DOC_TYPES: { value: KBDocType; label: string }[] = [
  { value: "faq", label: "FAQ" },
  { value: "policy", label: "Policy" },
  { value: "info", label: "Info" },
];

export default function AIManagerPage() {
  const { business } = useBusiness();
  const [docs, setDocs] = useState<KBDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    doc_type: "faq" as KBDocType,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!business) return;
    const businessId = business.id;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("kb_docs")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setDocs((data as KBDoc[]) || []);
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
    setForm({ title: "", content: "", doc_type: "faq" });
    setDialogOpen(true);
  }

  function openEdit(doc: KBDoc) {
    setEditingId(doc.id);
    setForm({
      title: doc.title,
      content: doc.content,
      doc_type: doc.doc_type,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!business) return;
    const parsed = kbDocSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    let docId = editingId;

    if (editingId) {
      const { error } = await supabase
        .from("kb_docs")
        .update({
          title: form.title,
          content: form.content,
          doc_type: form.doc_type,
        })
        .eq("id", editingId);

      if (error) toast.error(error.message);
      else toast.success("Document updated");
    } else {
      const { data, error } = await supabase
        .from("kb_docs")
        .insert({
          business_id: business.id,
          title: form.title,
          content: form.content,
          doc_type: form.doc_type,
        })
        .select("id")
        .single();

      if (error) toast.error(error.message);
      else {
        toast.success("Document added");
        docId = data?.id;
      }
    }

    // Trigger embedding generation in background
    if (docId) {
      fetch("/api/ai/process-kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId }),
      }).catch(() => {});
    }

    setSaving(false);
    setDialogOpen(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    const supabase = createClient();
    await supabase.from("kb_docs").delete().eq("id", id);
    toast.success("Document deleted");
    reload();
  }

  if (!business) {
    return <AIManagerSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight sm:text-2xl">AI Assistant</h2>
          <p className="text-muted-foreground">
            Train your AI by adding FAQs, policies, and business info
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Document" : "New Document"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.doc_type}
                  onValueChange={(v) =>
                    setForm({ ...form, doc_type: v as KBDocType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Cancellation Policy"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  placeholder="Write the information your AI should know..."
                  rows={8}
                />
              </div>
              <div className="border-t pt-4">
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Update" : "Add"} Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add your business FAQs, policies, and information here. The AI
            assistant on your booking page will use this knowledge to answer
            customer questions and guide them to book. The more info you
            provide, the better the AI can help your customers.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <AIManagerSkeleton />
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">
              No knowledge base documents yet
            </p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{doc.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {doc.doc_type}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {doc.content}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(doc)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
