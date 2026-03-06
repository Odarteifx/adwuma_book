import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const businessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(30, "Slug must be at most 30 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
  description: z.string().max(500).optional().nullable(),
  category: z.enum([
    "salon",
    "barber",
    "nail_tech",
    "lash_tech",
    "makeup_artist",
    "photographer",
    "decorator",
    "clinic",
    "tutor",
    "restaurant",
    "event_vendor",
    "other",
  ]),
  whatsapp_number: z
    .string()
    .regex(/^\+233[0-9]{9}$/, "Enter a valid Ghana WhatsApp number (+233...)"),
  location: z.string().max(200).optional().nullable(),
});

export const serviceSchema = z
  .object({
    name: z.string().min(2, "Service name is required").max(100),
    description: z.string().max(500).optional().nullable(),
    price: z.number().positive("Price must be greater than 0"),
    duration_minutes: z
      .number()
      .int()
      .min(15, "Minimum 15 minutes")
      .max(480, "Maximum 8 hours"),
    deposit_type: z.enum(["fixed", "percentage"]),
    deposit_value: z.number().positive("Deposit must be greater than 0"),
  })
  .refine(
    (data) => {
      if (data.deposit_type === "percentage") {
        return data.deposit_value >= 1 && data.deposit_value <= 100;
      }
      return data.deposit_value <= data.price;
    },
    {
      message: "Deposit percentage must be 1-100, or fixed amount must not exceed price",
      path: ["deposit_value"],
    }
  );

export const availabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  is_active: z.boolean(),
});

export const bookingSchema = z.object({
  service_id: z.string().uuid(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  customer_name: z.string().min(2, "Name is required").max(100),
  customer_email: z.string().email("Invalid email").optional().nullable(),
  customer_phone: z
    .string()
    .regex(/^\+233[0-9]{9}$/, "Enter a valid Ghana phone number (+233...)"),
  notes: z.string().max(500).optional().nullable(),
});

export const kbDocSchema = z.object({
  title: z.string().min(2, "Title is required").max(200),
  content: z.string().min(10, "Content must be at least 10 characters").max(10000),
  doc_type: z.enum(["faq", "policy", "info"]),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type KBDocInput = z.infer<typeof kbDocSchema>;
