"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MEDIA_FOLDERS, type MediaAsset, type MediaFolder, uploadImageToImageKit } from "@/lib/imagekit/upload-client";

type PickerAsset = Pick<MediaAsset, "id" | "original_url" | "file_name" | "folder" | "alt_text" | "width" | "height"> & {
  original_file_name?: string | null;
};

type MediaPickerResponse = {
  data?: PickerAsset[];
  count?: number;
  error?: string;
};

type MediaPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: MediaFolder;
  fileNamePrefix: string;
  altText?: string;
  onSelect: (asset: PickerAsset) => void;
  canUpload?: boolean;
};

const ALL_FOLDERS = "__all__";

export function MediaPickerDialog({
  open,
  onOpenChange,
  folder,
  fileNamePrefix,
  altText,
  onSelect,
  canUpload = true,
}: MediaPickerDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [assets, setAssets] = React.useState<PickerAsset[]>([]);
  const [search, setSearch] = React.useState("");
  const [folderFilter, setFolderFilter] = React.useState(ALL_FOLDERS);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadAssets = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ page: "1", pageSize: "48" });
      if (search.trim()) params.set("search", search.trim());
      if (folderFilter !== ALL_FOLDERS) params.set("folder", folderFilter);

      const response = await fetch(`/api/media?${params.toString()}`, { cache: "no-store" });
      const result = (await response.json()) as MediaPickerResponse;

      if (!response.ok) throw new Error(result.error ?? "Failed to load Media Library.");
      setAssets(result.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load Media Library.");
    } finally {
      setLoading(false);
    }
  }, [folderFilter, search]);

  React.useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => void loadAssets(), search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [open, search, folderFilter, loadAssets]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Use a JPG, PNG, or WEBP image smaller than 5 MB.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const asset = await uploadImageToImageKit({
        file,
        folder,
        fileNamePrefix: `${fileNamePrefix}-${Date.now()}`,
        altText,
      });
      onSelect(asset);
      onOpenChange(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>Select an existing image or upload a new one. New files are saved in {folder}.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search file name" className="pl-9" />
          </div>
          <select value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value={ALL_FOLDERS}>All folders</option>
            {Object.values(MEDIA_FOLDERS).map((item) => <option key={item} value={item}>{item.replace("/awesomeroutes/", "")}</option>)}
          </select>
          {canUpload && <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload new
          </Button>}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
        </div>

        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

        {loading ? (
          <div className="flex h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : assets.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {assets.map((asset) => (
              <button key={asset.id} type="button" onClick={() => { onSelect(asset); onOpenChange(false); }} className="group overflow-hidden rounded-xl border border-border text-left transition hover:border-primary hover:ring-2 hover:ring-primary/20">
                <Image src={asset.original_url} alt={asset.alt_text ?? asset.file_name} width={360} height={220} unoptimized className="h-28 w-full object-cover" />
                <div className="space-y-1 p-2"><p className="truncate text-xs font-medium">{asset.original_file_name ?? asset.file_name}</p><p className="truncate text-[11px] text-muted-foreground">{asset.folder.replace("/awesomeroutes/", "")}</p></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed text-muted-foreground"><ImagePlus className="mb-2 h-7 w-7" /><p className="text-sm">No images found.</p></div>
        )}
      </DialogContent>
    </Dialog>
  );
}
