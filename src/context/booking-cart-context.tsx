"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Service } from "@/types";

interface BookingCartContextValue {
  cart: Service[];
  addToCart: (service: Service) => void;
  removeFromCart: (serviceId: string) => void;
  clearCart: () => void;
  isInCart: (serviceId: string) => boolean;
}

const BookingCartContext = createContext<BookingCartContextValue | null>(null);

export function BookingCartProvider({
  children,
  businessId,
}: {
  children: ReactNode;
  businessId: string;
}) {
  const [cart, setCart] = useState<Service[]>([]);

  const addToCart = useCallback((service: Service) => {
    if (service.business_id !== businessId) return;
    setCart((prev) => {
      if (prev.some((s) => s.id === service.id)) return prev;
      return [...prev, service];
    });
  }, [businessId]);

  const removeFromCart = useCallback((serviceId: string) => {
    setCart((prev) => prev.filter((s) => s.id !== serviceId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const isInCart = useCallback(
    (serviceId: string) => cart.some((s) => s.id === serviceId),
    [cart]
  );

  return (
    <BookingCartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, isInCart }}
    >
      {children}
    </BookingCartContext.Provider>
  );
}

export function useBookingCart() {
  const ctx = useContext(BookingCartContext);
  if (!ctx) throw new Error("useBookingCart must be used within BookingCartProvider");
  return ctx;
}
