import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";

function formatDateTime(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}

export default function AdminMeetingsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const { data } = useQuery({
    queryKey: ["/api/admin/meetings"],
    queryFn: async () => {
      const r = await fetch("/api/admin/meetings");
      if (!r.ok) throw new Error("Failed to load meetings");
      return r.json();
    },
  });

  const meetings = data || [];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    return meetings.filter((m: any) => {
      if (typeFilter && m.type !== typeFilter) return false;
      if (statusFilter && m.status !== statusFilter) return false;
      if (fromDate && new Date(m.scheduledAt) < fromDate) return false;
      if (toDate && new Date(m.scheduledAt) > toDate) return false;
      if (s) {
        const mentorName = m.mentor?.user?.name || "";
        const menteeNames = (m.participants || []).map((p:any)=> p.mentee?.user?.name || "").join(" ");
        const text = `${m.title} ${mentorName} ${menteeNames} ${m.location || ''} ${m.description || ''}`.toLowerCase();
        if (!text.includes(s)) return false;
      }
      return true;
    });
  }, [meetings, search, typeFilter, statusFilter, from, to]);

  return (
    <DashboardLayout pageTitle="All Meetings">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label>Search</Label>
            <Input placeholder="Title, mentor, mentee..." value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={typeFilter ?? undefined} onValueChange={(v)=>setTypeFilter(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="one_to_one">One to One</SelectItem>
                <SelectItem value="many_to_one">Many to One</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={statusFilter ?? undefined} onValueChange={(v)=>setStatusFilter(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="bg-card rounded-md p-6 text-sm text-muted-foreground">No meetings found.</div>
        )}
        {filtered.map((m: any) => (
          <div key={m.id} className="bg-card rounded-md p-4 border border-border">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.type.replaceAll("_"," ")} • {formatDateTime(m.scheduledAt)} • {m.durationMinutes}m • {m.status}</div>
                <div className="text-xs text-muted-foreground mt-1">Mentor: {m.mentor?.user?.name || m.mentorId}</div>
                <div className="text-xs text-muted-foreground">Mentees: {(m.participants||[]).map((p:any)=>p.mentee?.user?.name||p.menteeId).join(', ')}</div>
              </div>
            </div>
            {(m.participants||[]).length>0 && (
              <div className="mt-3 text-xs">
                <div className="font-medium mb-1">Attendance & Remarks</div>
                <ul className="list-disc ml-5 space-y-1">
                  {(m.participants||[]).map((p:any)=> (
                    <li key={p.menteeId}>
                      {p.mentee?.user?.name || p.menteeId}: {p.attended ? 'Attended' : 'Absent'}{p.stars?` • ${p.stars}★`:''}{p.remarks?` • ${p.remarks}`:''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
