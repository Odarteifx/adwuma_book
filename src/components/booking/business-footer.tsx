import type { Business } from "@/types";
import { MapPin, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

interface Props {
  business: Business;
}

export function BusinessFooter({ business }: Props) {
  const primaryColor = business.primary_color || undefined;
  const hasSocial =
    business.facebook_url ||
    business.instagram_url ||
    business.twitter_url ||
    business.linkedin_url ||
    business.tiktok_url;

  return (
    <footer
      className="mt-auto border-t bg-card"
      style={
        primaryColor
          ? ({ "--footer-accent": primaryColor } as React.CSSProperties)
          : undefined
      }
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <div className="flex items-center gap-2">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <span className="font-medium">{business.name}</span>
            </div>
            {business.location && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {business.location}
              </p>
            )}
          </div>
          {hasSocial && (
            <div className="flex items-center gap-3">
              {business.facebook_url && (
                <a
                  href={business.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    primaryColor
                      ? "text-muted-foreground transition-colors hover:text-[var(--footer-accent)]"
                      : "text-muted-foreground transition-colors hover:text-foreground"
                  }
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {business.instagram_url && (
                <a
                  href={business.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    primaryColor
                      ? "text-muted-foreground transition-colors hover:text-[var(--footer-accent)]"
                      : "text-muted-foreground transition-colors hover:text-foreground"
                  }
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {business.twitter_url && (
                <a
                  href={business.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    primaryColor
                      ? "text-muted-foreground transition-colors hover:text-[var(--footer-accent)]"
                      : "text-muted-foreground transition-colors hover:text-foreground"
                  }
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {business.linkedin_url && (
                <a
                  href={business.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    primaryColor
                      ? "text-muted-foreground transition-colors hover:text-[var(--footer-accent)]"
                      : "text-muted-foreground transition-colors hover:text-foreground"
                  }
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {business.tiktok_url && (
                <a
                  href={business.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    primaryColor
                      ? "text-muted-foreground transition-colors hover:text-[var(--footer-accent)]"
                      : "text-muted-foreground transition-colors hover:text-foreground"
                  }
                  aria-label="TikTok"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground sm:mt-6">
          Powered by{" "}
          <Link
            href="/"
            className="underline-offset-2 hover:underline"
          >
            Adwuma Book
          </Link>
        </p>
      </div>
    </footer>
  );
}
