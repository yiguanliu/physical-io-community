"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importMembersAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ImportMembersForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <form
      className="admin-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        start(async () => {
          const output = await importMembersAction(form);
          setResult(`Imported ${output.created} new, updated ${output.updated}. ${output.parseErrors.length + output.rejected.length} rejected.`);
          router.refresh();
        });
      }}
    >
      <Input type="file" name="file" accept=".csv,text/csv" required />
      <Button className="admin-secondary" variant="outline" type="submit" disabled={pending}>
        {pending ? "Importing…" : "Import CSV"}
      </Button>
      {result ? <small>{result}</small> : null}
    </form>
  );
}
