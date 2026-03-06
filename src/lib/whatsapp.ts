const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

interface BookingNotification {
  recipientPhone: string;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  depositAmount: string;
}

export async function sendBookingConfirmation(params: BookingNotification) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn("WhatsApp not configured, skipping notification");
    return { success: false, reason: "not_configured" };
  }

  // Format phone: remove + prefix if present for WhatsApp API
  const phone = params.recipientPhone.replace(/^\+/, "");

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: {
            body: `New booking confirmed! 🎉

Customer: ${params.customerName}
Service: ${params.serviceName}
Date: ${params.date}
Time: ${params.time}
Deposit paid: GHS ${params.depositAmount}

— Adwuma Book`,
          },
        }),
      }
    );

    const data = await res.json();

    if (data.error) {
      console.error("WhatsApp API error:", data.error);
      return { success: false, reason: data.error.message };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return { success: false, reason: "network_error" };
  }
}
