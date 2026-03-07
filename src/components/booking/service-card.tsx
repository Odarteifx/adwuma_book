"use client";

import { useState } from "react";
import type { Business, Service } from "@/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Clock, ImageIcon, ZoomIn } from "lucide-react";

interface ServiceCardImageProps {
  service: Service;
  className?: string;
}

function ServiceCardImage({ service, className }: ServiceCardImageProps) {
  const [imageOpen, setImageOpen] = useState(false);

  if (!service.image_url) {
    return (
      <div
        className={className}
        aria-hidden
      >
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setImageOpen(true)}
        className={cn(
          "group relative block w-full overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className
        )}
        aria-label={`View ${service.name} image`}
      >
        <img
          src={service.image_url}
          alt={service.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <ZoomIn className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100 sm:h-10 sm:w-10" />
        </div>
      </button>
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-2xl border-0 bg-black/80 p-4 [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:hover:text-white">
          <img
            src={service.image_url}
            alt={service.name}
            className="max-h-[85vh] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ServiceCardBaseProps {
  service: Service;
  variant: "select" | "summary";
  business?: Business;
  selectedDate?: string;
  selectedTime?: string;
  primaryColor?: string;
  onSelect?: (service: Service) => void;
}

const DESCRIPTION_TRUNCATE_CHARS = 100;

function ServiceDescription({
  description,
  className,
  showExpand,
  primaryColor,
}: {
  description: string;
  className?: string;
  showExpand?: boolean;
  primaryColor?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const showViewMore = showExpand && description.length > DESCRIPTION_TRUNCATE_CHARS;

  if (!description) return null;

  return (
    <div className={cn("space-y-0.5", className)}>
      <p
        className={cn(
          "text-xs text-muted-foreground",
          (!showExpand || !isExpanded) && "line-clamp-2"
        )}
      >
        {description}
      </p>
      {showViewMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "text-xs font-medium text-muted-foreground underline-offset-2 hover:underline",
            primaryColor ? "hover:text-[var(--desc-accent)]" : "hover:text-foreground"
          )}
          style={
            primaryColor
              ? ({ "--desc-accent": primaryColor } as React.CSSProperties)
              : undefined
          }
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-0.5 inline h-3 w-3 align-middle" />
              View less
            </>
          ) : (
            <>
              <ChevronDown className="mr-0.5 inline h-3 w-3 align-middle" />
              View more
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function ServiceCard({
  service,
  variant,
  business,
  selectedDate,
  selectedTime,
  primaryColor,
  onSelect,
}: ServiceCardBaseProps) {
  const deposit =
    service.deposit_type === "percentage"
      ? (Number(service.price) * Number(service.deposit_value)) / 100
      : Number(service.deposit_value);

  return (
    <Card
      className={cn(
        "flex flex-col gap-0 overflow-hidden border shadow-sm p-0 transition-all duration-200",
        variant === "select" &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        variant === "select" &&
          primaryColor &&
          "[&:hover]:border-[var(--card-accent)]",
        variant === "summary" && "h-full"
      )}
      style={
        primaryColor && variant === "select"
          ? ({ "--card-accent": primaryColor } as React.CSSProperties)
          : undefined
      }
    >
      <ServiceCardImage
        service={service}
        className="aspect-[4/3] w-full shrink-0"
      />
      <CardHeader className="flex-1 space-y-0.5 px-3 py-2 sm:px-4 sm:py-2.5">
        {variant === "summary" && business && (
          <div className="flex items-center gap-2">
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt=""
                className="h-5 w-5 rounded-full object-cover sm:h-6 sm:w-6"
              />
            )}
            <p className="text-xs font-medium text-muted-foreground">
              {business.name}
            </p>
          </div>
        )}
        <p className="font-medium">{service.name}</p>
        <ServiceDescription
          description={service.description ?? ""}
          showExpand={variant === "summary"}
          primaryColor={primaryColor}
        />
      </CardHeader>
      <CardContent className="space-y-2 border-t px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">GHS {Number(service.price).toFixed(2)}</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {service.duration_minutes} min
          </span>
        </div>
        {variant === "summary" && selectedDate && selectedTime && (
          <p className="text-xs text-muted-foreground">
            {selectedDate} at {selectedTime} · Deposit GHS {deposit.toFixed(2)}
          </p>
        )}
        {variant === "select" && onSelect && (
          <Button
            className="w-full transition-all duration-200 hover:opacity-90"
            size="sm"
            style={
              primaryColor
                ? {
                    backgroundColor: primaryColor,
                    color: "white",
                    borderColor: primaryColor,
                  }
                : undefined
            }
            onClick={() => onSelect(service)}
          >
            Book now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
