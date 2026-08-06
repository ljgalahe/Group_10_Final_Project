"use client";

import { useEffect, useRef, useState } from "react";
import {
  demoPhotosFromPair,
  landscapePairById,
  landscapePairByIndex,
  looksLikeStaleDemoPhotos,
} from "@/lib/landscape-proof-photos";

/** v3: local commercial /proof assets (clears cached Unsplash demos). */
const PHOTOS_PREFIX = "greenscape-crew-visit-photos:v3:";
const MAX_PHOTOS_PER_SIDE = 4;
const MAX_DIMENSION = 960;
const JPEG_QUALITY = 0.72;

export type VisitPhotosState = {
  before: string[];
  after: string[];
};

function emptyPhotos(): VisitPhotosState {
  return { before: [], after: [] };
}

export function loadVisitPhotos(jobId: string): VisitPhotosState {
  if (typeof window === "undefined") return emptyPhotos();
  try {
    const raw = window.localStorage.getItem(PHOTOS_PREFIX + jobId);
    if (!raw) return emptyPhotos();
    const parsed = JSON.parse(raw) as VisitPhotosState;
    return {
      before: Array.isArray(parsed.before) ? parsed.before : [],
      after: Array.isArray(parsed.after) ? parsed.after : [],
    };
  } catch {
    return emptyPhotos();
  }
}

export function saveVisitPhotos(jobId: string, photos: VisitPhotosState) {
  window.localStorage.setItem(PHOTOS_PREFIX + jobId, JSON.stringify(photos));
}

/**
 * Matched before/after pairs per seeded visit — index 0 before ↔ index 0 after
 * are the same place/job type (e.g. unmowed lawn → mowed lawn).
 */
const COMPLETED_DEMO_PHOTOS: Record<string, VisitPhotosState> = {
  // Riverside grounds — mow + plant flower bed
  "33333333-3333-3333-3333-333333333301": demoPhotosFromPair(
    landscapePairById("lawn-mow"),
    landscapePairById("flower-bed")
  ),
  // Riverside — hedge trim + mulch bed
  "33333333-3333-3333-3333-333333333302": demoPhotosFromPair(
    landscapePairById("hedge-trim"),
    landscapePairById("mulch-bed")
  ),
  // Summit retail frontage — leaf cleanup + lawn mow
  "33333333-3333-3333-3333-333333333304": demoPhotosFromPair(
    landscapePairById("leaf-cleanup"),
    landscapePairById("lawn-mow")
  ),
  // Metro detention / grounds — sod + leaf cleanup
  "33333333-3333-3333-3333-333333333305": demoPhotosFromPair(
    landscapePairById("sod-install"),
    landscapePairById("leaf-cleanup")
  ),
  // Riverside irrigation / courtyard beds — flower bed + mulch
  "33333333-3333-3333-3333-333333333308": demoPhotosFromPair(
    landscapePairById("flower-bed"),
    landscapePairById("mulch-bed")
  ),
  // Riverside parking lot islands — mulch + hedge
  "33333333-3333-3333-3333-333333333310": demoPhotosFromPair(
    landscapePairById("mulch-bed"),
    landscapePairById("hedge-trim")
  ),
};

function hashJobId(jobId: string): number {
  let h = 0;
  for (let i = 0; i < jobId.length; i++) {
    h = (h * 31 + jobId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function demoPhotosForCompletedVisit(jobId: string): VisitPhotosState {
  const seeded = COMPLETED_DEMO_PHOTOS[jobId];
  if (seeded) return seeded;
  const i = hashJobId(jobId);
  return demoPhotosFromPair(
    landscapePairByIndex(i),
    landscapePairByIndex(i + 1)
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Could not read image"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function compressDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(
        1,
        MAX_DIMENSION / Math.max(image.width, image.height)
      );
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function PhotoGrid({
  label,
  photos,
  canEdit,
  onAdd,
  onRemove,
  inputId,
}: {
  label: string;
  photos: string[];
  canEdit: boolean;
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  inputId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-sm font-semibold text-green-950">{label}</h5>
        {canEdit && photos.length < MAX_PHOTOS_PER_SIDE ? (
          <>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(e) => {
                onAdd(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md border border-green-800 px-2.5 py-1 text-xs font-medium text-green-900 hover:bg-green-50"
            >
              Take / Upload
            </button>
          </>
        ) : null}
      </div>

      {photos.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          {canEdit ? "No photos yet." : "No photos taken for this visit."}
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((src, index) => (
            <li
              key={`${label}-${index}-${src.slice(-32)}`}
              className="group relative overflow-hidden rounded-md border border-stone-200 bg-stone-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${label} ${index + 1}`}
                className="aspect-[4/3] w-full object-cover"
              />
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute right-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Before/after photo capture for the Crew Lead Visits page only.
 * Scheduled: take/upload. Completed: show saved or demo job photos.
 */
export function CrewVisitPhotos({
  jobId,
  status,
  readOnly = false,
}: {
  jobId: string;
  status: string;
  readOnly?: boolean;
}) {
  const [photos, setPhotos] = useState<VisitPhotosState>(emptyPhotos);
  const canEdit = status === "scheduled" && !readOnly;
  const isCompleted = status === "completed";

  useEffect(() => {
    const saved = loadVisitPhotos(jobId);
    const hasSaved = saved.before.length > 0 || saved.after.length > 0;
    const hasUserUpload = [...saved.before, ...saved.after].some((u) =>
      u.startsWith("data:")
    );

    if (hasSaved && hasUserUpload) {
      setPhotos(saved);
      return;
    }

    if (isCompleted) {
      // Always refresh seeded demos so proof assets stay current.
      const demo = demoPhotosForCompletedVisit(jobId);
      if (!hasSaved || looksLikeStaleDemoPhotos(saved)) {
        saveVisitPhotos(jobId, demo);
        setPhotos(demo);
        return;
      }
      setPhotos(saved);
      return;
    }

    if (hasSaved) {
      setPhotos(saved);
      return;
    }

    setPhotos(emptyPhotos());
  }, [jobId, isCompleted]);

  function persist(next: VisitPhotosState) {
    setPhotos(next);
    saveVisitPhotos(jobId, next);
  }

  async function addPhotos(side: "before" | "after", files: FileList | null) {
    if (!canEdit || !files || files.length === 0) return;
    const remaining = MAX_PHOTOS_PER_SIDE - photos[side].length;
    if (remaining <= 0) return;

    const selected = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remaining);

    const compressed: string[] = [];
    for (const file of selected) {
      const dataUrl = await readFileAsDataUrl(file);
      compressed.push(await compressDataUrl(dataUrl));
    }

    persist({
      ...photos,
      [side]: [...photos[side], ...compressed],
    });
  }

  function removePhoto(side: "before" | "after", index: number) {
    if (!canEdit) return;
    persist({
      ...photos,
      [side]: photos[side].filter((_, i) => i !== index),
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-green-950">
        Before & After Photos
      </h4>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <PhotoGrid
          label="Before"
          photos={photos.before}
          canEdit={canEdit}
          inputId={`before-photos-${jobId}`}
          onAdd={(files) => void addPhotos("before", files)}
          onRemove={(index) => removePhoto("before", index)}
        />
        <PhotoGrid
          label="After"
          photos={photos.after}
          canEdit={canEdit}
          inputId={`after-photos-${jobId}`}
          onAdd={(files) => void addPhotos("after", files)}
          onRemove={(index) => removePhoto("after", index)}
        />
      </div>
    </div>
  );
}
