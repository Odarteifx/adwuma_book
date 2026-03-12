"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogOut, Menu, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

interface DashboardHeaderProps {
  userEmail: string;
  userName: string;
  oauthAvatarUrl?: string | null;
  gravatarUrl?: string;
  businessSlug?: string;
}

export function DashboardHeader({
  userEmail,
  userName,
  oauthAvatarUrl,
  gravatarUrl,
  businessSlug,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [gravatarFailed, setGravatarFailed] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const resolvedAvatarUrl = oauthAvatarUrl || (!gravatarFailed ? gravatarUrl : undefined);

  return (
    <header className="sticky top-0 z-30 flex h-14 min-h-[52px] items-center gap-2 border-b bg-background px-3 sm:gap-4 sm:px-6 md:h-16">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="border-b px-4 py-4">
            <h2 className="text-lg font-bold text-primary">Adwuma Book</h2>
          </div>
          <SidebarNav />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      {businessSlug && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-9 min-h-[44px] shrink-0 px-3 sm:min-h-9 sm:px-4" asChild>
            <a
              href={`/b/${businessSlug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5 sm:mr-2" />
              <span className="hidden sm:inline">View Booking Page</span>
            </a>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8"
            onClick={async () => {
              const url = `${window.location.origin}/b/${businessSlug}`;
              await navigator.clipboard.writeText(url);
              toast.success("Booking link copied to clipboard");
            }}
            aria-label="Copy booking link"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <ThemeSwitcher />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              {resolvedAvatarUrl && (
                <AvatarImage
                  src={resolvedAvatarUrl}
                  alt={userName}
                  onError={() => setGravatarFailed(true)}
                />
              )}
              <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <Avatar className="h-8 w-8">
              {resolvedAvatarUrl && (
                <AvatarImage
                  src={resolvedAvatarUrl}
                  alt={userName}
                  onError={() => setGravatarFailed(true)}
                />
              )}
              <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
