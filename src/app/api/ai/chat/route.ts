import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt } from "@/lib/ai/chat";
import { aiChatLimiter, checkRateLimit } from "@/lib/rate-limit";

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
      .select("name, description, category, location")
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
      .select("name, description, price, duration_minutes, deposit_type, deposit_value")
      .eq("business_id", business_id)
      .eq("is_active", true);

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
    const response =
      aiData.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't process that. Please try again.";

    await logConversation(
      supabase,
      business_id,
      session_id,
      sanitizedMessage,
      response
    );

    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
