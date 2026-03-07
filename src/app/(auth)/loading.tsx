import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col items-center space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="mx-auto h-4 w-32" />
        <div className="grid gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <Skeleton className="mx-auto h-3 w-48" />
    </div>
  );
}
