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
          className="relative gap-2"
          style={
            primaryColor
              ? {
                  borderColor: primaryColor,
                  color: primaryColor,
                }
              : undefined
          }
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Cart</span>
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium text-white",
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
        className="flex w-full flex-col sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your booking cart
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-1 flex-col gap-4">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Your cart is empty. Add services to book multiple at once.
            </p>
          ) : (
            <>
              <ScrollArea className="flex-1 pr-2 -mr-2">
                <ul className="space-y-3">
                  {cart.map((service) => (
                    <li
                      key={service.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{service.name}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatPrice(Number(service.price))}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(service.id)}
                        aria-label={`Remove ${service.name} from cart`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total duration</span>
                  <span>{totalDuration} min</span>
                </div>
                <Button
                  className="w-full h-11"
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
