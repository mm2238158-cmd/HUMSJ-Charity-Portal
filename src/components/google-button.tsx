import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  label?: string;
}

export const GoogleButton = forwardRef<HTMLButtonElement, GoogleButtonProps>(
  ({ className, loading, label = "Continue with Google", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.12 2.73-2.39 3.58v2.97h3.86c2.26-2.09 3.58-5.17 3.58-8.79z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.86-2.97c-1.07.72-2.44 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.07C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.3c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.63H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.78 1.29 5.37l3.98-3.07z"
            />
            <path
              fill="#EA4335"
              d="M12 4.74c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.98 3.07C6.22 6.85 8.87 4.74 12 4.74z"
            />
          </svg>
        )}
        <span>{label}</span>
      </button>
    );
  },
);
GoogleButton.displayName = "GoogleButton";
