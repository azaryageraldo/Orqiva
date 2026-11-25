import { Construction, Table2 } from "lucide-react";

export default function Data() {
  return (
    <section className="min-h-[calc(100vh-3rem)] px-4 py-5 sm:px-6 lg:px-8 bg-background">
      <div className="w-full space-y-6">
        {/* Standard Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground font-heading">
                Data Table
              </h1>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25">
                In Development
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Spreadsheet-like tabular view of customer records and entity points.
            </p>
          </div>
        </div>

        {/* Development Notice Surface */}
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <Table2 className="size-6" strokeWidth={1.5} />
          </div>

          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
            <Construction className="size-3" strokeWidth={1.5} />
            <span>Currently in Development</span>
          </span>

          <h2 className="text-base font-semibold tracking-tight text-foreground font-heading">
            Spreadsheet Data Explorer
          </h2>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            This feature is currently under active development. Soon you will be able to
            browse, filter, edit, and export structured customer records synced with your
            Orqiva Datapoints in an Excel-style grid.
          </p>
        </div>
      </div>
    </section>
  );
}
