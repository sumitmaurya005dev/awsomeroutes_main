"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";

import type { RegionWithCountry } from "@/lib/regions/queries";
import {
  MEDIA_FOLDERS,
  uploadImageToImageKit,
} from "@/lib/imagekit/upload-client";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditRegionDialogProps {
  region: RegionWithCountry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function EditRegionDialog({
  region,
  open,
  onOpenChange,
}: EditRegionDialogProps) {
  const router = useRouter();

  const fileInputRef =
    React.useRef<HTMLInputElement>(null);

  const originalImageUrl =
    region.image_url ?? "";

  const originalImageAssetId =
    region.image_asset_id ?? "";

  const [name, setName] = React.useState(
    region.name
  );

  const [slug, setSlug] = React.useState(
    region.slug
  );

  const [description, setDescription] =
    React.useState(
      region.description ?? ""
    );

  const [status, setStatus] =
    React.useState<"active" | "inactive">(
      region.status === "inactive"
        ? "inactive"
        : "active"
    );

  const [imageUrl, setImageUrl] =
    React.useState(originalImageUrl);

  const [imageAssetId, setImageAssetId] =
    React.useState(originalImageAssetId);

  const [previewUrl, setPreviewUrl] =
    React.useState(originalImageUrl);

  const [selectedFile, setSelectedFile] =
    React.useState<File | null>(null);

  const [uploadProgress, setUploadProgress] =
    React.useState(0);

  const [uploading, setUploading] =
    React.useState(false);

  const [saving, setSaving] =
    React.useState(false);

  const [error, setError] =
    React.useState<string | null>(null);

  const [mediaPickerOpen, setMediaPickerOpen] =
    React.useState(false);

  const hasChanges =
    name !== region.name ||
    slug !== region.slug ||
    description !==
      (region.description ?? "") ||
    status !== region.status ||
    imageUrl !== originalImageUrl ||
    imageAssetId !== originalImageAssetId ||
    selectedFile !== null;

  const revokeLocalPreview = () => {
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const resetForm = () => {
    revokeLocalPreview();

    const existingImageUrl =
      region.image_url ?? "";

    setName(region.name);
    setSlug(region.slug);
    setDescription(region.description ?? "");

    setStatus(
      region.status === "inactive"
        ? "inactive"
        : "active"
    );

    setImageUrl(existingImageUrl);
    setImageAssetId(
      region.image_asset_id ?? ""
    );
    setPreviewUrl(existingImageUrl);
    setSelectedFile(null);
    setUploadProgress(0);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please select a PNG, JPG, JPEG, or WEBP image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image size must be less than 5 MB."
      );
      event.target.value = "";
      return;
    }

    revokeLocalPreview();

    const localPreviewUrl =
      URL.createObjectURL(file);

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(localPreviewUrl);

    // New image has not been uploaded yet.
    setImageUrl("");
    setImageAssetId("");
    setUploadProgress(0);

    // Allow selecting the same file again.
    event.target.value = "";
  };

  const handleChangeImage = () => {
    if (saving || uploading) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    if (saving || uploading) {
      return;
    }

    revokeLocalPreview();

    setSelectedFile(null);
    setPreviewUrl("");
    setImageUrl("");
    setImageAssetId("");
    setUploadProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!hasChanges) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Region name is required.");
      return;
    }

    const finalSlug = slug.trim()
      ? generateSlug(slug)
      : generateSlug(trimmedName);

    if (!finalSlug) {
      setError("A valid region slug is required.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      let finalImageUrl = imageUrl;
      let finalImageAssetId = imageAssetId;

      if (selectedFile) {
        setUploading(true);
        setUploadProgress(0);

        try {
          const mediaAsset =
            await uploadImageToImageKit({
              file: selectedFile,
              folder: MEDIA_FOLDERS.REGIONS,
              fileNamePrefix: finalSlug,
              altText: trimmedName,
              onProgress: setUploadProgress,
            });

          finalImageUrl =
            mediaAsset.original_url;
          finalImageAssetId = mediaAsset.id;
        } finally {
          setUploading(false);
        }
      }

      const response = await fetch(
        `/api/regions/${region.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
            slug: finalSlug,
            description:
              description.trim() || null,
            status,
            image_url: finalImageUrl || null,
            image_asset_id:
              finalImageAssetId || null,
          }),
        }
      );

      const responseText = await response.text();

      let result: {
        error?: string;
      };

      try {
        result = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        console.error(
          "Region PATCH raw response:",
          responseText
        );

        throw new Error(
          `Region update API returned an invalid response (status ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            `Failed to update region (status ${response.status}).`
        );
      }

      revokeLocalPreview();

      setName(trimmedName);
      setSlug(finalSlug);
      setImageUrl(finalImageUrl);
      setImageAssetId(finalImageAssetId);
      setPreviewUrl(finalImageUrl);
      setSelectedFile(null);

      onOpenChange(false);
      router.refresh();
    } catch (submitError) {
      console.error(
        "Update region error:",
        submitError
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update region."
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDialogChange = (
    value: boolean
  ) => {
    if (saving || uploading) {
      return;
    }

    if (!value) {
      resetForm();
    }

    onOpenChange(value);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleDialogChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-150">
        <DialogHeader>
          <DialogTitle>
            Edit Region
          </DialogTitle>

          <DialogDescription>
            Update region information, status,
            and image.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label>Country</Label>

            <div className="flex h-10 items-center rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground">
              {region.country?.name ??
                "Unknown country"}
            </div>

            <p className="text-xs text-muted-foreground">
              Country cannot be changed from this
              dialog.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region-name">
              Region Name
            </Label>

            <Input
              id="region-name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter region name"
              disabled={saving || uploading}
              className="h-10 rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region-slug">
              Slug
            </Label>

            <Input
              id="region-slug"
              value={slug}
              onChange={(event) =>
                setSlug(event.target.value)
              }
              placeholder="region-slug"
              disabled={saving || uploading}
              className="h-10 rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region-description">
              Description
            </Label>

            <Textarea
              id="region-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Enter region description"
              rows={4}
              disabled={saving || uploading}
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>

            <Select
              value={status}
              onValueChange={(value) => {
                if (
                  value === "active" ||
                  value === "inactive"
                ) {
                  setStatus(value);
                }
              }}
              disabled={saving || uploading}
            >
              <SelectTrigger className="h-10 w-full rounded-lg">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="active">
                  Active
                </SelectItem>

                <SelectItem value="inactive">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Region Image</Label>

            {previewUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
                <Image
                  src={previewUrl}
                  alt={name || "Region image"}
                  width={800}
                  height={450}
                  className="h-52 w-full object-cover"
                  unoptimized
                />

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleRemoveImage}
                  disabled={saving || uploading}
                  className="absolute right-3 top-3 h-8 w-8 rounded-full"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </Button>

                {selectedFile && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2 text-xs text-white">
                    New image selected — it will upload
                    when you save changes.
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleChangeImage}
                disabled={saving || uploading}
                className="flex h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
              >
                <ImagePlus className="mb-2 h-8 w-8" />

                <span className="text-sm font-medium text-foreground">
                  Upload region image
                </span>

                <span className="mt-1 text-xs">
                  PNG, JPG, JPEG or WEBP · Maximum 5 MB
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageSelect}
              className="hidden"
              disabled={saving || uploading}
            />

            {uploading && (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />

                    <span className="font-medium text-foreground">
                      Uploading to ImageKit...
                    </span>
                  </div>

                  <span className="font-medium text-primary">
                    {uploadProgress}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-150"
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleChangeImage}
              disabled={saving || uploading}
              className="h-10 w-full rounded-lg"
            >
              <ImagePlus className="mr-2 h-4 w-4" />

              {previewUrl
                ? "Change Image"
                : "Select Image"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setMediaPickerOpen(true)}
              disabled={saving || uploading}
              className="h-10 w-full rounded-lg"
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Choose from Media Library
            </Button>

            <p className="text-xs text-muted-foreground">
              New images upload only after Save
              Changes. Previous ImageKit images stay
              unchanged.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleDialogChange(false)
              }
              disabled={saving || uploading}
              className="h-10 rounded-lg"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                !hasChanges ||
                saving ||
                uploading
              }
              className="h-10 rounded-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
        <MediaPickerDialog
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          folder={MEDIA_FOLDERS.REGIONS}
          fileNamePrefix={slug || "region"}
          altText={name || "Region image"}
          onSelect={(asset) => {
            revokeLocalPreview();
            setSelectedFile(null);
            setImageUrl(asset.original_url);
            setImageAssetId(asset.id);
            setPreviewUrl(asset.original_url);
            setError(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
