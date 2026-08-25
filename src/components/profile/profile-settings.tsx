"use client";

import * as React from "react";
import { Camera, KeyRound, Loader2, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { changeOwnPassword, updateOwnProfile } from "@/lib/profile/actions";

type ProfileSettingsProps = {
  profile: { firstName: string | null; lastName: string | null; phone: string | null; email?: string; avatar: string | null; role: { name: string }; mustChangePassword?: boolean };
};

export function ProfileSettings({ profile }: ProfileSettingsProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [details, setDetails] = React.useState({ first_name: profile.firstName ?? "", last_name: profile.lastName ?? "", phone: profile.phone ?? "" });
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar);
  const [uploading, setUploading] = React.useState(false);
  const [savingDetails, setSavingDetails] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const initials = `${details.first_name.charAt(0)}${details.last_name.charAt(0)}`.toUpperCase() || "U";
  const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary/30";

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Use a JPG, PNG, or WEBP image smaller than 2 MB.");
      return;
    }
    setUploading(true); setError(null); setMessage(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body });
      const result = await response.json() as { data?: { avatar_url: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Avatar upload failed.");
      setAvatarUrl(result.data.avatar_url); setMessage("Profile photo updated. Your old photo was removed."); router.refresh();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Avatar upload failed."); }
    finally { setUploading(false); }
  };

  const saveDetails = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingDetails(true); setError(null); setMessage(null);
    const result = await updateOwnProfile({ phone: details.phone || null });
    setSavingDetails(false);
    if (result.success) {
      setMessage("Profile details saved.");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setMessage(null);
    if (password !== confirmPassword) { setError("New password and confirmation do not match."); return; }
    setSavingPassword(true);
    try {
      const result = await changeOwnPassword({ current_password: currentPassword, password });
      if (result.success) {
        setCurrentPassword("");
        setPassword("");
        setConfirmPassword("");
        setMessage("Password changed successfully. Use the new password the next time you sign in.");
        router.replace("/home");
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Password could not be changed. Please refresh the page and try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  return <div className="space-y-4">{profile.mustChangePassword && <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">You are using a temporary password. Change it now to unlock the rest of the portal.</p>}<div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><section className="h-fit rounded-2xl border bg-card p-6 shadow-sm"><div className="flex flex-col items-center text-center"><div className="relative"><div className="grid h-28 w-28 place-items-center overflow-hidden rounded-3xl bg-primary text-3xl font-bold text-primary-foreground shadow-lg">{avatarUrl ? <Image src={avatarUrl} alt="Profile photo" width={112} height={112} unoptimized className="h-full w-full object-cover" /> : initials}</div><button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow transition hover:scale-105" aria-label="Change profile photo">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</button><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} className="hidden" /></div><h2 className="mt-5 text-lg font-semibold">{details.first_name || "Your"} {details.last_name}</h2><p className="mt-1 text-sm text-muted-foreground">{profile.email}</p><span className="mt-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{profile.role.name}</span><p className="mt-6 text-xs leading-5 text-muted-foreground">Upload a new JPG, PNG, or WEBP photo (maximum 2 MB). It is stored privately for your profile; existing Media Library images cannot be selected.</p></div></section><div className="space-y-6"><form onSubmit={saveDetails} className="rounded-2xl border bg-card p-6 shadow-sm"><div className="mb-6 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div><div><h2 className="font-semibold">Personal information</h2><p className="text-sm text-muted-foreground">You can update your phone number. Name changes require a Super Admin.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">First name<input className={`${inputClass} cursor-not-allowed opacity-70`} value={details.first_name} disabled /></label><label className="space-y-2 text-sm font-medium">Last name<input className={`${inputClass} cursor-not-allowed opacity-70`} value={details.last_name} disabled /></label><label className="space-y-2 text-sm font-medium sm:col-span-2">Email<input className={`${inputClass} cursor-not-allowed opacity-70`} value={profile.email ?? ""} disabled /><span className="block text-xs font-normal text-muted-foreground">Contact a Super Admin to change your name or email address.</span></label><label className="space-y-2 text-sm font-medium sm:col-span-2">Phone<input className={inputClass} value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} /></label></div><div className="mt-6 flex justify-end"><Button type="submit" disabled={savingDetails}>{savingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save phone</Button></div></form><form onSubmit={savePassword} className="rounded-2xl border bg-card p-6 shadow-sm"><div className="mb-6 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></div><div><h2 className="font-semibold">Change password</h2><p className="text-sm text-muted-foreground">Use at least 12 characters including a letter and a number.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium sm:col-span-2">Current password<input className={inputClass} type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label><label className="space-y-2 text-sm font-medium">New password<input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} required /></label><label className="space-y-2 text-sm font-medium">Confirm password<input className={inputClass} type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={12} required /></label></div><div className="mt-6 flex justify-end"><Button type="submit" disabled={savingPassword}>{savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Change password</Button></div></form>{message && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{message}</p>}{error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}</div></div></div>;
}
