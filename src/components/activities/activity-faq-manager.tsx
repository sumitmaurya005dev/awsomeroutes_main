"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteActivityChild, saveFaq } from "@/lib/activities/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type { ActivityFaq } from "@/types/activity";

export function ActivityFaqManager({ activityId, faqs, canUpdate }: { activityId: string; faqs: ActivityFaq[]; canUpdate: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<ActivityFaq | "new" | null>(null);
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function open(item: ActivityFaq | "new") { setEditing(item); setQuestion(item === "new" ? "" : item.question); setAnswer(item === "new" ? "" : item.answer); setError(null); }
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); const item = editing === "new" ? null : editing; try { const result = await saveFaq(item?.id ?? null, { activity_id: activityId, question, answer, display_order: item?.display_order ?? faqs.length, status: item?.status ?? "active" }); if (!result.success) { setError(result.error); return; } setEditing(null); router.refresh(); } catch (submitError) { setError(getNetworkErrorMessage(submitError)); } finally { setSaving(false); } }
  async function remove(id: string) { if (!window.confirm("Delete this FAQ?")) return; try { const result = await deleteActivityChild("activity_faqs", id, activityId); if (!result.success) { setError(result.error); return; } router.refresh(); } catch (deleteError) { setError(getNetworkErrorMessage(deleteError)); } }

  return <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Frequently asked questions</h2><p className="text-sm text-muted-foreground">Reusable public answers for the activity detail page.</p></div>{canUpdate && <Button type="button" size="sm" onClick={() => open("new")}><Plus className="mr-2 h-4 w-4" />Add FAQ</Button>}</div>{error && !editing && <p className="text-sm text-destructive">{error}</p>}<div className="divide-y rounded-xl border">{faqs.length ? faqs.map((faq) => <div key={faq.id} className="flex gap-3 p-4"><div className="flex-1"><p className="text-sm font-semibold">{faq.question}</p><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{faq.answer}</p></div>{canUpdate && <div className="flex"><button type="button" aria-label="Edit FAQ" onClick={() => open(faq)} className="p-2"><Pencil className="h-4 w-4" /></button><button type="button" aria-label="Delete FAQ" onClick={() => remove(faq.id)} className="p-2 text-destructive"><Trash2 className="h-4 w-4" /></button></div>}</div>) : <p className="p-5 text-sm text-muted-foreground">No FAQs added.</p>}</div><Dialog open={editing !== null} onOpenChange={(next) => !next && !saving && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{editing === "new" ? "Add FAQ" : "Edit FAQ"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><label className="space-y-2 text-sm font-medium">Question<Input required minLength={5} value={question} onChange={(event) => setQuestion(event.target.value)} /></label><label className="space-y-2 text-sm font-medium">Answer<Textarea required minLength={5} className="min-h-32" value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>{error && <p className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save FAQ</Button></DialogFooter></form></DialogContent></Dialog></section>;
}
