
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  ImageIcon,
  Loader2,
  Pencil,
  X,
} from "lucide-react";

import { toast } from "sonner";

import type { Country } from "@/types/country";

import { updateCountryAction } from "@/actions/countries/actions";

import {
  createCountrySchema,
  type UpdateCountryInput,
} from "@/lib/countries/validations";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { MEDIA_FOLDERS } from "@/lib/imagekit/upload-client";

interface EditCountryDialogProps {
  country: Country | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type CountryForm = {
  name: string;
  slug: string;
  iso_code: string;
  phone_code: string;
  description: string;
  image_url: string;
  image_asset_id: string;
  status: "active" | "inactive";
};

type FieldErrors = Partial<
  Record<keyof CountryForm, string[]>
>;

function getFormFromCountry(country: Country): CountryForm {
  return {
    name: country.name ?? "",
    slug: country.slug ?? "",
    iso_code: country.iso_code ?? "",
    phone_code: country.phone_code ?? "",
    description: country.description ?? "",
    image_url: country.image_url ?? "",
    image_asset_id: country.image_asset_id ?? "",
    status:
      country.status === "inactive"
        ? "inactive"
        : "active",
  };
}

/* =========================================================
   OUTER DIALOG
   ========================================================= */

export function EditCountryDialog({
  country,
  open,
  onOpenChange,
  onSuccess,
}: EditCountryDialogProps) {
  if (!country) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          flex
          max-h-[90vh]
          flex-col
          gap-0
          overflow-hidden
          border-border
          bg-background
          p-0
          shadow-2xl
          sm:max-w-170
        "
      >
        {/*
          Important:

          We use key instead of useEffect.

          Whenever country changes OR dialog opens again,
          the form component gets a fresh instance.

          This completely avoids:
          setForm(...)
          inside useEffect.
        */}
        <EditCountryForm
          key={`${country.id}-${open}`}
          country={country}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   FORM COMPONENT
   ========================================================= */

interface EditCountryFormProps {
  country: Country;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function EditCountryForm({
  country,
  onOpenChange,
  onSuccess,
}: EditCountryFormProps) {
  const router = useRouter();

  /*
   * Form is initialized directly from country.
   *
   * No useEffect.
   * No setForm inside effect.
   */
  const initialForm = useMemo(
    () => getFormFromCountry(country),
    [country]
  );

  const [form, setForm] =
    useState<CountryForm>(initialForm);

  const [originalForm] =
    useState<CountryForm>(initialForm);

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [error, setError] =
    useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [mediaPickerOpen, setMediaPickerOpen] =
    useState(false);

  /* =========================================================
     CHECK CHANGES
     ========================================================= */

  const hasChanges = useMemo(() => {
    return (
      form.name !== originalForm.name ||
      form.slug !== originalForm.slug ||
      form.iso_code !== originalForm.iso_code ||
      form.phone_code !== originalForm.phone_code ||
      form.description !== originalForm.description ||
      form.image_url !== originalForm.image_url ||
      form.image_asset_id !== originalForm.image_asset_id ||
      form.status !== originalForm.status
    );
  }, [form, originalForm]);

  /* =========================================================
     UPDATE FIELD
     ========================================================= */

  const updateField = <K extends keyof CountryForm>(
    field: K,
    value: CountryForm[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };

      delete next[field];

      return next;
    });

    setError(null);
  };

  /* =========================================================
     CANCEL
     ========================================================= */

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    if (hasChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );

      if (!confirmed) {
        return;
      }
    }

    onOpenChange(false);
  };

  /* =========================================================
     SUBMIT
     ========================================================= */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError(null);
    setFieldErrors({});

    /*
     * No changes.
     */
    if (!hasChanges) {
      return;
    }

    /*
     * Client-side validation.
     */
    const validation =
      createCountrySchema.safeParse({
        name: form.name.trim(),

        slug: form.slug.trim(),

        iso_code:
          form.iso_code.trim() === ""
            ? null
            : form.iso_code.trim().toUpperCase(),

        phone_code:
          form.phone_code.trim() === ""
            ? null
            : form.phone_code.trim(),

        description:
          form.description.trim() === ""
            ? null
            : form.description.trim(),

        image_url:
          form.image_url.trim() === ""
            ? null
            : form.image_url.trim(),

        image_asset_id:
          form.image_asset_id.trim() === ""
            ? null
            : form.image_asset_id.trim(),

        status: form.status,
      });

    /*
     * Validation failed.
     */
    if (!validation.success) {
      const errors =
        validation.error.flatten().fieldErrors;

      setFieldErrors(errors as FieldErrors);

      setError(
        "Please correct the highlighted fields."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UpdateCountryInput =
        validation.data;

      const result =
        await updateCountryAction(
          country.id,
          payload
        );

      /*
       * Server/action error.
       */
      if (!result.success) {
        setError(result.error);

        if ("fieldErrors" in result && result.fieldErrors) {
          setFieldErrors(
            result.fieldErrors as FieldErrors
          );
        }

        return;
      }

      /*
       * SUCCESS
       */

      toast.success("Updated successfully", {
        description: `${form.name} has been updated.`,
      });

      /*
       * Close dialog.
       */
      onOpenChange(false);

      /*
       * Optional callback.
       */
      onSuccess?.();

      /*
       * Refresh server component/table.
       */
      router.refresh();
    } catch (error) {
      console.error(
        "Update country error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while updating the country."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================================
     DIALOG CONTENT
     ========================================================= */

  return (
    <>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <DialogHeader
        className="
          shrink-0
          border-b
          border-border
          bg-card
          px-6
          py-5
        "
      >
        <div className="flex items-start gap-3">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-primary/15
              text-primary
            "
          >
            <Pencil className="h-5 w-5" />
          </div>

          <div>
            <DialogTitle
              className="
                text-lg
                font-semibold
                tracking-tight
                text-foreground
              "
            >
              Edit Country
            </DialogTitle>

            <p
              className="
                mt-1
                text-sm
                text-muted-foreground
              "
            >
              Update the country information below.
            </p>
          </div>
        </div>
      </DialogHeader>

      {/* =====================================================
          FORM
      ===================================================== */}

      <form
        onSubmit={handleSubmit}
        className="
          flex
          min-h-0
          flex-1
          flex-col
          overflow-hidden
        "
      >
        {/* ===================================================
            SCROLLABLE CONTENT
        =================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-6
            py-6
          "
        >
          <div className="space-y-6">

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div
                className="
                  rounded-xl
                  border
                  border-destructive/20
                  bg-destructive/10
                  px-4
                  py-3
                "
              >
                <div className="flex gap-3">
                  <div
                    className="
                      mt-0.5
                      flex
                      h-5
                      w-5
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-destructive/15
                      text-destructive
                    "
                  >
                    <X className="h-3 w-3" />
                  </div>

                  <div>
                    <p
                      className="
                        text-sm
                        font-medium
                        text-destructive
                      "
                    >
                      Unable to update country
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-xs
                        text-destructive/80
                      "
                    >
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================
                BASIC INFORMATION
            ================================================= */}

            <section className="space-y-4">
              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  Basic Information
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  Basic details used throughout
                  the travel platform.
                </p>
              </div>

              {/* COUNTRY NAME */}

              <div className="space-y-2">
                <Label htmlFor="country-name">
                  Country Name
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  id="country-name"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="e.g. India"
                  disabled={isSubmitting}
                  className={`
                    h-11
                    bg-background
                    ${
                      fieldErrors.name
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  `}
                />

                {fieldErrors.name?.[0] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.name[0]}
                  </p>
                )}
              </div>

              {/* SLUG */}

              <div className="space-y-2">
                <Label htmlFor="country-slug">
                  Slug
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  id="country-slug"
                  value={form.slug}
                  onChange={(event) =>
                    updateField(
                      "slug",
                      event.target.value.toLowerCase()
                    )
                  }
                  placeholder="e.g. india"
                  disabled={isSubmitting}
                  className={`
                    h-11
                    bg-background
                    ${
                      fieldErrors.slug
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  `}
                />

                {fieldErrors.slug?.[0] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.slug[0]}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Use lowercase letters, numbers and
                  hyphens.
                </p>
              </div>
            </section>

            {/* =================================================
                COUNTRY CODES
            ================================================= */}

            <section className="space-y-4">
              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  Country Codes
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  International identification and
                  phone information.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                {/* ISO */}

                <div className="space-y-2">
                  <Label htmlFor="iso-code">
                    ISO Code
                  </Label>

                  <Input
                    id="iso-code"
                    value={form.iso_code}
                    onChange={(event) =>
                      updateField(
                        "iso_code",
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z]/g, "")
                          .slice(0, 2)
                      )
                    }
                    placeholder="IN"
                    maxLength={2}
                    disabled={isSubmitting}
                    className={`
                      h-11
                      bg-background
                      uppercase
                      ${
                        fieldErrors.iso_code
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    `}
                  />

                  {fieldErrors.iso_code?.[0] && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.iso_code[0]}
                    </p>
                  )}
                </div>

                {/* PHONE */}

                <div className="space-y-2">
                  <Label htmlFor="phone-code">
                    Phone Code
                  </Label>

                  <Input
                    id="phone-code"
                    value={form.phone_code}
                    onChange={(event) =>
                      updateField(
                        "phone_code",
                        event.target.value
                          .replace(/[^\d+]/g, "")
                          .replace(
                            /^(?!\+).*$/,
                            ""
                          )
                          .slice(0, 5)
                      )
                    }
                    placeholder="+91"
                    maxLength={5}
                    disabled={isSubmitting}
                    className={`
                      h-11
                      bg-background
                      ${
                        fieldErrors.phone_code
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    `}
                  />

                  {fieldErrors.phone_code?.[0] && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.phone_code[0]}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <section className="space-y-4">
              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  Description
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  Optional information about this
                  country.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country-description">
                  Description
                </Label>

                <Textarea
                  id="country-description"
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Enter country description..."
                  rows={5}
                  disabled={isSubmitting}
                  className={`
                    resize-none
                    bg-background
                    ${
                      fieldErrors.description
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  `}
                />

                <div className="flex justify-between">
                  <div>
                    {fieldErrors.description?.[0] && (
                      <p className="text-xs text-destructive">
                        {fieldErrors.description[0]}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {form.description.length}/1000
                  </span>
                </div>
              </div>
            </section>

            {/* =================================================
                IMAGE
            ================================================= */}

            <section className="space-y-4">
              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  Country Image
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  Provide a publicly accessible image
                  URL.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-url">
                  Image URL
                </Label>

                <div className="relative">
                  <ImageIcon
                    className="
                      absolute
                      left-3
                      top-1/2
                      h-4
                      w-4
                      -translate-y-1/2
                      text-muted-foreground
                    "
                  />

                  <Input
                    id="image-url"
                    value={form.image_url}
                    onChange={(event) =>
                      updateField(
                        "image_url",
                        event.target.value
                      )
                    }
                    placeholder="https://example.com/india.webp"
                    disabled={isSubmitting}
                    className={`
                      h-11
                      bg-background
                      pl-10
                      ${
                        fieldErrors.image_url
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    `}
                  />
                </div>

                {fieldErrors.image_url?.[0] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.image_url[0]}
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMediaPickerOpen(true)}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Choose from Media Library
                </Button>
              </div>

              {/* IMAGE PREVIEW */}

              {form.image_url.trim() && (
                <div
                  className="
                    overflow-hidden
                    rounded-xl
                    border
                    border-border
                    bg-muted/30
                  "
                >
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        overflow-hidden
                        rounded-lg
                        border
                        border-border
                        bg-background
                      "
                    >
                      <Image
                        src={form.image_url}
                        alt="Country preview"
                        className="
                          h-full
                          w-full
                          object-cover
                        "
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p
                        className="
                          text-xs
                          font-medium
                          text-foreground
                        "
                      >
                        Image preview
                      </p>

                      <p
                        className="
                          truncate
                          text-xs
                          text-muted-foreground
                        "
                      >
                        {form.image_url}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* =================================================
                STATUS
            ================================================= */}

            <section className="space-y-4">
              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  Status
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  Control whether this country is
                  available on the platform.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country-status">
                  Country Status
                </Label>

                <Select
                  value={form.status}
                  onValueChange={(
                    value: string | null
                  ) => {
                    if (
                      value === "active" ||
                      value === "inactive"
                    ) {
                      updateField(
                        "status",
                        value
                      );
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="country-status"
                    className="h-11 bg-background"
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <span
                          className="
                            h-2
                            w-2
                            rounded-full
                            bg-primary
                          "
                        />

                        <span>Active</span>
                      </div>
                    </SelectItem>

                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <span
                          className="
                            h-2
                            w-2
                            rounded-full
                            bg-muted-foreground
                          "
                        />

                        <span>Inactive</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {fieldErrors.status?.[0] && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.status[0]}
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* =====================================================
            UNSAVED CHANGES
        ===================================================== */}
{hasChanges && (
  <div
    className="
      shrink-0
      border-t-2
      border-primary
      bg-card
      px-6
      py-3
    "
  >
    <div className="flex items-center justify-between gap-4">
      {/* Message */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Icon */}
        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-primary
            text-primary-foreground
            shadow-sm
          "
        >
          <CheckCircle2 className="h-4.5 w-4.5" />
        </div>

        {/* Text */}
        <div className="min-w-0">
          <p
            className="
              text-sm
              font-semibold
              leading-5
              text-foreground
            "
          >
            You have unsaved changes
          </p>

          <p
            className="
              mt-0.5
              text-xs
              font-medium
              leading-4
              text-muted-foreground
            "
          >
           You haven&apos;t saved your changes
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div
        className="
          hidden
          shrink-0
          items-center
          gap-1.5
          rounded-full
          border
          border-primary/40
          bg-primary/10
          px-3
          py-1.5
          text-xs
          font-semibold
          text-foreground
          sm:flex
        "
      >
        <span className="h-2 w-2 rounded-full bg-primary" />
        Unsaved
      </div>
    </div>
  </div>
)}
        {/* =====================================================
            FOOTER
        ===================================================== */}

        <DialogFooter
          className="
            shrink-0
            flex
            flex-row
            items-center
            justify-end
            gap-3
            border-t
            border-border
            bg-card
            px-6
            py-5
            sm:px-7
            sm:py-5
          "
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="
              h-10
              min-w-25
              border-border
              bg-background
              transition-colors
              hover:bg-muted
            "
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={
              !hasChanges ||
              isSubmitting
            }
            className="
              h-10
              min-w-30
              bg-primary
              font-medium
              text-primary-foreground
              shadow-sm
              transition-all
              hover:bg-primary/90
              hover:shadow-md
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                Update
              </>
            )}
          </Button>
        </DialogFooter>
      </form>

      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        folder={MEDIA_FOLDERS.COUNTRIES}
        fileNamePrefix={form.slug || "country"}
        altText={form.name || "Country image"}
        onSelect={(asset) => {
          updateField("image_url", asset.original_url);
          updateField("image_asset_id", asset.id);
        }}
      />
    </>
  );
}
