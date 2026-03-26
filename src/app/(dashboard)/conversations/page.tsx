"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ConversationsSkeleton } from "@/components/dashboard/skeletons";
import { MessageSquare, ChevronDown, CalendarCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type DateFilter = "all" | "today" | "week" | "month";
type BookingFilter = "all" | "booked" | "not_booked";

type Message = { role: string; content: string };

type Conversation = {
  id: string;
  session_id: string;
  messages: Message[];
  led_to_booking: boolean;
  created_at: string;
  updated_at: string;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPreview(messages: Message[]): string {
  const last = messages[messages.length - 1];
  if (!last?.content) return "—";
  const text = last.content.trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function matchesDateFilter(iso: string, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setMonth(monthStart.getMonth() - 1);

  if (filter === "today") return d >= todayStart;
  if (filter === "week") return d >= weekStart;
  if (filter === "month") return d >= monthStart;
  return true;
}

function matchesSearch(conv: Conversation, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.toLowerCase();
  const text = (conv.messages || []).map((m) => m.content).join(" ");
  return text.toLowerCase().includes(s);
}

export default function ConversationsPage() {
  const { business } = useBusiness();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("ai_conversations")
        .select("id, session_id, messages, led_to_booking, created_at, updated_at")
        .eq("business_id", business.id)
        .order("updated_at", { ascending: false });

      if (!cancelled) {
        setConversations((data as Conversation[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [business]);

  const filtered = useMemo(() => {
    return conversations.filter((conv) => {
      if (!matchesDateFilter(conv.updated_at, dateFilter)) return false;
      if (bookingFilter === "booked" && !conv.led_to_booking) return false;
      if (bookingFilter === "not_booked" && conv.led_to_booking) return false;
      if (!matchesSearch(conv, search)) return false;
      return true;
    });
  }, [conversations, dateFilter, bookingFilter, search]);

  if (!business) {
    return <ConversationsSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-2xl">
          AI Conversations
        </h2>
        <p className="text-muted-foreground">
          Track customer chats with your AI assistant
        </p>
      </div>

      {loading ? (
        <ConversationsSkeleton />
      ) : conversations.length === 0 ? (
        <Card className="border-border/60 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No conversations yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Chats will appear here when customers use the AI on your booking page
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger size="sm" className="h-8 w-[7rem] text-xs">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bookingFilter} onValueChange={(v) => setBookingFilter(v as BookingFilter)}>
                <SelectTrigger size="sm" className="h-8 w-[7rem] text-xs">
                  <SelectValue placeholder="Booking" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="not_booked">Not booked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No conversations match your filters
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((conv) => (
                <Collapsible key={conv.id} className="group">
                  <Card className="flex flex-col border-border/60 p-0 shadow-none">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/30">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-medium">
                        {getPreview(conv.messages || [])}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {conv.messages?.length || 0} · {formatDateTime(conv.updated_at)}
                        {conv.led_to_booking && (
                          <span className="ml-1 text-primary">· booked</span>
                        )}
                      </p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border/60 px-3 py-2">
                        <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto">
                          {(conv.messages || []).map((msg, i) => (
                            <div
                              key={i}
                              className={cn(
                            "max-w-[min(100%,16rem)] shrink-0 rounded px-2 py-1 text-xs",
                                msg.role === "user"
                                  ? "bg-muted/70 self-end"
                                  : "bg-muted/40 self-start"
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
