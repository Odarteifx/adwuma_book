import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt } from "@/lib/ai/chat";
import { aiChatLimiter, checkRateLimit } from "@/lib/rate-limit";
import { getAvailableDates } from "@/lib/availability";

export async function POST(request: NextRequest) {
  try {
    const rateLimitRes = await checkRateLimit(request, aiChatLimiter());
    if (rateLimitRes) return rateLimitRes;

    const { business_id, message, session_id } = await request.json();

    if (!business_id || !message) {
      return NextResponse.json(
        { error: "Missing business_id or message" },
        { status: 400 }
      );
    }

    // Sanitize user input: strip potential prompt injection attempts
    const sanitizedMessage = message
      .replace(/\b(ignore|forget|disregard)\b.*\b(instructions?|rules?|prompt)\b/gi, "")
      .slice(0, 1000);

    const supabase = createAdminClient();

    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, description, category, location, slug")
      .eq("id", business_id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const { data: services } = await supabase
      .from("services")
      .select("id, name, description, price, duration_minutes, deposit_type, deposit_value")
      .eq("business_id", business_id)
      .eq("is_active", true);

    const minDuration = (services || []).length > 0
      ? Math.min(...(services || []).map((s) => s.duration_minutes ?? 30))
      : 30;
    const availableDates = await getAvailableDates(business_id, minDuration, 7);

    // Get conversation history for context
    let conversationHistory: Array<{ role: string; content: string }> = [];
    if (session_id) {
      const { data: convo } = await supabase
        .from("ai_conversations")
        .select("messages")
        .eq("business_id", business_id)
        .eq("session_id", session_id)
        .maybeSingle();

      if (convo?.messages) {
        const msgs = convo.messages as Array<{ role: string; content: string }>;
        conversationHistory = msgs.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }
    }

    const { systemPrompt } = await buildSystemPrompt(
      {
        businessId: business_id,
        businessName: business.name,
        businessDescription: business.description,
        businessCategory: business.category,
        businessLocation: business.location,
        services: (services || []).map((s) => ({
          name: s.name,
          price: Number(s.price),
          duration_minutes: s.duration_minutes,
          deposit_type: s.deposit_type,
          deposit_value: Number(s.deposit_value),
          description: s.description,
        })),
        availableDates,
      },
      sanitizedMessage
    );

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      const response = generateFallbackResponse(
        sanitizedMessage,
        services || []
      );
      await logConversation(
        supabase,
        business_id,
        session_id,
        sanitizedMessage,
        response
      );
      return NextResponse.json({ response });
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory,
      { role: "user" as const, content: sanitizedMessage },
    ];

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const aiData = await aiRes.json();
    const rawResponse =
      aiData.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't process that. Please try again.";

    const { message: response, action } = parseAIResponse(rawResponse);

    await logConversation(
      supabase,
      business_id,
      session_id,
      sanitizedMessage,
      response
    );

    let redirectToPayment: string | undefined;
    if (action?.type === "book_now") {
      const result = await executeBookNow(request, {
        business,
        services: services || [],
        action,
      });
      if (result.redirect_to_payment) redirectToPayment = result.redirect_to_payment;
      if (result.error) {
        return NextResponse.json(
          { response: result.error, action: undefined },
          { status: 200 }
        );
      }
    }

    const payload: Record<string, unknown> = { response };
    if (action && action.type !== "book_now") payload.action = action;
    if (redirectToPayment) payload.redirect_to_payment = redirectToPayment;

    return NextResponse.json(payload);
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const ADD_TO_CART_REGEX = /\[ADD_TO_CART:([^\]]+)\]/gi;
const BOOK_NOW_REGEX = /\[BOOK_NOW:([^\]]+)\]/gi;

function normalizeTime(input: string): string {
  const t = input.trim().toLowerCase();
  const ampm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const meridiem = ampm[3]?.toLowerCase();
    if (meridiem === "pm" && h < 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(":").map(Number);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return input;
}

function parseAIResponse(raw: string): {
  message: string;
  action?:
    | { type: "add_to_cart"; serviceNames: string[] }
    | {
        type: "book_now";
        serviceName: string;
        date: string;
        time: string;
        customerName: string;
        customerPhone: string;
        customerEmail?: string;
      };
} {
  const bookNowMatch = raw.match(BOOK_NOW_REGEX);
  if (bookNowMatch) {
    const last = bookNowMatch[bookNowMatch.length - 1];
    const inner = last.replace(/\[BOOK_NOW:/i, "").replace(/\]$/, "").trim();
    const parts = inner.split("|").map((p) => p.trim());
    if (parts.length >= 5) {
      const [serviceName, date, time, customerName, customerPhone, customerEmail] = parts;
      const message = raw.replace(BOOK_NOW_REGEX, "").replace(/\n{2,}/g, "\n").trim();
      return {
        message,
        action: {
          type: "book_now",
          serviceName,
          date,
          time: normalizeTime(time),
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
        },
      };
    }
  }

  const match = raw.match(ADD_TO_CART_REGEX);
  let message = raw;

  if (match) {
    const lastMatch = match[match.length - 1];
    const inner = lastMatch
      .replace(/\[ADD_TO_CART:/i, "")
      .replace(/\]$/, "")
      .trim();
    const serviceNames = inner
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    message = raw.replace(ADD_TO_CART_REGEX, "").replace(/\n{2,}/g, "\n").trim();
    return {
      message,
      action: serviceNames.length > 0 ? { type: "add_to_cart", serviceNames } : undefined,
    };
  }

  return { message };
}

function matchServiceByName(
  services: Array<{ id: string; name: string }>,
  name: string
): { id: string } | null {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "");
  const n = normalize(name);
  const found = services.find((s) => normalize(s.name) === n);
  return found ? { id: found.id } : null;
}

async function executeBookNow(
  request: NextRequest,
  ctx: {
    business: { id: string; slug: string };
    services: Array<{ id: string; name: string }>;
    action: {
      type: "book_now";
      serviceName: string;
      date: string;
      time: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
    };
  }
): Promise<{ redirect_to_payment?: string; error?: string }> {
  const { business, services, action } = ctx;
  const service = matchServiceByName(services, action.serviceName);
  if (!service) {
    return { error: `Service "${action.serviceName}" not found. Please select from our available services.` };
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (request.url ? new URL(request.url).origin : "http://localhost:3000");

  const batchRes = await fetch(`${base}/api/bookings/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      business_id: business.id,
      service_ids: [service.id],
      booking_date: action.date,
      start_time: action.time,
      customer_name: action.customerName,
      customer_phone: action.customerPhone,
      customer_email: action.customerEmail || null,
    }),
  });

  const batchData = await batchRes.json();
  if (!batchRes.ok) {
    return {
      error: batchData.error || "That slot is no longer available. Please choose another date or time.",
    };
  }

  const { booking_ids, total_deposit } = batchData;
  const email = action.customerEmail || "customer@adwuma.book";
  const callbackUrl = `${base}/b/${business.slug}/success`;

  const initRes = await fetch(`${base}/api/payments/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      booking_ids,
      total_deposit,
      email,
      callback_url: callbackUrl,
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok) {
    return {
      error: initData.error || "Failed to create payment link. Please try again.",
    };
  }

  const authUrl = initData.authorization_url;
  if (!authUrl) {
    return {
      error: "Payment setup is not configured. Please contact the business directly.",
    };
  }

  return { redirect_to_payment: authUrl };
}

function generateFallbackResponse(
  message: string,
  services: Array<{
    name: string;
    price: number;
    duration_minutes: number;
    description: string | null;
  }>
) {
  const lower = message.toLowerCase();

  if (
    lower.includes("price") ||
    lower.includes("cost") ||
    lower.includes("how much")
  ) {
    if (services.length > 0) {
      const list = services
        .map((s) => `${s.name}: GHS ${s.price} (${s.duration_minutes} min)`)
        .join("\n");
      return `Here are our prices:\n${list}\n\nWould you like to book any of these?`;
    }
    return "I don't have pricing information yet. Please contact the business directly.";
  }

  if (
    lower.includes("service") ||
    lower.includes("offer") ||
    lower.includes("what do")
  ) {
    if (services.length > 0) {
      const list = services.map((s) => `- ${s.name}`).join("\n");
      return `We offer:\n${list}\n\nSelect a service above to book!`;
    }
  }

  if (lower.includes("book") || lower.includes("appointment")) {
    return "You can book by selecting a service above, then picking a date and time. We require a deposit to confirm your booking.";
  }

  return "I can help you with our services, prices, and policies. What would you like to know? You can also select a service above to start booking!";
}

async function logConversation(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  sessionId: string,
  userMessage: string,
  assistantResponse: string
) {
  try {
    const { data: existing } = await supabase
      .from("ai_conversations")
      .select("id, messages")
      .eq("business_id", businessId)
      .eq("session_id", sessionId)
      .maybeSingle();

    const newMessages = [
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
      {
        role: "assistant",
        content: assistantResponse,
        timestamp: new Date().toISOString(),
      },
    ];

    if (existing) {
      const messages = [
        ...(existing.messages as unknown[]),
        ...newMessages,
      ];
      await supabase
        .from("ai_conversations")
        .update({ messages })
        .eq("id", existing.id);
    } else {
      await supabase.from("ai_conversations").insert({
        business_id: businessId,
        session_id: sessionId,
        messages: newMessages,
      });

      await supabase.from("analytics_events").insert({
        business_id: businessId,
        event_type: "ai_chat_started",
        metadata: { session_id: sessionId },
      });
    }
  } catch (err) {
    console.error("Failed to log conversation:", err);
  }
}
