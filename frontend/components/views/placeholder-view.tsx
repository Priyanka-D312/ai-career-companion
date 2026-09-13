import type { LucideIcon } from "lucide-react"

type PlaceholderViewProps = {
  title: string
  description: string
  icon: LucideIcon
}

export function PlaceholderView({ title, description, icon: Icon }: PlaceholderViewProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          <Icon className="h-7 w-7 text-accent-foreground" />
        </span>
        <p className="mt-4 text-base font-medium text-foreground">Coming soon</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          This workspace is being prepared. Check back shortly to start working on your {title.toLowerCase()}.
        </p>
      </div>
    </div>
  )
}
