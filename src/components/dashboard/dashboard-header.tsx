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
import { LogOut, Menu, ExternalLink } from "lucide-react";

interface DashboardHeaderProps {
  userEmail: string;
  userName: string;
  oauthAvatarUrl?: string | null;
  gravatarUrl?: string;
  avatarColor: string;
  businessSlug?: string;
}

export function DashboardHeader({
  userEmail,
  userName,
  oauthAvatarUrl,
  gravatarUrl,
  avatarColor,
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="border-b px-4 py-4">
            <h2 className="text-lg font-bold">Adwuma Book</h2>
          </div>
          <SidebarNav />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      {businessSlug && (
        <Button variant="outline" size="sm" asChild>
          <a
            href={`/b/${businessSlug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            View Booking Page
          </a>
        </Button>
      )}

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
              <AvatarFallback
                className="text-sm font-medium text-white"
                style={{ backgroundColor: avatarColor }}
              >
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
              <AvatarFallback
                className="text-xs font-medium text-white"
                style={{ backgroundColor: avatarColor }}
              >
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
