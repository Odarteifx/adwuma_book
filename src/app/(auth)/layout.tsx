import Link from "next/link";
import { Scissors } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden bg-primary/5 lg:flex lg:flex-col">
        <div className="p-10">
          <Link href="/" className="flex items-center gap-2 text-lg font-medium">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Scissors className="h-4 w-4" />
            </div>
            Adwuma Book
          </Link>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
