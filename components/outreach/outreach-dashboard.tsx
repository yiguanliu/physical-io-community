"use client";

import { type CSSProperties, type DragEvent, useMemo, useState, useTransition } from "react";
import {
  AtSign,
  Building2,
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/outreach/ui/alert";
import { Badge } from "@/components/outreach/ui/badge";
import { Button } from "@/components/outreach/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/outreach/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/outreach/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/outreach/ui/dropdown-menu";
import { Input } from "@/components/outreach/ui/input";
import { Label } from "@/components/outreach/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/outreach/ui/select";
import { Separator } from "@/components/outreach/ui/separator";
import { Skeleton } from "@/components/outreach/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/outreach/ui/tabs";
import { Textarea } from "@/components/outreach/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/outreach/ui/tooltip";
import { cn } from "@/lib/outreach/utils";
import {
  industryCategories,
  outreachStages,
  outreachTypes,
  type OutreachStageValue,
  type OutreachTypeValue,
  typeLabel,
} from "@/lib/outreach/outreach-config";

type Company = {
  id: string;
  name: string;
  industryCategory: string;
  website?: string | null;
  linkedinUrl?: string | null;
};

type Message = {
  id: string;
  type: OutreachTypeValue;
  tone: string;
  subject?: string | null;
  body: string;
  createdAt: string;
};

type Lead = {
  id: string;
  linkedinUrl: string;
  fullName?: string | null;
  title?: string | null;
  location?: string | null;
  category: string;
  industryCategory: string;
  stage: OutreachStageValue;
  priority: number;
  notes?: string | null;
  updatedAt: string;
  company?: Company | null;
  messages: Message[];
};

type Template = {
  id: string;
  type: OutreachTypeValue;
  label: string;
  prompt: string;
  context: string;
  isDefault: boolean;
};

type MemoryDocument = {
  id: string;
  title: string;
  sourceName?: string | null;
  content: string;
  summary?: string | null;
  tags: string[];
  isActive: boolean;
};

type SenderPersona = {
  id: string;
  fullName: string;
  roleTitle: string;
  organization: string;
  linkedinUrl?: string | null;
  email?: string | null;
  introduction: string;
  personaDetails: string;
  personalConnectionGuidance: string;
  isDefault: boolean;
  isActive: boolean;
};

type DashboardProps = {
  dbReady: boolean;
  error: string | null;
  initialLeads: Lead[];
  templates: Template[];
  memoryDocuments: MemoryDocument[];
  senderPersonas: SenderPersona[];
};

const priorityLabels: Record<number, string> = {
  1: "High",
  2: "Normal",
  3: "Low",
};

const outputLengthOptions = [
  { value: "concise", label: "Concise" },
  { value: "medium", label: "Medium" },
  { value: "detailed", label: "Detailed" },
] as const;

type OutputLength = (typeof outputLengthOptions)[number]["value"];

function upsertLead(leads: Lead[], nextLead: Lead) {
  const existing = leads.findIndex((lead) => lead.id === nextLead.id);

  if (existing === -1) {
    return [nextLead, ...leads];
  }

  return leads.map((lead) => (lead.id === nextLead.id ? nextLead : lead));
}

function upsertSenderPersona(senderPersonas: SenderPersona[], nextSenderPersona: SenderPersona) {
  const existing = senderPersonas.findIndex((senderPersona) => senderPersona.id === nextSenderPersona.id);
  const next = existing === -1
    ? [nextSenderPersona, ...senderPersonas]
    : senderPersonas.map((senderPersona) =>
        senderPersona.id === nextSenderPersona.id ? nextSenderPersona : senderPersona,
      );

  return next
    .map((senderPersona) =>
      nextSenderPersona.isDefault && senderPersona.id !== nextSenderPersona.id
        ? { ...senderPersona, isDefault: false }
        : senderPersona,
    )
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

function templatePayload(formData: FormData) {
  return {
    type: String(formData.get("type") ?? "EVENT_INVITATION"),
    label: String(formData.get("label") ?? ""),
    prompt: String(formData.get("prompt") ?? ""),
    context: String(formData.get("context") ?? ""),
  };
}

function senderPersonaPayload(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? ""),
    roleTitle: String(formData.get("roleTitle") ?? ""),
    organization: String(formData.get("organization") ?? "Physical.IO"),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    email: String(formData.get("email") ?? ""),
    introduction: String(formData.get("introduction") ?? ""),
    personaDetails: String(formData.get("personaDetails") ?? ""),
    personalConnectionGuidance: String(formData.get("personalConnectionGuidance") ?? ""),
    isDefault: String(formData.get("isDefault") ?? "false") === "true",
    isActive: String(formData.get("isActive") ?? "true") === "true",
  };
}

function inferredNameFromLinkedInUrl(linkedinUrl: string) {
  const slug = linkedinUrl.split("/in/")[1]?.split(/[/?#]/)[0];

  if (!slug) {
    return "";
  }

  return slug
    .replace(/-\d+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function OutreachDashboard({
  dbReady,
  error,
  initialLeads,
  templates: initialTemplates,
  memoryDocuments: initialMemoryDocuments,
  senderPersonas: initialSenderPersonas,
}: DashboardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [templates, setTemplates] = useState(initialTemplates);
  const [memoryDocuments, setMemoryDocuments] = useState(initialMemoryDocuments);
  const [senderPersonas, setSenderPersonas] = useState(initialSenderPersonas);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedMemoryDocument, setSelectedMemoryDocument] = useState<MemoryDocument | null>(null);
  const [draft, setDraft] = useState<Message | null>(null);
  const [draftType, setDraftType] = useState<OutreachTypeValue>("EVENT_INVITATION");
  const [draftTemplateId, setDraftTemplateId] = useState(initialTemplates[0]?.id ?? "");
  const [draftContextByLead, setDraftContextByLead] = useState<Record<string, string>>({});
  const [draftMemoryByLead, setDraftMemoryByLead] = useState<Record<string, string[]>>({});
  const [draftSenderByLead, setDraftSenderByLead] = useState<Record<string, string | null>>({});
  const [outputLength, setOutputLength] = useState<OutputLength>("medium");
  const [tone, setTone] = useState("warm");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [isSavingSender, setIsSavingSender] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDbPromptDismissed, setIsDbPromptDismissed] = useState(false);

  const stats = useMemo(() => {
    const sent = leads.filter((lead) => lead.stage === "SENT" || lead.stage === "FOLLOW_UP").length;
    const active = leads.filter((lead) => lead.stage !== "CLOSED").length;
    const meetings = leads.filter((lead) => lead.stage === "MEETING_BOOKED").length;

    return { total: leads.length, active, sent, meetings };
  }, [leads]);

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === draftTemplateId) ?? templates[0] ?? null;
  }, [draftTemplateId, templates]);

  const draftCustomContext = selectedLead ? (draftContextByLead[selectedLead.id] ?? "") : "";
  const attachedMemoryIds = useMemo(
    () => (selectedLead ? (draftMemoryByLead[selectedLead.id] ?? []) : []),
    [draftMemoryByLead, selectedLead],
  );
  const attachedMemoryDocuments = useMemo(() => {
    const attached = new Set(attachedMemoryIds);
    return memoryDocuments.filter((document) => attached.has(document.id));
  }, [attachedMemoryIds, memoryDocuments]);
  const selectedSenderPersonaId = selectedLead ? (draftSenderByLead[selectedLead.id] ?? null) : null;
  const selectedSenderPersona = useMemo(() => {
    return senderPersonas.find((senderPersona) => senderPersona.id === selectedSenderPersonaId) ?? null;
  }, [selectedSenderPersonaId, senderPersonas]);
  const outputLengthIndex = Math.max(
    0,
    outputLengthOptions.findIndex((option) => option.value === outputLength),
  );
  const outputLengthProgress = `${(outputLengthIndex / (outputLengthOptions.length - 1)) * 100}%`;

  async function refreshLeads() {
    startTransition(async () => {
      const response = await fetch("/api/outreach/leads", { cache: "no-store" });
      if (!response.ok) {
        setStatusMessage("Could not refresh leads.");
        return;
      }

      const data = (await response.json()) as { leads: Lead[] };
      setLeads(data.leads);
      setStatusMessage("Leads refreshed.");
    });
  }

  async function createLead(formData: FormData) {
    setIsSavingLead(true);
    setStatusMessage(null);

    const payload = {
      linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      title: String(formData.get("title") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      industryCategory: String(formData.get("industryCategory") ?? "Physical AI"),
      category: String(formData.get("category") ?? "Prospect"),
      location: String(formData.get("location") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      priority: Number(formData.get("priority") ?? 2),
    };

    const response = await fetch("/api/outreach/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSavingLead(false);

    if (!response.ok) {
      setStatusMessage("Lead could not be saved. Check the LinkedIn URL and database connection.");
      return;
    }

    const data = (await response.json()) as { lead: Lead };
    setLeads((current) => upsertLead(current, data.lead));
    setIsLeadDialogOpen(false);
    setStatusMessage("Lead saved.");
  }

  async function editLead(formData: FormData) {
    if (!editingLead) {
      return;
    }

    setIsUpdatingLead(true);
    setStatusMessage(null);

    const payload = {
      linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      title: String(formData.get("title") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      industryCategory: String(formData.get("industryCategory") ?? "Physical AI"),
      category: String(formData.get("category") ?? "Prospect"),
      location: String(formData.get("location") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      priority: Number(formData.get("priority") ?? 2),
    };

    const response = await fetch(`/api/leads/${editingLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsUpdatingLead(false);

    if (!response.ok) {
      setStatusMessage("Lead could not be updated. Check the LinkedIn URL and required fields.");
      return;
    }

    const data = (await response.json()) as { lead: Lead };
    setLeads((current) => upsertLead(current, data.lead));
    setEditingLead(null);
    setStatusMessage("Lead updated.");
  }

  async function updateStage(leadId: string, stage: OutreachStageValue) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, stage } : lead)));

    const response = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });

    if (!response.ok) {
      setLeads(previous);
      setStatusMessage("Stage update failed.");
      return;
    }

    const data = (await response.json()) as { lead: Lead };
    setLeads((current) => upsertLead(current, data.lead));
  }

  async function generateDraft() {
    if (!selectedLead) {
      return;
    }

    setIsGenerating(true);
    setDraft(null);
    setCopied(false);

    const response = await fetch("/api/outreach/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: selectedLead.id,
        type: selectedTemplate?.type ?? draftType,
        templateId: selectedTemplate?.id,
        tone,
        outputLength,
        customContext: draftCustomContext,
        memoryDocumentIds: attachedMemoryIds,
        senderPersonaId: selectedSenderPersonaId,
      }),
    });

    setIsGenerating(false);

    if (!response.ok) {
      setStatusMessage("Draft generation failed.");
      return;
    }

    const data = (await response.json()) as { message: Message; lead: Lead };
    setDraft(data.message);
    setLeads((current) => upsertLead(current, data.lead));
    setSelectedLead(data.lead);
  }

  async function copyDraft() {
    if (!draft) {
      return;
    }

    await navigator.clipboard.writeText(draft.body);
    setCopied(true);
  }

  function updateDraftCustomContext(value: string) {
    if (!selectedLead) {
      return;
    }

    setDraftContextByLead((current) => ({
      ...current,
      [selectedLead.id]: value,
    }));
  }

  function toggleDraftMemory(documentId: string, checked: boolean) {
    if (!selectedLead) {
      return;
    }

    setDraftMemoryByLead((current) => {
      const existing = current[selectedLead.id] ?? [];
      const next = checked
        ? Array.from(new Set([...existing, documentId]))
        : existing.filter((id) => id !== documentId);

      return {
        ...current,
        [selectedLead.id]: next,
      };
    });
  }

  function removeDraftMemory(documentId: string) {
    toggleDraftMemory(documentId, false);
  }

  function updateDraftSender(senderPersonaId: string | null) {
    if (!selectedLead) {
      return;
    }

    setDraftSenderByLead((current) => ({
      ...current,
      [selectedLead.id]: senderPersonaId,
    }));
  }

  async function saveTemplate(templateId: string, formData: FormData) {
    const payload = templatePayload(formData);
    const response = await fetch(`/api/templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setStatusMessage("Template could not be saved.");
      return;
    }

    const data = (await response.json()) as { template: Template };
    setTemplates((current) => current.map((template) => (template.id === templateId ? data.template : template)));
    setStatusMessage("Template saved.");
  }

  async function createTemplate(formData: FormData) {
    const payload = templatePayload(formData);
    const response = await fetch("/api/outreach/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setStatusMessage("Template could not be created.");
      return;
    }

    const data = (await response.json()) as { template: Template };
    setTemplates((current) => [data.template, ...current]);
    setDraftTemplateId(data.template.id);
    setStatusMessage("Template created.");
  }

  async function createSenderPersona(formData: FormData) {
    setIsSavingSender(true);
    setStatusMessage(null);

    const response = await fetch("/api/outreach/sender-personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(senderPersonaPayload(formData)),
    });

    setIsSavingSender(false);

    if (!response.ok) {
      setStatusMessage("Sender persona could not be created.");
      return;
    }

    const data = (await response.json()) as { senderPersona: SenderPersona };
    setSenderPersonas((current) => upsertSenderPersona(current, data.senderPersona));
    setStatusMessage("Sender persona created.");
  }

  async function saveSenderPersona(senderPersonaId: string, formData: FormData) {
    setIsSavingSender(true);
    setStatusMessage(null);

    const response = await fetch(`/api/sender-personas/${senderPersonaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(senderPersonaPayload(formData)),
    });

    setIsSavingSender(false);

    if (!response.ok) {
      setStatusMessage("Sender persona could not be saved.");
      return;
    }

    const data = (await response.json()) as { senderPersona: SenderPersona };
    setSenderPersonas((current) => upsertSenderPersona(current, data.senderPersona));
    setStatusMessage("Sender persona saved.");
  }

  async function uploadMemoryFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const created: MemoryDocument[] = [];

    for (const file of Array.from(files)) {
      const content = await file.text();
      const response = await fetch("/api/outreach/memory-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name.replace(/\.md$/i, ""),
          sourceName: file.name,
          content,
          tags: ["uploaded", "community"],
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { memoryDocument: MemoryDocument };
        created.push(data.memoryDocument);
      }
    }

    if (created.length) {
      setMemoryDocuments((current) => [...created, ...current]);
      setStatusMessage(`${created.length} memory document${created.length === 1 ? "" : "s"} uploaded.`);
    } else {
      setStatusMessage("No memory documents were uploaded.");
    }
  }

  async function openMemoryDocument(document: MemoryDocument) {
    setSelectedMemoryDocument(document);

    const response = await fetch(`/api/memory-documents/${document.id}`, { cache: "no-store" });

    if (!response.ok) {
      setStatusMessage("Memory document could not be opened.");
      return;
    }

    const data = (await response.json()) as { memoryDocument: MemoryDocument };
    setSelectedMemoryDocument(data.memoryDocument);
  }

  async function saveMemoryDocument(documentId: string, formData: FormData) {
    setIsSavingMemory(true);
    setStatusMessage(null);

    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await fetch(`/api/memory-documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        sourceName: String(formData.get("sourceName") ?? ""),
        content: String(formData.get("content") ?? ""),
        tags,
      }),
    });

    setIsSavingMemory(false);

    if (!response.ok) {
      setStatusMessage("Memory document could not be saved.");
      return;
    }

    const data = (await response.json()) as { memoryDocument: MemoryDocument };
    setMemoryDocuments((current) =>
      current.map((document) => (document.id === documentId ? data.memoryDocument : document)),
    );
    setSelectedMemoryDocument(data.memoryDocument);
    setStatusMessage("Memory document saved.");
  }

  return (
    <TooltipProvider>
      <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Physical.IO
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
              Outreach pipeline
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={refreshLeads} disabled={!dbReady || isPending}>
                  <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh leads</TooltipContent>
            </Tooltip>
            <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!dbReady}>
                  <Plus className="h-4 w-4" />
                  Add lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add LinkedIn lead</DialogTitle>
                  <DialogDescription>
                    Store the contact, company, industry category, and next outreach task.
                  </DialogDescription>
                </DialogHeader>
                <LeadForm isSaving={isSavingLead} submitLabel="Save lead" onSubmit={createLead} />
              </DialogContent>
            </Dialog>
            <Dialog
              open={Boolean(editingLead)}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingLead(null);
                }
              }}
            >
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit lead</DialogTitle>
                  <DialogDescription>Update contact, company, category, and outreach context.</DialogDescription>
                </DialogHeader>
                {editingLead ? (
                  <LeadForm
                    lead={editingLead}
                    isSaving={isUpdatingLead}
                    submitLabel="Save changes"
                    onSubmit={editLead}
                  />
                ) : null}
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total leads" value={stats.total} />
          <Metric label="Active" value={stats.active} />
          <Metric label="Sent or follow-up" value={stats.sent} />
          <Metric label="Meetings" value={stats.meetings} />
        </section>

        <Tabs defaultValue="board" className="flex flex-col gap-5">
          <TabsList className="w-fit">
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
          </TabsList>

          <TabsContent
            value="board"
            className="relative left-1/2 mt-0 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8"
          >
            <KanbanBoard
              leads={leads}
              onDraft={setSelectedLead}
              onEdit={setEditingLead}
              onStageChange={updateStage}
            />
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <ContactsTable
              leads={leads}
              onDraft={setSelectedLead}
              onEdit={setEditingLead}
              onStageChange={updateStage}
            />
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <TemplateWorkspace
              templates={templates}
              memoryDocuments={memoryDocuments}
              onCreateTemplate={createTemplate}
              onSaveTemplate={saveTemplate}
              onUploadMemory={uploadMemoryFiles}
              onOpenMemory={openMemoryDocument}
            />
          </TabsContent>

          <TabsContent value="memory" className="mt-0">
            <div className="mx-auto max-w-4xl">
              <MemoryPanel
                memoryDocuments={memoryDocuments}
                onUploadMemory={uploadMemoryFiles}
                onOpenMemory={openMemoryDocument}
                uploadId="memory-upload-main"
              />
            </div>
          </TabsContent>

          <TabsContent value="people" className="mt-0">
            <PeopleAdminPanel
              senderPersonas={senderPersonas}
              isSaving={isSavingSender}
              onCreateSender={createSenderPersona}
              onSaveSender={saveSenderPersona}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLead(null);
            setDraft(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="pr-10">
            <DialogTitle>Draft LinkedIn message</DialogTitle>
            <DialogDescription className="truncate">
              {selectedLead?.fullName ?? "Lead"} · {selectedLead?.company?.name ?? "No company"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label>Template</Label>
            <Select
              value={selectedTemplate?.id ?? ""}
              onValueChange={(value) => {
                setDraftTemplateId(value);
                const template = templates.find((item) => item.id === value);
                if (template) {
                  setDraftType(template.type);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="community">Community</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="outputLength">Response output</Label>
              <Badge variant="secondary">
                {outputLengthOptions.find((option) => option.value === outputLength)?.label ?? "Medium"}
              </Badge>
            </div>
            <Input
              id="outputLength"
              type="range"
              className="theme-range"
              min={0}
              max={outputLengthOptions.length - 1}
              step={1}
              value={outputLengthIndex}
              style={{ "--range-progress": outputLengthProgress } as CSSProperties}
              onChange={(event) => {
                const next = outputLengthOptions[Number(event.target.value)] ?? outputLengthOptions[1];
                setOutputLength(next.value);
              }}
              aria-label="Response output length"
            />
            <div className="grid grid-cols-3 text-xs text-muted-foreground">
              {outputLengthOptions.map((option) => (
                <span
                  key={option.value}
                  className={cn(
                    option.value === "medium" && "text-center",
                    option.value === "detailed" && "text-right",
                    option.value === outputLength && "font-medium text-foreground",
                  )}
                >
                  {option.label}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="draftCustomContext">Custom information</Label>
            <Textarea
              id="draftCustomContext"
              className="min-h-28 resize-y"
              placeholder="Add anything this draft should use: where you met, event name, specific ask, timing, shared context..."
              value={draftCustomContext}
              onChange={(event) => updateDraftCustomContext(event.target.value)}
            />
          </div>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Sender persona</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    <AtSign className="h-4 w-4" />
                    sender
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <DropdownMenuLabel>Attach who is writing</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={!selectedSenderPersonaId}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateDraftSender(null);
                      }
                    }}
                  >
                    <span className="min-w-0 truncate">Physical.IO official team fallback</span>
                  </DropdownMenuCheckboxItem>
                  {senderPersonas.map((senderPersona) => (
                    <DropdownMenuCheckboxItem
                      key={senderPersona.id}
                      checked={selectedSenderPersonaId === senderPersona.id}
                      disabled={!senderPersona.isActive}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateDraftSender(senderPersona.id);
                        }
                      }}
                    >
                      <span className="min-w-0 truncate">
                        {senderPersona.fullName}
                        {senderPersona.isDefault ? " · default" : ""}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                  {!senderPersonas.length ? (
                    <DropdownMenuLabel>No sender personas yet</DropdownMenuLabel>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {selectedSenderPersona ? (
              <div className="grid gap-2 rounded-lg border p-3">
                <Badge variant="secondary" className="w-fit max-w-full gap-1.5">
                  <AtSign className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {selectedSenderPersona.fullName} · {selectedSenderPersona.roleTitle}
                  </span>
                  <button
                    type="button"
                    className="ml-1 rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => updateDraftSender(null)}
                    aria-label={`Remove ${selectedSenderPersona.fullName}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
                <p className="line-clamp-3 text-xs text-muted-foreground">{selectedSenderPersona.introduction}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Attach `@sender` when the draft should use a named person&apos;s introduction. Without it, the draft uses the Physical.IO official team tone.
              </p>
            )}
          </div>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Memory attachments</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    <AtSign className="h-4 w-4" />
                    memory
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <DropdownMenuLabel>Attach source of truth</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {memoryDocuments.map((document) => (
                    <DropdownMenuCheckboxItem
                      key={document.id}
                      checked={attachedMemoryIds.includes(document.id)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) => toggleDraftMemory(document.id, checked === true)}
                    >
                      <span className="min-w-0 truncate">{document.title}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                  {!memoryDocuments.length ? (
                    <DropdownMenuLabel>No memory docs yet</DropdownMenuLabel>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {attachedMemoryDocuments.length ? (
              <div className="flex flex-wrap gap-2">
                {attachedMemoryDocuments.map((document) => (
                  <Badge key={document.id} variant="secondary" className="max-w-full gap-1.5">
                    <AtSign className="h-3 w-3 shrink-0" />
                    <span className="truncate">{document.title}</span>
                    <button
                      type="button"
                      className="ml-1 rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => removeDraftMemory(document.id)}
                      aria-label={`Remove ${document.title}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Attach `@memory` docs when the draft should use specific memory as source of truth.
              </p>
            )}
          </div>
          <Button className="w-full" onClick={generateDraft} disabled={isGenerating || !selectedLead}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {draft ? "Regenerate draft" : "Generate draft"}
          </Button>
          <Separator />
          {isGenerating ? (
            <div className="grid gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : null}
          {draft ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">{typeLabel(draft.type)}</Badge>
                <Button size="sm" variant="outline" onClick={copyDraft}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <Textarea className="min-h-72 resize-none font-mono text-sm" readOnly value={draft.body} />
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => selectedLead && updateStage(selectedLead.id, "SENT")}
              >
                <Send className="h-4 w-4" />
                Mark sent
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedMemoryDocument)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMemoryDocument(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader className="pr-10">
            <DialogTitle>Memory document</DialogTitle>
            <DialogDescription className="truncate">
              {selectedMemoryDocument?.sourceName ?? selectedMemoryDocument?.title ?? "Community memory"}
            </DialogDescription>
          </DialogHeader>
          {selectedMemoryDocument ? (
            <MemoryDocumentForm
              document={selectedMemoryDocument}
              isSaving={isSavingMemory}
              onSubmit={(formData) => saveMemoryDocument(selectedMemoryDocument.id, formData)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {statusMessage || (!dbReady && !isDbPromptDismissed) ? (
        <div className="fixed right-4 bottom-4 z-50 flex w-[calc(100vw-2rem)] max-w-md flex-col gap-3">
          {!dbReady && !isDbPromptDismissed ? (
            <Alert className="pr-12 shadow-lg">
              <Building2 className="h-4 w-4" />
              <AlertTitle>PostgreSQL is not connected</AlertTitle>
              <AlertDescription>
                {error} Start Postgres, configure `DATABASE_URL`, then run `npm run db:migrate` and
                `npm run db:seed`.
              </AlertDescription>
              <AlertAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Close PostgreSQL connection prompt"
                  onClick={() => setIsDbPromptDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertAction>
            </Alert>
          ) : null}

          {statusMessage ? (
            <Alert className="pr-12 shadow-lg" role="status">
              <MessageSquare className="h-4 w-4" />
              <AlertTitle>{statusMessage}</AlertTitle>
              <AlertAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Close status prompt"
                  onClick={() => setStatusMessage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertAction>
            </Alert>
          ) : null}
        </div>
      ) : null}
      </main>
    </TooltipProvider>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function LeadForm({
  lead,
  isSaving,
  submitLabel,
  onSubmit,
}: {
  lead?: Lead;
  isSaving: boolean;
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
}) {
  const [linkedinUrl, setLinkedinUrl] = useState(lead?.linkedinUrl ?? "");
  const [fullName, setFullName] = useState(lead?.fullName ?? "");
  const [title, setTitle] = useState(lead?.title ?? "");
  const [companyName, setCompanyName] = useState(lead?.company?.name ?? "");
  const [location, setLocation] = useState(lead?.location ?? "");
  const [industryCategory, setIndustryCategory] = useState(lead?.industryCategory ?? "Physical AI");
  const [category, setCategory] = useState(lead?.category ?? "Prospect");
  const [priority, setPriority] = useState(String(lead?.priority ?? 2));
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [profileText, setProfileText] = useState("");
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillMessage, setAutofillMessage] = useState<string | null>(null);

  async function autofillFromLinkedInUrl() {
    if (!linkedinUrl) {
      return;
    }

    setIsAutofilling(true);
    setAutofillMessage(null);

    const response = await fetch("/api/outreach/leads/autofill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkedinUrl, profileText }),
    });

    setIsAutofilling(false);

    if (!response.ok) {
      const inferredName = inferredNameFromLinkedInUrl(linkedinUrl);
      if (inferredName) {
        setFullName((current) => current || inferredName);
      }
      setAutofillMessage("Autofill failed. Filled name from URL only.");
      return;
    }

    const data = (await response.json()) as {
      autofill: {
        fullName: string;
        title: string;
        companyName: string;
        location: string;
        industryCategory: string;
        category: string;
        notes: string;
        priority: number;
      };
      message?: string;
    };
    const autofill = data.autofill;

    setFullName((current) => autofill.fullName || current);
    setTitle((current) => autofill.title || current);
    setCompanyName((current) => autofill.companyName || current);
    setLocation((current) => autofill.location || current);
    setIndustryCategory(autofill.industryCategory || "Physical AI");
    setCategory((current) => autofill.category || current);
    setNotes((current) => autofill.notes || current);
    setPriority(String(autofill.priority || 2));
    setAutofillMessage(data.message ?? "Autofill complete.");
  }

  function autofillNameFromBlur() {
    const inferredName = inferredNameFromLinkedInUrl(linkedinUrl);

    if (inferredName) {
      setFullName((current) => current || inferredName);
    }
  }

  return (
    <form key={lead?.id ?? "new"} action={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            placeholder="https://www.linkedin.com/in/..."
            value={linkedinUrl}
            onBlur={autofillNameFromBlur}
            onChange={(event) => setLinkedinUrl(event.target.value)}
            required
          />
          <Button type="button" variant="outline" onClick={autofillFromLinkedInUrl} disabled={isAutofilling}>
            {isAutofilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Autofill
          </Button>
        </div>
        <Textarea
          className="min-h-24"
          placeholder="Optional: paste copied LinkedIn profile text here to autofill title, company, location, category, notes, and priority."
          value={profileText}
          onChange={(event) => setProfileText(event.target.value)}
        />
        {autofillMessage ? <p className="text-xs text-muted-foreground">{autofillMessage}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="fullName">Name</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="Optional"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Founder, Researcher..."
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="companyName">Company</Label>
          <Input
            id="companyName"
            name="companyName"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Company or institution"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="London, SF..."
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label>Industry</Label>
          <Select name="industryCategory" value={industryCategory} onValueChange={setIndustryCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {industryCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Lead category</Label>
          <Input
            id="category"
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Priority</Label>
          <Select name="priority" value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">High</SelectItem>
              <SelectItem value="2">Normal</SelectItem>
              <SelectItem value="3">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Context</Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Why this person is relevant, event fit, mutual context..."
        />
      </div>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : lead ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {submitLabel}
      </Button>
    </form>
  );
}

function KanbanBoard({
  leads,
  onDraft,
  onEdit,
  onStageChange,
}: {
  leads: Lead[];
  onDraft: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onStageChange: (leadId: string, stage: OutreachStageValue) => void;
}) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<OutreachStageValue | null>(null);

  function dropLead(stage: OutreachStageValue, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("text/plain") || draggedLeadId;
    setDraggedLeadId(null);
    setDragOverStage(null);

    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.stage === stage) {
      return;
    }

    onStageChange(lead.id, stage);
  }

  return (
    <div className="kanban-scrollbar overflow-x-auto rounded-lg border bg-muted/10">
      <div className="grid min-h-[560px] w-full min-w-[2360px] grid-cols-[repeat(7,minmax(320px,1fr))] gap-5 p-4">
        {outreachStages.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.stage === stage.value);

          return (
            <section
              key={stage.value}
              className={cn(
                "min-w-0 rounded-lg border bg-background/70 p-3 transition-colors",
                dragOverStage === stage.value && "border-primary/60 bg-primary/5",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverStage(stage.value);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDragOverStage(null);
                }
              }}
              onDrop={(event) => dropLead(stage.value, event)}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium">{stage.label}</h2>
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                </div>
                <Badge className="shrink-0" variant="secondary">
                  {stageLeads.length}
                </Badge>
              </div>
              <div className="grid gap-3">
                {stageLeads.length ? (
                  stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isDragging={draggedLeadId === lead.id}
                      onDragStart={setDraggedLeadId}
                      onDragEnd={() => {
                        setDraggedLeadId(null);
                        setDragOverStage(null);
                      }}
                      onDraft={onDraft}
                      onEdit={onEdit}
                      onStageChange={onStageChange}
                    />
                  ))
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No leads</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  isDragging,
  onDragStart,
  onDragEnd,
  onDraft,
  onEdit,
  onStageChange,
}: {
  lead: Lead;
  isDragging: boolean;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDraft: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onStageChange: (leadId: string, stage: OutreachStageValue) => void;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-lg transition-opacity",
        isDragging ? "cursor-grabbing opacity-60" : "cursor-grab",
      )}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", lead.id);
        onDragStart(lead.id);
      }}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge className="max-w-[190px] truncate" variant="outline">
            {lead.industryCategory}
          </Badge>
          <Badge className="shrink-0" variant={lead.priority === 1 ? "default" : "secondary"}>
            {priorityLabels[lead.priority] ?? "Normal"}
          </Badge>
        </div>
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{lead.fullName || "Unnamed lead"}</CardTitle>
          <CardDescription
            className="truncate"
            title={`${lead.title || "No title"} · ${lead.company?.name || "No company"}`}
          >
            {lead.title || "No title"} · {lead.company?.name || "No company"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge className="max-w-full truncate" variant="outline">
            {lead.category}
          </Badge>
        </div>
        {lead.notes ? <p className="line-clamp-3 text-sm text-muted-foreground">{lead.notes}</p> : null}
        <div className="grid gap-2">
          <Select value={lead.stage} onValueChange={(value) => onStageChange(lead.id, value as OutreachStageValue)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {outreachStages.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full" size="sm" variant="outline" onClick={() => onEdit(lead)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button className="w-full" size="sm" variant="outline" onClick={() => onDraft(lead)}>
              <Sparkles className="h-4 w-4" />
              Draft
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactsTable({
  leads,
  onDraft,
  onEdit,
  onStageChange,
}: {
  leads: Lead[];
  onDraft: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onStageChange: (leadId: string, stage: OutreachStageValue) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="grid min-w-[940px] grid-cols-[1.4fr_1fr_1fr_1fr_220px] border-b bg-muted/30 px-4 py-3 text-sm font-medium">
        <span>Lead</span>
        <span>Company</span>
        <span>Industry</span>
        <span>Stage</span>
        <span>Action</span>
      </div>
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="grid min-w-[940px] grid-cols-[1.4fr_1fr_1fr_1fr_220px] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{lead.fullName || "Unnamed lead"}</p>
            <a className="truncate text-muted-foreground hover:text-foreground" href={lead.linkedinUrl} target="_blank">
              LinkedIn profile
            </a>
          </div>
          <span className="truncate text-muted-foreground">{lead.company?.name || "No company"}</span>
          <span className="truncate text-muted-foreground">{lead.industryCategory}</span>
          <Select value={lead.stage} onValueChange={(value) => onStageChange(lead.id, value as OutreachStageValue)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {outreachStages.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full" size="sm" variant="outline" onClick={() => onEdit(lead)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button className="w-full" size="sm" variant="outline" onClick={() => onDraft(lead)}>
              <Sparkles className="h-4 w-4" />
              Draft
            </Button>
          </div>
        </div>
      ))}
      {!leads.length ? <p className="p-6 text-sm text-muted-foreground">No leads yet.</p> : null}
    </div>
  );
}

function TemplateWorkspace({
  templates,
  memoryDocuments,
  onCreateTemplate,
  onSaveTemplate,
  onUploadMemory,
  onOpenMemory,
}: {
  templates: Template[];
  memoryDocuments: MemoryDocument[];
  onCreateTemplate: (formData: FormData) => void;
  onSaveTemplate: (templateId: string, formData: FormData) => void;
  onUploadMemory: (files: FileList | null) => void;
  onOpenMemory: (document: MemoryDocument) => void;
}) {
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);

  async function handleCreateTemplate(formData: FormData) {
    await onCreateTemplate(formData);
    setIsCreateTemplateOpen(false);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section className="flex flex-col overflow-hidden rounded-lg border bg-card lg:h-[calc(100vh-13rem)] lg:min-h-[560px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Templates</h2>
            <p className="text-sm text-muted-foreground">Reusable outreach skills with specific context.</p>
          </div>
          <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Create new template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>New template</DialogTitle>
                <DialogDescription>Create reusable outreach skills with specific context.</DialogDescription>
              </DialogHeader>
              <TemplateForm submitLabel="Create template" onSubmit={handleCreateTemplate} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="truncate text-base">{template.label}</CardTitle>
                    {template.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                  </div>
                  <CardDescription>{typeLabel(template.type)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplateForm
                    template={template}
                    submitLabel="Save"
                    onSubmit={(formData) => onSaveTemplate(template.id, formData)}
                  />
                </CardContent>
              </Card>
            ))}
            {!templates.length ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Run the seed script to load templates.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <MemoryPanel
          memoryDocuments={memoryDocuments}
          onUploadMemory={onUploadMemory}
          uploadId="memory-upload-template"
          onOpenMemory={onOpenMemory}
        />
      </aside>
    </div>
  );
}

function MemoryPanel({
  memoryDocuments,
  onUploadMemory,
  onOpenMemory,
  uploadId,
}: {
  memoryDocuments: MemoryDocument[];
  onUploadMemory: (files: FileList | null) => void;
  onOpenMemory: (document: MemoryDocument) => void;
  uploadId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Memory
          </CardTitle>
          <Badge variant="secondary">{memoryDocuments.length} docs</Badge>
        </div>
        <CardDescription>Community documents used as context during message generation.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor={uploadId}>Upload Markdown</Label>
          <Input
            id={uploadId}
            type="file"
            accept=".md,text/markdown,text/plain"
            multiple
            onChange={(event) => onUploadMemory(event.currentTarget.files)}
          />
        </div>
        <div className="grid gap-3">
          {memoryDocuments.map((document) => (
            <button
              key={document.id}
              type="button"
              className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onOpenMemory(document)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{document.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {document.sourceName ?? "Manual memory"}
                  </p>
                </div>
                <Badge variant={document.isActive ? "secondary" : "outline"}>
                  {document.isActive ? "Active" : "Off"}
                </Badge>
              </div>
              {document.summary ? (
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{document.summary}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {document.tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </button>
          ))}
          {!memoryDocuments.length ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No memory documents yet.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MemoryDocumentForm({
  document,
  isSaving,
  onSubmit,
}: {
  document: MemoryDocument;
  isSaving: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form key={document.id} action={onSubmit} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <Label htmlFor={`memory-title-${document.id}`}>Title</Label>
          <Input id={`memory-title-${document.id}`} name="title" defaultValue={document.title} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`memory-source-${document.id}`}>Source</Label>
          <Input
            id={`memory-source-${document.id}`}
            name="sourceName"
            defaultValue={document.sourceName ?? ""}
            placeholder="Manual memory"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`memory-tags-${document.id}`}>Tags</Label>
        <Input
          id={`memory-tags-${document.id}`}
          name="tags"
          defaultValue={document.tags.join(", ")}
          placeholder="community, event, physical-ai"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`memory-content-${document.id}`}>Content</Label>
        <Textarea
          id={`memory-content-${document.id}`}
          name="content"
          defaultValue={document.content}
          className="min-h-[52vh] resize-y font-mono text-sm leading-6"
          required
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save memory
        </Button>
      </div>
    </form>
  );
}

function PeopleAdminPanel({
  senderPersonas,
  isSaving,
  onCreateSender,
  onSaveSender,
}: {
  senderPersonas: SenderPersona[];
  isSaving: boolean;
  onCreateSender: (formData: FormData) => void;
  onSaveSender: (senderPersonaId: string, formData: FormData) => void;
}) {
  const [isCreatePersonOpen, setIsCreatePersonOpen] = useState(false);

  async function handleCreateSender(formData: FormData) {
    await onCreateSender(formData);
    setIsCreatePersonOpen(false);
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-card lg:h-[calc(100vh-13rem)] lg:min-h-[560px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <UserRound className="h-4 w-4" />
            People
          </h2>
          <p className="text-sm text-muted-foreground">Sender profiles that can be attached with `@sender`.</p>
        </div>
        <Dialog open={isCreatePersonOpen} onOpenChange={setIsCreatePersonOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Create new person
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>New admin person</DialogTitle>
              <DialogDescription>Create a sender profile that can be attached with `@sender`.</DialogDescription>
            </DialogHeader>
            <SenderPersonaForm isSaving={isSaving} submitLabel="Create person" onSubmit={handleCreateSender} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid content-start gap-4 md:grid-cols-2">
          {senderPersonas.map((senderPersona) => (
            <Card key={senderPersona.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{senderPersona.fullName}</CardTitle>
                    <CardDescription className="truncate">
                      {senderPersona.roleTitle} · {senderPersona.organization}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {senderPersona.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                    {!senderPersona.isActive ? <Badge variant="outline">Off</Badge> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <SenderPersonaForm
                  senderPersona={senderPersona}
                  isSaving={isSaving}
                  submitLabel="Save person"
                  onSubmit={(formData) => onSaveSender(senderPersona.id, formData)}
                />
              </CardContent>
            </Card>
          ))}
          {!senderPersonas.length ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Run the seed script to load the default admin sender.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SenderPersonaForm({
  senderPersona,
  isSaving,
  submitLabel,
  onSubmit,
}: {
  senderPersona?: SenderPersona;
  isSaving: boolean;
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`sender-name-${senderPersona?.id ?? "new"}`}>Name</Label>
          <Input
            id={`sender-name-${senderPersona?.id ?? "new"}`}
            name="fullName"
            defaultValue={senderPersona?.fullName}
            placeholder="Yiguan Liu"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`sender-role-${senderPersona?.id ?? "new"}`}>Role</Label>
          <Input
            id={`sender-role-${senderPersona?.id ?? "new"}`}
            name="roleTitle"
            defaultValue={senderPersona?.roleTitle}
            placeholder="Physical.IO community lead"
            required
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`sender-org-${senderPersona?.id ?? "new"}`}>Organization</Label>
          <Input
            id={`sender-org-${senderPersona?.id ?? "new"}`}
            name="organization"
            defaultValue={senderPersona?.organization ?? "Physical.IO"}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`sender-linkedin-${senderPersona?.id ?? "new"}`}>LinkedIn</Label>
          <Input
            id={`sender-linkedin-${senderPersona?.id ?? "new"}`}
            name="linkedinUrl"
            defaultValue={senderPersona?.linkedinUrl ?? ""}
            placeholder="https://www.linkedin.com/in/..."
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`sender-email-${senderPersona?.id ?? "new"}`}>Email</Label>
        <Input
          id={`sender-email-${senderPersona?.id ?? "new"}`}
          name="email"
          type="email"
          defaultValue={senderPersona?.email ?? ""}
          placeholder="Optional"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`sender-intro-${senderPersona?.id ?? "new"}`}>Introduction</Label>
        <Textarea
          id={`sender-intro-${senderPersona?.id ?? "new"}`}
          name="introduction"
          defaultValue={senderPersona?.introduction}
          className="min-h-24"
          placeholder="Who is sending and why they are credible."
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`sender-persona-${senderPersona?.id ?? "new"}`}>Persona details</Label>
        <Textarea
          id={`sender-persona-${senderPersona?.id ?? "new"}`}
          name="personaDetails"
          defaultValue={senderPersona?.personaDetails}
          className="min-h-24"
          placeholder="Voice, relationship to Physical.IO, background, and preferred style."
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`sender-connection-${senderPersona?.id ?? "new"}`}>Personal connection guidance</Label>
        <Textarea
          id={`sender-connection-${senderPersona?.id ?? "new"}`}
          name="personalConnectionGuidance"
          defaultValue={senderPersona?.personalConnectionGuidance}
          className="min-h-24"
          placeholder="How to connect this sender to recipients without inventing facts."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Default sender</Label>
          <Select name="isDefault" defaultValue={senderPersona?.isDefault ? "true" : "false"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Default</SelectItem>
              <SelectItem value="false">Not default</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select name="isActive" defaultValue={senderPersona?.isActive === false ? "false" : "true"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Off</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" variant={senderPersona ? "outline" : "default"} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {submitLabel}
      </Button>
    </form>
  );
}

function TemplateForm({
  template,
  submitLabel,
  onSubmit,
}: {
  template?: Template;
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="grid gap-3">
      <div className="grid gap-2">
        <Label>Outreach type</Label>
        <Select name="type" defaultValue={template?.type ?? "EVENT_INVITATION"}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {outreachTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`label-${template?.id ?? "new"}`}>Label</Label>
        <Input id={`label-${template?.id ?? "new"}`} name="label" defaultValue={template?.label} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`prompt-${template?.id ?? "new"}`}>Prompt</Label>
        <Textarea
          id={`prompt-${template?.id ?? "new"}`}
          name="prompt"
          defaultValue={template?.prompt}
          className="min-h-24"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`context-${template?.id ?? "new"}`}>Context</Label>
        <Textarea
          id={`context-${template?.id ?? "new"}`}
          name="context"
          defaultValue={template?.context}
          className="min-h-24"
          placeholder="When to use this template, preferred ask, event context, sponsor angle..."
        />
      </div>
      <Button type="submit" variant={template ? "outline" : "default"}>
        {template ? <Save className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
        {submitLabel}
      </Button>
    </form>
  );
}
