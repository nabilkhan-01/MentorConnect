import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import DashboardLayout from "@/components/layout/dashboard-layout";

type Mentee = {
  id: number;
  name?: string;
  user?: { name?: string };
  usn?: string;
};

function formatDateTime(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [openFeedbackFor, setOpenFeedbackFor] = React.useState<number | null>(null);

  const { data: meetings } = useQuery({
    queryKey: ["/api/meetings"],
    queryFn: async () => {
      const r = await fetch("/api/meetings");
      if (!r.ok) throw new Error("Failed to load meetings");
      return r.json();
    },
  });

  const { data: mentees } = useQuery<Mentee[]>({
    queryKey: ["/api/mentor/mentees"],
    enabled: user?.role === "mentor",
    queryFn: async () => {
      const r = await fetch("/api/mentor/mentees");
      if (!r.ok) throw new Error("Failed to load mentees");
      return r.json();
    },
  });

  // Create meeting state
  const [form, setForm] = React.useState({
    title: "",
    type: "one_to_one",
    scheduledAt: "",
    durationMinutes: 60,
    location: "",
    description: "",
    menteeIds: [] as number[],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Failed to create meeting");
      return r.json();
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", type: "one_to_one", scheduledAt: "", durationMinutes: 60, location: "", description: "", menteeIds: [] });
      qc.invalidateQueries({ queryKey: ["/api/meetings"] });
    },
  });

  // Feedback state
  const [feedback, setFeedback] = React.useState<Record<number, { attended: boolean; stars?: number; remarks?: string }>>({});
  const feedbackMutation = useMutation({
    mutationFn: async ({ meetingId }: { meetingId: number }) => {
      const updates = Object.entries(feedback).map(([menteeId, v]) => ({ menteeId: Number(menteeId), attended: !!v.attended, stars: v.stars ?? null, remarks: v.remarks ?? null }));
      const r = await fetch(`/api/meetings/${meetingId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, complete: true }),
      });
      if (!r.ok) throw new Error("Failed to submit feedback");
      return r.json();
    },
    onSuccess: () => {
      setOpenFeedbackFor(null);
      setFeedback({});
      qc.invalidateQueries({ queryKey: ["/api/meetings"] });
    },
  });

  const canCreate = user?.role === "mentor";

  return (
    <DashboardLayout pageTitle="Meetings" pageDescription={user?.role === "mentor" ? "Create, view, and record feedback for your meetings." : user?.role === "mentee" ? "View your scheduled meetings and feedback." : undefined}>
      <div className="flex items-center justify-between mb-4">
        {canCreate && (
          <Button onClick={() => setOpen(true)}>Schedule Meeting</Button>
        )}
      </div>

      <div className="space-y-3">
        {(meetings || []).length === 0 && (
          <div className="bg-card rounded-md p-6 text-sm text-muted-foreground">No meetings yet.</div>
        )}
        {(meetings || []).map((m: any) => (
          <div key={m.id} className="bg-card rounded-md p-4 border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.type.replaceAll("_"," ")} • {formatDateTime(m.scheduledAt)} • {m.durationMinutes}m • {m.status}</div>
                <div className="text-xs text-muted-foreground mt-1">Participants: {(m.participants || []).map((p: any) => p.mentee?.user?.name || p.mentee?.name || `Mentee#${p.menteeId}`).join(", ")}</div>
              </div>
              {user?.role === "mentor" && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => { setOpenFeedbackFor(m.id); const init: any = {}; (m.participants||[]).forEach((p:any)=>{init[p.menteeId]={attended:p.attended||false,stars:p.stars||undefined,remarks:p.remarks||""}}); setFeedback(init); }}>Record Feedback</Button>
                </div>
              )}
            </div>
            {user?.role === "mentee" && (
              <div className="text-xs mt-2">
                {(() => {
                  const me = (m.participants || []).find((p: any) => p.mentee?.userId === user?.id);
                  if (!me) return null;
                  return (
                    <div className="text-muted-foreground">Your status: {me.attended ? "Attended" : "Absent"}{me.stars ? ` • ${me.stars}★` : ""}{me.remarks ? ` • ${me.remarks}` : ""}</div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Meeting Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_to_one">One to One</SelectItem>
                    <SelectItem value="many_to_one">Many to One</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scheduled At</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </div>
              <div className="md:col-span-2">
                <Label>Location / Link</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <textarea className="w-full border rounded px-3 py-2 bg-background" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Select Mentees</Label>
              <div className="mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button">
                      {form.menteeIds.length > 0 ? `${form.menteeIds.length} selected` : "Add participants"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[320px]" align="start">
                    <Command>
                      <CommandInput placeholder="Search mentees by name or USN" />
                      <CommandList>
                        <CommandEmpty>No mentees found.</CommandEmpty>
                        <CommandGroup heading="Mentees">
                          {(mentees || []).map((m) => {
                            const label = `${m.user?.name || m.name || `#${m.id}`}${m.usn ? ` (${m.usn})` : ''}`;
                            const selected = form.menteeIds.includes(m.id);
                            return (
                              <CommandItem
                                key={m.id}
                                onSelect={() => {
                                  setForm({
                                    ...form,
                                    menteeIds: selected
                                      ? form.menteeIds.filter((id) => id !== m.id)
                                      : [...form.menteeIds, m.id],
                                  });
                                }}
                              >
                                <input type="checkbox" checked={selected} readOnly className="mr-2" />
                                <span>{label}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {form.menteeIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.menteeIds.map((id) => {
                    const m = (mentees || []).find((x) => x.id === id);
                    const label = `${m?.user?.name || m?.name || `#${id}`}${m?.usn ? ` (${m.usn})` : ''}`;
                    return (
                      <span key={id} className="px-2 py-1 text-xs rounded border bg-primary/5 text-primary">
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={openFeedbackFor != null} onOpenChange={(v) => { if(!v) { setOpenFeedbackFor(null); setFeedback({}); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Attendance & Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(meetings || []).find((m:any)=>m.id===openFeedbackFor)?.participants?.map((p:any)=>{
              const v = feedback[p.menteeId] || { attended: false, stars: undefined, remarks: "" };
              return (
                <div key={p.menteeId} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <div className="text-sm font-medium">{p.mentee?.user?.name || p.mentee?.name || p.menteeId}</div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Attended</Label>
                    <input type="checkbox" checked={!!v.attended} onChange={(e)=>setFeedback({ ...feedback, [p.menteeId]: { ...v, attended: e.target.checked } })} />
                  </div>
                  <div>
                    <Select value={v.stars?String(v.stars):""} onValueChange={(val)=>setFeedback({ ...feedback, [p.menteeId]: { ...v, stars: Number(val) } })}>
                      <SelectTrigger><SelectValue placeholder="Stars" /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(s=> <SelectItem key={s} value={String(s)}>{s}★</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Input placeholder="Remarks" value={v.remarks||""} onChange={(e)=>setFeedback({ ...feedback, [p.menteeId]: { ...v, remarks: e.target.value } })} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setOpenFeedbackFor(null); setFeedback({}); }}>Cancel</Button>
            <Button onClick={() => openFeedbackFor && feedbackMutation.mutate({ meetingId: openFeedbackFor })} disabled={feedbackMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
