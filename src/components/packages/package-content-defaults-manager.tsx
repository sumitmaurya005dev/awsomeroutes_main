"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FilePlus2, Loader2, Pencil, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deletePackageContentTemplateRecord,
  savePackageContentTemplate,
  savePackageContentTemplateItem,
  savePackageContentTemplateSection,
  setDefaultPackageContentTemplate,
} from "@/lib/packages/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type {
  PackageContentTemplate,
  PackageContentTemplateItem,
  PackageContentTemplateSection,
  PackageContentType,
} from "@/types/package";

const contentTypes: Array<{value:PackageContentType;label:string}> = [
  {value:"highlight",label:"Highlight"},{value:"inclusion",label:"Inclusion"},{value:"exclusion",label:"Exclusion"},
  {value:"important_note",label:"Important note"},{value:"terms",label:"Terms & conditions"},
  {value:"cancellation",label:"Cancellation"},{value:"reschedule",label:"Reschedule"},{value:"value_promise",label:"Value promise"},
];
const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
type Editor = {kind:"template";value:PackageContentTemplate|null}|{kind:"section";templateId:string;value:PackageContentTemplateSection|null}|{kind:"item";sectionId:string;value:PackageContentTemplateItem|null}|null;

export function PackageContentDefaultsManager({templates}:{templates:PackageContentTemplate[]}){
  const router=useRouter();
  const [selectedId,setSelectedId]=React.useState(templates.find(item=>item.is_default)?.id??templates[0]?.id??"");
  const [editor,setEditor]=React.useState<Editor>(null);
  const [busy,setBusy]=React.useState(false);
  const [error,setError]=React.useState<string|null>(null);
  const selected=templates.find(item=>item.id===selectedId)??templates[0]??null;

  async function makeDefault(id:string){
    if(!window.confirm("Use this template for all newly created packages? Existing package snapshots will not be changed."))return;
    setBusy(true);setError(null);
    try{const result=await setDefaultPackageContentTemplate(id);if(!result.success){setError(result.error);return;}setSelectedId(id);router.refresh();}
    catch(e){setError(getNetworkErrorMessage(e));}finally{setBusy(false);}
  }
  async function remove(kind:"template"|"section"|"item",id:string){
    if(!window.confirm(`Delete this ${kind}?`))return;setBusy(true);setError(null);
    try{const result=await deletePackageContentTemplateRecord(kind,id);if(!result.success){setError(result.error);return;}if(kind==="template")setSelectedId("");router.refresh();}
    catch(e){setError(getNetworkErrorMessage(e));}finally{setBusy(false);}
  }

  return <div className="space-y-6">
    {error&&<p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold">Template versions</h2><p className="text-sm text-muted-foreground">The active default is copied into every new package. Existing packages retain their snapshots.</p></div>
        <Button type="button" onClick={()=>setEditor({kind:"template",value:null})}><FilePlus2/>New template</Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map(template=><button type="button" key={template.id} onClick={()=>setSelectedId(template.id)} className={`rounded-xl border p-4 text-left transition ${selected?.id===template.id?"border-primary bg-primary/[0.04]":"hover:bg-muted/30"}`}>
          <div className="flex items-start justify-between gap-2"><span><b className="block">{template.name}</b><small className="text-muted-foreground">Version {template.version} · {template.status}</small></span>{template.is_default&&<span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">Default</span>}</div>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{template.notes||"No internal notes."}</p>
        </button>)}
        {!templates.length&&<p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No content templates exist. Create the first version.</p>}
      </div>
    </section>

    {selected&&<section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{selected.name}</h2>{selected.is_default&&<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/>Current default</span>}</div><p className="mt-1 text-sm text-muted-foreground">{selected.sections.length} sections · version {selected.version}</p></div>
        <div className="flex flex-wrap gap-2">{!selected.is_default&&<Button type="button" variant="outline" disabled={busy} onClick={()=>makeDefault(selected.id)}><ShieldCheck/>Make default</Button>}<Button type="button" variant="outline" onClick={()=>setEditor({kind:"template",value:selected})}><Pencil/>Edit template</Button><Button type="button" variant="outline" onClick={()=>setEditor({kind:"section",templateId:selected.id,value:null})}><Plus/>Add section</Button>{!selected.is_default&&<Button type="button" variant="ghost" disabled={busy} className="text-destructive" onClick={()=>remove("template",selected.id)}><Trash2/>Delete</Button>}</div>
      </div>

      <div className="space-y-4">{selected.sections.map(section=><article key={section.id} className="overflow-hidden rounded-xl border">
        <header className="flex flex-col gap-3 border-b bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{section.title}</h3><span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium">{contentTypes.find(item=>item.value===section.section_type)?.label}</span></div><p className="text-xs text-muted-foreground">Display order {section.display_order} · {section.items.length} items</p></div><div className="flex gap-1"><Button type="button" size="sm" variant="ghost" onClick={()=>setEditor({kind:"item",sectionId:section.id,value:null})}><Plus/>Add item</Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Edit section" onClick={()=>setEditor({kind:"section",templateId:selected.id,value:section})}><Pencil/></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Delete section" disabled={busy} onClick={()=>remove("section",section.id)}><Trash2 className="text-destructive"/></Button></div></header>
        <div className="divide-y">{section.items.map(item=><div key={item.id} className="flex items-start gap-3 p-4"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{item.display_order+1}</span><p className={`flex-1 text-sm ${item.status==="inactive"?"text-muted-foreground line-through":""}`}>{item.content}</p><span className="text-[10px] capitalize text-muted-foreground">{item.status}</span><Button type="button" size="icon-sm" variant="ghost" aria-label="Edit item" onClick={()=>setEditor({kind:"item",sectionId:section.id,value:item})}><Pencil/></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Delete item" disabled={busy} onClick={()=>remove("item",item.id)}><Trash2 className="text-destructive"/></Button></div>)}{!section.items.length&&<p className="p-4 text-sm text-muted-foreground">This section has no items. Dynamic package inclusions may still populate it.</p>}</div>
      </article>)}{!selected.sections.length&&<p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No sections in this template.</p>}</div>
    </section>}

    {editor?.kind==="template"&&<TemplateForm value={editor.value} busy={busy} setBusy={setBusy} close={()=>setEditor(null)} fail={setError} done={id=>{setSelectedId(id);setEditor(null);router.refresh();}}/>}
    {editor?.kind==="section"&&<SectionForm templateId={editor.templateId} value={editor.value} busy={busy} setBusy={setBusy} close={()=>setEditor(null)} fail={setError} done={()=>{setEditor(null);router.refresh();}}/>}
    {editor?.kind==="item"&&<ItemForm sectionId={editor.sectionId} value={editor.value} busy={busy} setBusy={setBusy} close={()=>setEditor(null)} fail={setError} done={()=>{setEditor(null);router.refresh();}}/>}
  </div>;
}

function EditorShell({title,children,close}:{title:string;children:React.ReactNode;close:()=>void}){return <section className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between border-b pb-3"><h3 className="font-semibold">{title}</h3><Button type="button" variant="ghost" onClick={close}>Cancel</Button></div>{children}</section>}
function SaveButton({busy}:{busy:boolean}){return <Button type="submit" disabled={busy}>{busy?<Loader2 className="animate-spin"/>:<Save/>}{busy?"Saving...":"Save"}</Button>}

function TemplateForm({value,busy,setBusy,close,fail,done}:{value:PackageContentTemplate|null;busy:boolean;setBusy:(v:boolean)=>void;close:()=>void;fail:(v:string|null)=>void;done:(id:string)=>void}){
  const [name,setName]=React.useState(value?.name??""),[slug,setSlug]=React.useState(value?.slug??""),[version,setVersion]=React.useState(String(value?.version??1)),[status,setStatus]=React.useState(value?.status??"draft"),[notes,setNotes]=React.useState(value?.notes??"");
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);fail(null);try{const result=await savePackageContentTemplate(value?.id??null,{name,slug,version:Number(version),status,notes:notes.trim()||null});if(!result.success){fail(result.error);return;}done(result.data.id);}catch(err){fail(getNetworkErrorMessage(err));}finally{setBusy(false);}}
  return <EditorShell title={value?"Edit template":"Create template version"} close={close}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium">Name<Input required minLength={3} maxLength={120} value={name} onChange={e=>{setName(e.target.value);if(!value)setSlug(slugify(e.target.value));}}/></label><label className="space-y-1 text-sm font-medium">Slug<Input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(slugify(e.target.value))}/></label><label className="space-y-1 text-sm font-medium">Version<Input required type="number" min={1} max={10000} value={version} onChange={e=>setVersion(e.target.value)}/></label><label className="space-y-1 text-sm font-medium">Status<select className="h-10 w-full rounded-lg border bg-background px-3" value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label><label className="space-y-1 text-sm font-medium sm:col-span-2">Internal notes<Textarea maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="flex justify-end sm:col-span-2"><SaveButton busy={busy}/></div></form></EditorShell>;
}

function SectionForm({templateId,value,busy,setBusy,close,fail,done}:{templateId:string;value:PackageContentTemplateSection|null;busy:boolean;setBusy:(v:boolean)=>void;close:()=>void;fail:(v:string|null)=>void;done:()=>void}){
  const [title,setTitle]=React.useState(value?.title??""),[type,setType]=React.useState<PackageContentType>(value?.section_type??"terms"),[order,setOrder]=React.useState(String(value?.display_order??0));
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);fail(null);try{const result=await savePackageContentTemplateSection(value?.id??null,{template_id:templateId,section_type:type,title,display_order:Number(order)});if(!result.success){fail(result.error);return;}done();}catch(err){fail(getNetworkErrorMessage(err));}finally{setBusy(false);}}
  return <EditorShell title={value?"Edit section":"Add section"} close={close}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-3"><label className="space-y-1 text-sm font-medium sm:col-span-2">Section title<Input required minLength={2} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="space-y-1 text-sm font-medium">Display order<Input required type="number" min={0} max={500} value={order} onChange={e=>setOrder(e.target.value)}/></label><label className="space-y-1 text-sm font-medium sm:col-span-3">Content type<select className="h-10 w-full rounded-lg border bg-background px-3" value={type} onChange={e=>setType(e.target.value as PackageContentType)}>{contentTypes.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><div className="flex justify-end sm:col-span-3"><SaveButton busy={busy}/></div></form></EditorShell>;
}

function ItemForm({sectionId,value,busy,setBusy,close,fail,done}:{sectionId:string;value:PackageContentTemplateItem|null;busy:boolean;setBusy:(v:boolean)=>void;close:()=>void;fail:(v:string|null)=>void;done:()=>void}){
  const [content,setContent]=React.useState(value?.content??""),[order,setOrder]=React.useState(String(value?.display_order??0)),[status,setStatus]=React.useState(value?.status??"active");
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);fail(null);try{const result=await savePackageContentTemplateItem(value?.id??null,{section_id:sectionId,content,display_order:Number(order),status});if(!result.success){fail(result.error);return;}done();}catch(err){fail(getNetworkErrorMessage(err));}finally{setBusy(false);}}
  return <EditorShell title={value?"Edit policy item":"Add policy item"} close={close}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_140px_160px]"><label className="space-y-1 text-sm font-medium">Content<Textarea required minLength={1} maxLength={3000} className="min-h-28" value={content} onChange={e=>setContent(e.target.value)}/></label><label className="space-y-1 text-sm font-medium">Display order<Input required type="number" min={0} max={500} value={order} onChange={e=>setOrder(e.target.value)}/></label><label className="space-y-1 text-sm font-medium">Status<select className="h-10 w-full rounded-lg border bg-background px-3" value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><div className="flex justify-end sm:col-span-3"><SaveButton busy={busy}/></div></form></EditorShell>;
}
