/* eslint-disable react-refresh/only-export-components */
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-[13px] font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "border-primary/40 bg-primary text-primary-foreground shadow-xs shadow-primary/25 hover:bg-primary/90 hover:border-primary/60",
        outline:
          "border-border bg-card/60 text-foreground shadow-xs hover:bg-muted/60 hover:text-foreground hover:border-zinc-700/80 aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "border-border/80 bg-secondary text-secondary-foreground shadow-xs hover:bg-muted/70 hover:border-border aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted/60 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive shadow-xs hover:bg-destructive/25 hover:border-destructive/50 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-md px-2.5 text-[12px] [&_svg:not([class*='size-'])]:size-3",
        lg: "h-9 gap-2 px-4 text-sm rounded-md",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9 rounded-md",
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
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
