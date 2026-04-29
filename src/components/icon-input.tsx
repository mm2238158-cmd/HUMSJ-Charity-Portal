import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconInputProps extends React.ComponentProps<"input"> {
  leadingIcon?: LucideIcon;
}

const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
  ({ className, leadingIcon: Icon, type, ...props }, ref) => {
    return (
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "flex h-11 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-base shadow-sm transition-colors",
            "placeholder:text-muted-foreground/70",
            "hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            Icon && "pl-10",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
IconInput.displayName = "IconInput";

export { IconInput };
