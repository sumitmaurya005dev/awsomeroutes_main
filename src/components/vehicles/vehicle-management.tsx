"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BadgeIndianRupee,
  CarFront,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VehicleLocationCombobox } from "./vehicle-location-combobox";
import { VehicleSearchableSelect } from "./vehicle-searchable-select";
import {
  deleteVehicleRecord,
  saveDriver,
  saveFleetVehicle,
  saveTransportVendor,
  saveVehicleCategory,
  saveVehicleModel,
  saveVehicleRate,
} from "@/lib/vehicles/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type {
  Driver,
  FleetVehicle,
  TransportVendor,
  VehicleAdminData,
  VehicleCategory,
  VehicleLocation,
  VehicleLocationOption,
  VehicleModel,
  VehicleRateCard,
  VehicleSection,
} from "@/types/vehicle";

type Editor =
  | { kind: "category"; record: VehicleCategory | null }
  | { kind: "model"; record: VehicleModel | null }
  | { kind: "vendor"; record: TransportVendor | null }
  | { kind: "driver"; record: Driver | null }
  | { kind: "fleet"; record: FleetVehicle | null }
  | { kind: "rate"; record: VehicleRateCard | null };

type Permissions = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManagePricing: boolean;
  canAssign: boolean;
};

const sections: Array<{ id: VehicleSection; label: string; icon: React.ElementType }> = [
  { id: "catalog", label: "Categories & models", icon: CarFront },
  { id: "vendors", label: "Vendors", icon: UsersRound },
  { id: "fleet", label: "Fleet", icon: Warehouse },
  { id: "drivers", label: "Drivers", icon: UserRound },
  { id: "rates", label: "Pricing", icon: BadgeIndianRupee },
];

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const nullable = (form: FormData, name: string) => String(form.get(name) ?? "").trim() || null;
const number = (form: FormData, name: string) => Number(form.get(name));
const nullableNumber = (form: FormData, name: string) => {
  const value = String(form.get(name) ?? "").trim();
  return value ? Number(value) : null;
};
const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
const fullName = (driver: Driver) => [driver.first_name, driver.last_name].filter(Boolean).join(" ");

function locationOption(location: VehicleLocation | null): VehicleLocationOption | null {
  if (!location) return null;
  return {
    id: location.id,
    name: location.name,
    destinationName: location.destination?.name ?? "",
    regionName: location.destination?.region?.name ?? "",
    countryName: location.destination?.region?.country?.name ?? "",
  };
}

export function VehicleManagement({ data, permissions }: { data: VehicleAdminData; permissions: Permissions }) {
  const router = useRouter();
  const [section, setSection] = React.useState<VehicleSection>("catalog");
  const [search, setSearch] = React.useState("");
  const [editor, setEditor] = React.useState<Editor | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const term = search.trim().toLowerCase();
  const match = (...values: Array<string | null | undefined>) => !term || values.some((value) => value?.toLowerCase().includes(term));

  async function remove(kind: "category" | "model" | "vendor" | "driver" | "fleet" | "rate", id: string, label: string) {
    if (!confirm(`Delete ${label}? If it is already used, set it inactive instead.`)) return;
    setBusy(id); setError(null);
    try {
      const result = await deleteVehicleRecord(kind, id);
      if (!result.success) setError(result.error); else router.refresh();
    } catch (deleteError) { setError(getNetworkErrorMessage(deleteError)); }
    finally { setBusy(null); }
  }

  const addButtons = section === "catalog"
    ? [<Button key="category" onClick={() => setEditor({ kind: "category", record: null })}><Plus />Category</Button>, <Button key="model" variant="outline" onClick={() => setEditor({ kind: "model", record: null })}><Plus />Model</Button>]
    : section === "rates"
      ? permissions.canManagePricing ? [<Button key="rate" onClick={() => setEditor({ kind: "rate", record: null })}><Plus />Rate card</Button>] : []
      : permissions.canCreate ? [<Button key={section} onClick={() => setEditor({ kind: section === "vendors" ? "vendor" : section === "drivers" ? "driver" : "fleet", record: null })}><Plus />Add {section === "vendors" ? "vendor" : section === "drivers" ? "driver" : "vehicle"}</Button>] : [];

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-xl border bg-card p-1 shadow-sm">
        <div className="flex min-w-max gap-1">
          {sections.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => { setSection(item.id); setSearch(""); }} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${section === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-4 w-4" />{item.label}</button>;
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${section}...`} className="pl-9" /></div>
        <div className="flex flex-wrap gap-2">{permissions.canCreate || section === "rates" ? addButtons : null}</div>
      </div>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      {section === "catalog" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Vehicle categories" subtitle="Commercial grouping and default comfort capacity.">
            <EntityTable headers={["Category", "Capacity", "Luggage", "Status", ""]} empty="No vehicle categories found." rows={data.categories.filter((row) => match(row.name, row.slug)).map((row) => [
              <div key="name"><b>{row.name}</b><p className="text-xs text-muted-foreground">{row.slug}</p></div>,
              <span key="capacity">{row.default_comfort_capacity} comfortable / {row.default_seating_capacity} max</span>,
              <span key="luggage">{row.default_luggage_capacity} bags</span>,
              <Status key="status" value={row.status} />,
              <Actions key="actions" canEdit={permissions.canUpdate} canDelete={permissions.canDelete} busy={busy === row.id} onEdit={() => setEditor({ kind: "category", record: row })} onDelete={() => remove("category", row.id, row.name)} />,
            ])} />
          </Panel>
          <Panel title="Vehicle models" subtitle="Model-specific seating, comfort and luggage capacity.">
            <EntityTable headers={["Model", "Category", "Capacity", "Status", ""]} empty="No vehicle models found." rows={data.models.filter((row) => match(row.name, row.manufacturer, row.category?.name)).map((row) => [
              <div key="name"><b>{row.name}</b><p className="text-xs text-muted-foreground">{row.manufacturer ?? "Generic model"}</p></div>,
              <span key="category">{row.category?.name ?? "—"}</span>,
              <span key="capacity">{row.comfort_capacity} comfort / {row.seating_capacity} max · {row.luggage_capacity} bags</span>,
              <Status key="status" value={row.status} />,
              <Actions key="actions" canEdit={permissions.canUpdate} canDelete={permissions.canDelete} busy={busy === row.id} onEdit={() => setEditor({ kind: "model", record: row })} onDelete={() => remove("model", row.id, row.name)} />,
            ])} />
          </Panel>
        </div>
      )}

      {section === "vendors" && <Panel title="Transport vendors" subtitle="Third-party operators and their pricing base location."><EntityTable headers={["Vendor", "Base location", "Contact", "Status", ""]} empty="No vendors found." rows={data.vendors.filter((row) => match(row.name, row.phone, row.base_location?.name)).map((row) => [<div key="name"><b>{row.name}</b><p className="text-xs text-muted-foreground">{row.contact_person ?? row.slug}</p></div>, <span key="location">{row.base_location?.name ?? "—"}</span>, <span key="phone">{row.phone ?? "—"}</span>, <Status key="status" value={row.status} />, <Actions key="actions" canEdit={permissions.canUpdate} canDelete={permissions.canDelete} busy={busy === row.id} onEdit={() => setEditor({ kind: "vendor", record: row })} onDelete={() => remove("vendor", row.id, row.name)} />])} /></Panel>}

      {section === "fleet" && <Panel title="Physical fleet" subtitle="Actual third-party vehicles used during tour operations."><EntityTable headers={["Registration", "Model", "Vendor", "Capacity", "Status", ""]} empty="No fleet vehicles found." rows={data.fleet.filter((row) => match(row.registration_number, row.model?.name, row.vendor?.name)).map((row) => [<b key="registration">{row.registration_number}</b>, <span key="model">{row.model?.name ?? "—"}</span>, <span key="vendor">{row.vendor?.name ?? "Unassigned"}</span>, <span key="capacity">{row.comfort_capacity ?? row.model?.comfort_capacity ?? "—"} comfort</span>, <Status key="status" value={row.status} />, <Actions key="actions" canEdit={permissions.canUpdate} canDelete={permissions.canDelete} busy={busy === row.id} onEdit={() => setEditor({ kind: "fleet", record: row })} onDelete={() => remove("fleet", row.id, row.registration_number)} />])} /></Panel>}

      {section === "drivers" && <Panel title="Drivers" subtitle="Private operational details; never exposed to the public website."><EntityTable headers={["Driver", "Vendor", "Phone", "Licence", "Status", ""]} empty="No drivers found." rows={data.drivers.filter((row) => match(fullName(row), row.phone, row.vendor?.name, row.licence_number)).map((row) => [<b key="name">{fullName(row)}</b>, <span key="vendor">{row.vendor?.name ?? "Independent"}</span>, <span key="phone">{row.phone}</span>, <div key="licence"><span>{row.licence_number ?? "—"}</span>{row.licence_expiry && <p className="text-xs text-muted-foreground">Expires {row.licence_expiry}</p>}</div>, <Status key="status" value={row.status} />, <Actions key="actions" canEdit={permissions.canUpdate} canDelete={permissions.canDelete} busy={busy === row.id} onEdit={() => setEditor({ kind: "driver", record: row })} onDelete={() => remove("driver", row.id, fullName(row))} />])} /></Panel>}

      {section === "rates" && <Panel title="All-inclusive daily rates" subtitle="Precedence: vendor + model, model, vendor + category, then category default."><EntityTable headers={["Base location", "Scope", "Daily rate", "Includes", "Status", ""]} empty="No vehicle rates found." rows={data.rates.filter((row) => match(row.base_location?.name, row.category?.name, row.model?.name, row.vendor?.name)).map((row) => [<div key="location"><b>{row.base_location?.name ?? "—"}</b><p className="text-xs text-muted-foreground">{row.base_location?.destination?.name}</p></div>, <div key="scope"><b>{row.model?.name ?? row.category?.name ?? "—"}</b><p className="text-xs text-muted-foreground">{row.vendor?.name ?? (row.model ? "Model default" : "Category default")}</p></div>, <b key="rate">{money(row.daily_rate_paise)} / day</b>, <span key="includes" className="text-xs">Fuel · driver · toll · parking</span>, <Status key="status" value={row.status} />, <Actions key="actions" canEdit={permissions.canManagePricing} canDelete={permissions.canManagePricing} busy={busy === row.id} onEdit={() => setEditor({ kind: "rate", record: row })} onDelete={() => remove("rate", row.id, "this rate card")} />])} /></Panel>}

      {permissions.canAssign && <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><p><b>Operations ready.</b> Physical car and driver records are separated from commercial rates, so custom itineraries can replace either day-wise without changing a locked customer price.</p></div>}
      {editor && <EditorDialog key={`${editor.kind}-${editor.record?.id ?? "new"}`} editor={editor} data={data} onClose={() => setEditor(null)} />}
    </section>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="border-b bg-muted/25 px-5 py-4"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div>{children}</div>;
}

function EntityTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b bg-muted/15"><tr>{headers.map((header, index) => <th key={`${header}-${index}`} className={`px-5 py-3 text-left text-xs font-medium text-muted-foreground ${index === headers.length - 1 ? "text-right" : ""}`}>{header}</th>)}</tr></thead><tbody className="divide-y">{rows.length ? rows.map((cells, rowIndex) => <tr key={rowIndex} className="hover:bg-muted/20">{cells.map((cell, index) => <td key={index} className={`px-5 py-4 ${index === cells.length - 1 ? "text-right" : ""}`}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="p-12 text-center text-muted-foreground">{empty}</td></tr>}</tbody></table></div>;
}

function Status({ value }: { value: string }) {
  const active = value === "active";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : value === "maintenance" || value === "unavailable" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>{value.replaceAll("_", " ")}</span>;
}

function Actions({ canEdit, canDelete, busy, onEdit, onDelete }: { canEdit: boolean; canDelete: boolean; busy: boolean; onEdit: () => void; onDelete: () => void }) {
  if (!canEdit && !canDelete) return <span className="text-muted-foreground">—</span>;
  return <span className="inline-flex gap-1">{canEdit && <Button type="button" size="icon-sm" variant="ghost" onClick={onEdit} title="Edit"><Pencil /></Button>}{canDelete && <Button type="button" size="icon-sm" variant="ghost" disabled={busy} onClick={onDelete} className="text-destructive" title="Delete">{busy ? <Loader2 className="animate-spin" /> : <Trash2 />}</Button>}</span>;
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="space-y-1.5 text-sm font-medium"><span>{label}</span><Input {...props} /></label>;
}
function SelectField({ label, name, defaultValue, children, required = false, onChange }: { label: string; name: string; defaultValue?: string; children: React.ReactNode; required?: boolean; onChange?: React.ChangeEventHandler<HTMLSelectElement> }) {
  return <label className="space-y-1.5 text-sm font-medium"><span>{label}</span><select name={name} required={required} defaultValue={defaultValue} onChange={onChange} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">{children}</select></label>;
}

function EditorDialog({ editor, data, onClose }: { editor: Editor; data: VehicleAdminData; onClose: () => void }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [locationId, setLocationId] = React.useState(editor.kind === "vendor" ? editor.record?.base_location_id ?? "" : editor.kind === "rate" ? editor.record?.base_location_id ?? "" : "");
  const [categoryId, setCategoryId] = React.useState(editor.kind === "model" ? editor.record?.category_id ?? "" : editor.kind === "rate" ? editor.record?.category_id ?? "" : "");
  const [modelId, setModelId] = React.useState(editor.kind === "fleet" ? editor.record?.model_id ?? "" : editor.kind === "rate" ? editor.record?.model_id ?? "" : "");
  const [vendorId, setVendorId] = React.useState(editor.kind === "driver" || editor.kind === "fleet" || editor.kind === "rate" ? editor.record?.vendor_id ?? "" : "");
  // The editor discriminant controls which fields are rendered. This combined
  // read shape keeps shared dialog plumbing compact while submit remains
  // strongly validated by the entity-specific Zod schema and server action.
  const record = editor.record as
    | (VehicleCategory & VehicleModel & TransportVendor & Driver & FleetVehicle & VehicleRateCard)
    | null;
  const recordId = editor.record?.id ?? null;
  const title = `${recordId ? "Edit" : "Add"} ${editor.kind === "fleet" ? "fleet vehicle" : editor.kind}`;
  const initialLocation = editor.kind === "vendor" ? locationOption(editor.record?.base_location ?? null) : editor.kind === "rate" ? locationOption(editor.record?.base_location ?? null) : null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      let result;
      if (editor.kind === "category") result = await saveVehicleCategory(recordId, { name: String(form.get("name")), slug: String(form.get("slug")), description: nullable(form, "description"), default_seating_capacity: number(form, "seating"), default_comfort_capacity: number(form, "comfort"), default_luggage_capacity: number(form, "luggage"), status: String(form.get("status")) as "active" | "inactive" });
      else if (editor.kind === "model") result = await saveVehicleModel(recordId, { category_id: categoryId, manufacturer: nullable(form, "manufacturer"), name: String(form.get("name")), slug: String(form.get("slug")), description: nullable(form, "description"), seating_capacity: number(form, "seating"), comfort_capacity: number(form, "comfort"), luggage_capacity: number(form, "luggage"), status: String(form.get("status")) as "active" | "inactive" });
      else if (editor.kind === "vendor") result = await saveTransportVendor(recordId, { base_location_id: locationId, name: String(form.get("name")), slug: String(form.get("slug")), contact_person: nullable(form, "contact_person"), phone: nullable(form, "phone"), alternate_phone: nullable(form, "alternate_phone"), email: nullable(form, "email"), address: nullable(form, "address"), notes: nullable(form, "notes"), status: String(form.get("status")) as "active" | "inactive" });
      else if (editor.kind === "driver") result = await saveDriver(recordId, { vendor_id: vendorId || null, first_name: String(form.get("first_name")), last_name: nullable(form, "last_name"), phone: String(form.get("phone")), alternate_phone: nullable(form, "alternate_phone"), licence_number: nullable(form, "licence_number"), licence_expiry: nullable(form, "licence_expiry"), notes: nullable(form, "notes"), status: String(form.get("status")) as "active" | "inactive" | "unavailable" });
      else if (editor.kind === "fleet") result = await saveFleetVehicle(recordId, { vendor_id: vendorId || null, model_id: modelId, registration_number: String(form.get("registration_number")), color: nullable(form, "color"), manufacture_year: nullableNumber(form, "manufacture_year"), seating_capacity: nullableNumber(form, "seating"), comfort_capacity: nullableNumber(form, "comfort"), luggage_capacity: nullableNumber(form, "luggage"), notes: nullable(form, "notes"), status: String(form.get("status")) as "active" | "inactive" | "maintenance" });
      else result = await saveVehicleRate(recordId, { base_location_id: locationId, category_id: categoryId, model_id: modelId || null, vendor_id: vendorId || null, daily_rate_paise: Math.round(number(form, "daily_rate_rupees") * 100), currency: "INR", all_inclusive: true, notes: nullable(form, "notes"), status: String(form.get("status")) as "active" | "inactive" });
      if (!result.success) setError(result.error); else { onClose(); router.refresh(); }
    } catch (submitError) { setError(getNetworkErrorMessage(submitError)); }
    finally { setSaving(false); }
  }

  function requestSave() {
    const form = formRef.current;
    if (!form || saving) return;
    const missingSearchableField = Array.from(form.querySelectorAll<HTMLInputElement>('input[data-required="true"]')).find((field) => !field.value);
    if (missingSearchableField) {
      setError("Please select all required options before saving.");
      return;
    }
    if (!form.reportValidity()) {
      setError("Please complete all required fields and correct invalid values before saving.");
      return;
    }
    form.requestSubmit();
  }

  return <Dialog open onOpenChange={(open) => !open && !saving && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="capitalize">{title}</DialogTitle><DialogDescription>Fields are validated again on the server and protected by database RLS.</DialogDescription></DialogHeader><form ref={formRef} onSubmit={submit} onInvalid={() => setError("Please complete all required fields and correct invalid values before saving.")} className="space-y-5">
    {error && <p role="alert" aria-live="polite" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {editor.kind === "category" && <><NameSlug name={record?.name} slug={record?.slug} /><div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-3"><Field label="Maximum seats" name="seating" type="number" min={1} required defaultValue={record?.default_seating_capacity ?? 4} /><Field label="Comfort seats" name="comfort" type="number" min={1} required defaultValue={record?.default_comfort_capacity ?? 3} /><Field label="Standard bags" name="luggage" type="number" min={0} required defaultValue={record?.default_luggage_capacity ?? 3} /></div><Notes defaultValue={record?.description} name="description" label="Description" /><StatusSelect defaultValue={record?.status} /></>}
    {editor.kind === "model" && <><VehicleSearchableSelect label="Category" name="category_id" required value={categoryId} onValueChange={setCategoryId} placeholder="Select vehicle category" searchPlaceholder="Search categories..." options={data.categories.filter((item) => item.status === "active" || item.id === record?.category_id).map((item) => ({ value: item.id, label: item.name, description: `${item.default_comfort_capacity} comfortable · ${item.default_seating_capacity} maximum seats`, keywords: item.slug }))} /><Field label="Manufacturer" name="manufacturer" defaultValue={record?.manufacturer ?? ""} maxLength={100} /><NameSlug name={record?.name} slug={record?.slug} /><div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-3"><Field label="Maximum seats" name="seating" type="number" min={1} required defaultValue={record?.seating_capacity ?? 7} /><Field label="Comfort seats" name="comfort" type="number" min={1} required defaultValue={record?.comfort_capacity ?? 6} /><Field label="Standard bags" name="luggage" type="number" min={0} required defaultValue={record?.luggage_capacity ?? 5} /></div><Notes defaultValue={record?.description} name="description" label="Description" /><StatusSelect defaultValue={record?.status} /></>}
    {editor.kind === "vendor" && <><label className="space-y-1.5 text-sm font-medium"><span>Base location</span><VehicleLocationCombobox value={locationId} initialOption={initialLocation} onChange={(option) => setLocationId(option.id)} /></label><NameSlug name={record?.name} slug={record?.slug} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Contact person" name="contact_person" defaultValue={record?.contact_person ?? ""} /><Field label="Phone" name="phone" defaultValue={record?.phone ?? ""} /><Field label="Alternate phone" name="alternate_phone" defaultValue={record?.alternate_phone ?? ""} /><Field label="Email" name="email" type="email" defaultValue={record?.email ?? ""} /></div><Notes defaultValue={record?.address} name="address" label="Address" /><Notes defaultValue={record?.notes} /><StatusSelect defaultValue={record?.status} /></>}
    {editor.kind === "driver" && <><VehicleSearchableSelect label="Vendor" name="vendor_id" value={vendorId} onValueChange={setVendorId} placeholder="Independent driver" emptyOptionLabel="Independent driver" searchPlaceholder="Search vendors by name or location..." options={data.vendors.map((item) => ({ value: item.id, label: item.name, description: item.base_location?.name ?? "Location unavailable", keywords: `${item.slug} ${item.phone ?? ""}` }))} /><div className="grid gap-4 sm:grid-cols-2"><Field label="First name" name="first_name" required defaultValue={record?.first_name ?? ""} /><Field label="Last name" name="last_name" defaultValue={record?.last_name ?? ""} /><Field label="Phone" name="phone" required defaultValue={record?.phone ?? ""} /><Field label="Alternate phone" name="alternate_phone" defaultValue={record?.alternate_phone ?? ""} /><Field label="Licence number" name="licence_number" defaultValue={record?.licence_number ?? ""} /><Field label="Licence expiry" name="licence_expiry" type="date" defaultValue={record?.licence_expiry ?? ""} /></div><Notes defaultValue={record?.notes} /><SelectField label="Status" name="status" defaultValue={record?.status ?? "active"}><option value="active">Active</option><option value="unavailable">Unavailable</option><option value="inactive">Inactive</option></SelectField></>}
    {editor.kind === "fleet" && <><div className="grid gap-4 sm:grid-cols-2"><VehicleSearchableSelect label="Vehicle model" name="model_id" required value={modelId} onValueChange={setModelId} placeholder="Select vehicle model" searchPlaceholder="Search by model, manufacturer or category..." options={data.models.map((item) => ({ value: item.id, label: item.name, description: `${item.manufacturer ?? "Generic"} · ${item.category?.name ?? "Uncategorised"} · ${item.comfort_capacity} comfortable`, keywords: `${item.slug} ${item.manufacturer ?? ""} ${item.category?.name ?? ""}` }))} /><VehicleSearchableSelect label="Vendor" name="vendor_id" value={vendorId} onValueChange={setVendorId} placeholder="Unassigned vehicle" emptyOptionLabel="Unassigned vehicle" searchPlaceholder="Search vendors by name or location..." options={data.vendors.map((item) => ({ value: item.id, label: item.name, description: item.base_location?.name ?? "Location unavailable", keywords: `${item.slug} ${item.phone ?? ""}` }))} /><Field label="Registration number" name="registration_number" required defaultValue={record?.registration_number ?? ""} /><Field label="Color" name="color" defaultValue={record?.color ?? ""} /><Field label="Manufacture year" name="manufacture_year" type="number" min={1980} max={2200} defaultValue={record?.manufacture_year ?? ""} /></div><div className="space-y-2 rounded-xl border bg-muted/20 p-4"><p className="text-sm font-medium">Optional capacity overrides</p><p className="text-xs text-muted-foreground">Leave blank to use the selected model&apos;s standard capacities.</p><div className="grid gap-4 sm:grid-cols-3"><Field label="Maximum seats" name="seating" type="number" min={1} defaultValue={record?.seating_capacity ?? ""} /><Field label="Comfort seats" name="comfort" type="number" min={1} defaultValue={record?.comfort_capacity ?? ""} /><Field label="Bags" name="luggage" type="number" min={0} defaultValue={record?.luggage_capacity ?? ""} /></div></div><Notes defaultValue={record?.notes} /><SelectField label="Status" name="status" defaultValue={record?.status ?? "active"}><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option></SelectField></>}
    {editor.kind === "rate" && <><label className="space-y-1.5 text-sm font-medium"><span>Pricing base location <span className="text-destructive">*</span></span><VehicleLocationCombobox value={locationId} initialOption={initialLocation} onChange={(option) => { setLocationId(option.id); if (vendorId && !data.vendors.some((vendor) => vendor.id === vendorId && vendor.base_location_id === option.id)) setVendorId(""); }} /></label><div className="grid gap-4 sm:grid-cols-2"><VehicleSearchableSelect label="Category" name="category_id" required value={categoryId} onValueChange={(next) => { setCategoryId(next); if (modelId && !data.models.some((model) => model.id === modelId && model.category_id === next)) setModelId(""); }} placeholder="Select vehicle category" searchPlaceholder="Search categories..." options={data.categories.map((item) => ({ value: item.id, label: item.name, description: `${item.default_comfort_capacity} comfortable · ${item.default_seating_capacity} maximum seats`, keywords: item.slug }))} /><VehicleSearchableSelect label="Model override" name="model_id" value={modelId} onValueChange={setModelId} placeholder="Category default" emptyOptionLabel="Category default" searchPlaceholder="Search models..." options={data.models.filter((item) => !categoryId || item.category_id === categoryId).map((item) => ({ value: item.id, label: item.name, description: item.manufacturer ?? item.category?.name ?? undefined, keywords: item.slug }))} /><VehicleSearchableSelect label="Vendor override" name="vendor_id" value={vendorId} onValueChange={setVendorId} placeholder="Default for all vendors" emptyOptionLabel="Default for all vendors" searchPlaceholder="Search vendors..." options={data.vendors.filter((item) => !locationId || item.base_location_id === locationId).map((item) => ({ value: item.id, label: item.name, description: item.base_location?.name ?? undefined, keywords: `${item.slug} ${item.phone ?? ""}` }))} /><Field label="All-inclusive daily rate (₹)" name="daily_rate_rupees" type="number" min={0} step="0.01" required defaultValue={record ? record.daily_rate_paise / 100 : ""} /></div><p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">Includes fuel, driver allowance, toll and parking. It is charged for every package day, including stay/rest days.</p><Notes defaultValue={record?.notes} /><StatusSelect defaultValue={record?.status} /></>}
    <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="button" onClick={requestSave} disabled={saving || ((editor.kind === "vendor" || editor.kind === "rate") && !locationId)}>{saving ? <Loader2 className="animate-spin" /> : null}{saving ? "Saving..." : "Save"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function NameSlug({ name = "", slug = "" }: { name?: string; slug?: string }) {
  const [currentName, setCurrentName] = React.useState(name);
  const [currentSlug, setCurrentSlug] = React.useState(slug);
  const [manualSlug, setManualSlug] = React.useState(Boolean(slug));
  return <div className="grid gap-4 sm:grid-cols-2"><Field label="Name" name="name" required value={currentName} onChange={(event) => { setCurrentName(event.target.value); if (!manualSlug) setCurrentSlug(slugify(event.target.value)); }} /><Field label="Slug" name="slug" required value={currentSlug} onChange={(event) => { setManualSlug(true); setCurrentSlug(slugify(event.target.value)); }} /></div>;
}
function Notes({ defaultValue, name = "notes", label = "Internal notes" }: { defaultValue?: string | null; name?: string; label?: string }) {
  return <label className="space-y-1.5 text-sm font-medium"><span>{label}</span><Textarea name={name} defaultValue={defaultValue ?? ""} rows={3} /></label>;
}
function StatusSelect({ defaultValue = "active" }: { defaultValue?: string }) {
  return <SelectField label="Status" name="status" defaultValue={defaultValue}><option value="active">Active</option><option value="inactive">Inactive</option></SelectField>;
}
