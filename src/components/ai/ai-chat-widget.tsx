"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Service } from "@/types";
import { ChatBookingForm } from "./chat-booking-form";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  businessId: string;
  businessName: string;
  businessSlug: string;
  services?: Service[];
  primaryColor?: string;
  onAddToCart?: () => void;
}

function matchServiceByName(services: Service[], name: string): Service | null {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s/g, "");
  const n = normalize(name);
  return services.find((s) => normalize(s.name) === n) || null;
}

export function AIChatWidget({ businessId, businessName, businessSlug, services = [], primaryColor, onAddToCart }: Props) {
  const [open, setOpen] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState<Service[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm the AI assistant for ${businessName}. Ask me about services, prices, or policies — I'm here to help!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          message: text,
          session_id: sessionId.current,
        }),
      });

      const data = await res.json();
      const responseText = data.error || data.response || "Sorry, I couldn't process that. Please try again.";
      const assistantMsg: Message = {
        role: "assistant",
        content: responseText,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (!data.error && data.redirect_to_payment) {
        window.location.href = data.redirect_to_payment;
        return;
      }

      if (!data.error && data.action?.type === "add_to_cart" && data.action.serviceNames?.length > 0 && services.length > 0) {
        const matched: Service[] = [];
        for (const name of data.action.serviceNames) {
          const service = matchServiceByName(services, name);
          if (service) matched.push(service);
        }
        if (matched.length > 0) {
          setShowBookingForm(matched);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
          style={{ backgroundColor: primaryColor || undefined }}
          aria-label="Open AI chat"
        >
          <Bot className="h-6 w-6 text-white" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex max-h-[calc(100dvh-3rem)] min-h-[320px] flex-col rounded-2xl border bg-card shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:max-h-[480px] sm:min-h-0 sm:h-[480px] sm:w-[360px]">
          <div
            className="flex shrink-0 items-center justify-between rounded-t-2xl px-4 py-3 text-white"
            style={{ backgroundColor: primaryColor || undefined }}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="text-sm font-medium">{businessName} AI</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 min-h-[44px] min-w-[44px] text-white hover:bg-white/20 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4"
          >
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm break-words",
                    msg.role === "user"
                      ? "ml-auto text-white"
                      : "bg-muted"
                  )}
                  style={
                    msg.role === "user"
                      ? { backgroundColor: primaryColor || undefined }
                      : undefined
                  }
                >
                  {msg.content}
                </div>
              ))}
              {showBookingForm && (
                <div className="max-w-full">
                  <ChatBookingForm
                    businessId={businessId}
                    businessSlug={businessSlug}
                    services={showBookingForm}
                    primaryColor={primaryColor}
                    onCancel={() => setShowBookingForm(null)}
                  />
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about services, prices..."
                className="min-h-[44px] flex-1 text-base sm:min-h-0 sm:text-sm"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                className="h-11 w-11 shrink-0 text-white sm:h-9 sm:w-9"
                style={{ backgroundColor: primaryColor || undefined }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
