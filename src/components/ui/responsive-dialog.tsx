import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface ResponsiveDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  trigger?: React.ReactNode
}

export function ResponsiveDialog({ open, onOpenChange, children, trigger }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        {children}
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {children}
    </Dialog>
  )
}

interface ResponsiveDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function ResponsiveDialogContent({ children, className, ...props }: ResponsiveDialogContentProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <DrawerContent className={cn("h-[87vh] flex flex-col pb-safe w-full rounded-t-[10px]", className)} {...props}>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </DrawerContent>
    )
  }

  return (
    <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-y-auto", className)} {...props}>
      {children}
    </DialogContent>
  )
}

interface ResponsiveDialogHeaderProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveDialogHeader({ children, className }: ResponsiveDialogHeaderProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <DrawerHeader className={cn("px-0 pt-4 relative", className)}>
        {children}
        <DrawerClose className="absolute right-2 top-1 rounded-full h-8 w-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:pointer-events-none z-50">
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </DrawerClose>
      </DrawerHeader>
    )
  }

  return <DialogHeader className={className}>{children}</DialogHeader>
}

interface ResponsiveDialogTitleProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveDialogTitle({ children, className }: ResponsiveDialogTitleProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>
  }

  return <DialogTitle className={className}>{children}</DialogTitle>
}

interface ResponsiveDialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveDialogDescription({ children, className }: ResponsiveDialogDescriptionProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerDescription className={className}>{children}</DrawerDescription>
  }

  return <DialogDescription className={className}>{children}</DialogDescription>
}

interface ResponsiveDialogFooterProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveDialogFooter({ children, className }: ResponsiveDialogFooterProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 sticky bottom-0 bg-background pb-safe px-4", className)}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4", className)}>
      {children}
    </div>
  )
}

interface ResponsiveDialogCloseProps {
  children?: React.ReactNode
  className?: string
}

export function ResponsiveDialogClose({ children, className }: ResponsiveDialogCloseProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerClose className={className}>{children}</DrawerClose>
  }

  return <DialogClose className={className}>{children}</DialogClose>
}
