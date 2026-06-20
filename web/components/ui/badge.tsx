import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-3 py-0.5 text-xs font-bold whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground border-2 border-[#1b6438]",
        secondary:   "bg-white text-foreground border-2 border-black/10 shadow-[0_2px_0_rgba(0,0,0,0.08)]",
        destructive: "bg-red-100 text-red-700 border-2 border-red-300",
        outline:     "border-2 border-border text-foreground bg-white",
        ghost:       "text-muted-foreground bg-background",
        link:        "text-primary underline-offset-4 hover:underline",
        success:     "bg-emerald-100 text-emerald-700 border-2 border-emerald-300",
        warning:     "bg-amber-100 text-amber-700 border-2 border-amber-300",
        info:        "bg-sky-100 text-sky-700 border-2 border-sky-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
