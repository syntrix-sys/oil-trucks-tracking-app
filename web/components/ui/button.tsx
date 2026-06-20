import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:     "text-primary-foreground clay-btn-primary",
        destructive: "text-white clay-btn-destructive",
        outline:     "text-foreground clay-btn",
        secondary:   "text-secondary-foreground clay-btn",
        ghost:       "text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors",
        link:        "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-4 py-1.5 has-[>svg]:px-3",
        xs:      "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm:      "h-7 gap-1 rounded-lg px-3 text-xs has-[>svg]:px-2.5",
        lg:      "h-10 rounded-xl px-6 has-[>svg]:px-5 text-sm",
        icon:    "size-8 rounded-xl",
        "icon-xs":  "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":  "size-7 rounded-lg",
        "icon-lg":  "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
