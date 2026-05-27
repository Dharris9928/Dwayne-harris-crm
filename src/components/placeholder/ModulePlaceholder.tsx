import { Construction } from "lucide-react";

type Props = {
  title: string;
  description: string;
};

export function ModulePlaceholder({ title, description }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border border-dashed border-emerald-800/40 bg-emerald-950/5 p-12 text-center">
        <Construction className="mx-auto h-10 w-10 text-emerald-700" />
        <p className="mt-4 font-mono text-sm font-semibold text-foreground">Module scaffolded</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Full functionality is being built out module-by-module to mirror the reference CRM.
        </p>
      </div>
    </div>
  );
}
