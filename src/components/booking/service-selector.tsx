"use client";

import type { Service } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";

interface Props {
  services: Service[];
  onSelect: (service: Service) => void;
}

export function ServiceSelector({ services, onSelect }: Props) {
  if (services.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No services available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Choose a service</h2>
      <div className="grid gap-3">
        {services.map((service) => {
          const deposit =
            service.deposit_type === "percentage"
              ? (Number(service.price) * Number(service.deposit_value)) / 100
              : Number(service.deposit_value);

          return (
            <Card
              key={service.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => onSelect(service)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium">{service.name}</h3>
                  {service.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                      {service.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="font-semibold">
                      GHS {Number(service.price).toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {service.duration_minutes} min
                    </span>
                    <span className="text-muted-foreground">
                      Deposit: GHS {deposit.toFixed(2)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
