import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processKBDocForEmbeddings } from "@/lib/ai/chat";

export async function POST(request: NextRequest) {
  try {
    const { doc_id } = await request.json();

    if (!doc_id) {
      return NextResponse.json({ error: "Missing doc_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: doc } = await supabase
      .from("kb_docs")
      .select("business_id")
      .eq("id", doc_id)
      .single();

    if (!doc) {
      return NextResponse.json({ error: "Doc not found" }, { status: 404 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", doc.business_id)
      .eq("owner_id", user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await processKBDocForEmbeddings(doc_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("KB processing error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
