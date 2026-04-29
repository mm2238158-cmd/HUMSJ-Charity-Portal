import * as React from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  leadingIcon?: LucideIcon;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, leadingIcon: Icon, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
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
          type={show ? "text" : "password"}
          className={cn(
            "flex h-11 w-full rounded-lg border border-input bg-background/60 px-3 py-2 pr-11 text-base shadow-sm transition-colors",
            "placeholder:text-muted-foreground/70",
            "hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            Icon && "pl-10",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
