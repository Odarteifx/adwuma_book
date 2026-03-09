"use client";

import { useState } from "react";
import type { Business, Service } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  business: Business;
  cart: Service[];
  onRemove: (serviceId: string) => void;
  onProceed: () => void;
  primaryColor?: string;
}

function formatPrice(price: number) {
  return `GHS ${Number(price).toFixed(2)}`;
}

export function CartDrawer({
  business,
  cart,
  onRemove,
  onProceed,
  primaryColor,
}: Props) {
  const [open, setOpen] = useState(false);
  const totalPrice = cart.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = cart.reduce((sum, s) => sum + s.duration_minutes, 0);

  function handleProceed() {
    setOpen(false);
    onProceed();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative min-h-[44px] gap-1.5 px-3 sm:min-h-9 sm:gap-2 sm:px-4"
          style={
            primaryColor
              ? {
                  borderColor: primaryColor,
                  color: primaryColor,
                }
              : undefined
          }
        >
          <ShoppingCart className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Cart</span>
          <span
            className={cn(
              "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-medium text-white",
              primaryColor ? "" : "bg-primary"
            )}
            style={primaryColor ? { backgroundColor: primaryColor } : undefined}
          >
            {cart.length}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full max-w-[100vw] flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b px-4 py-4 sm:px-6 sm:py-5">
          <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShoppingCart className="h-5 w-5 shrink-0" />
            Your booking cart
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
              <p className="text-center text-sm text-muted-foreground">
                Your cart is empty. Add services to book multiple at once.
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="min-h-0 flex-1 pr-2">
                <ul className="space-y-2 px-4 py-4 sm:space-y-3 sm:px-6 sm:py-5">
                  {cart.map((service) => (
                    <li
                      key={service.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3 sm:p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm sm:text-base">
                          {service.name}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:mt-2">
                          <span>{formatPrice(Number(service.price))}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive sm:h-8 sm:w-8"
                        onClick={() => onRemove(service.id)}
                        aria-label={`Remove ${service.name} from cart`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <div className="shrink-0 space-y-3 border-t bg-muted/30 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total duration</span>
                  <span>{totalDuration} min</span>
                </div>
                <Button
                  className="h-11 w-full min-h-[44px] sm:min-h-11"
                  style={
                    primaryColor
                      ? {
                          backgroundColor: primaryColor,
                          color: "white",
                          borderColor: primaryColor,
                        }
                      : undefined
                  }
                  onClick={handleProceed}
                >
                  Proceed to date & time
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
