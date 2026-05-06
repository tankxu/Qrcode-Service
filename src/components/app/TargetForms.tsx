import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical, Plus, Trash2, Upload, Loader2, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { qrsApi, type ImagePayload, type UrlPayload, type MultilinkPayload, type TargetType } from "@/src/lib/api";
import { toast } from "sonner";

export type TargetValue =
  | { type: "image"; payload: ImagePayload }
  | { type: "url"; payload: UrlPayload }
  | { type: "multilink"; payload: MultilinkPayload };

export function emptyTarget(type: TargetType): TargetValue {
  if (type === "image") return { type, payload: { r2_key: "", mime: "image/png" } };
  if (type === "url") return { type, payload: { url: "" } };
  return { type, payload: { title: "", description: "", items: [{ label: "", url: "" }] } };
}

interface Props {
  value: TargetValue;
  onChange: (v: TargetValue) => void;
}

export function TargetForm({ value, onChange }: Props) {
  if (value.type === "image") return <ImageForm value={value.payload} onChange={(p) => onChange({ type: "image", payload: p })} />;
  if (value.type === "url") return <UrlForm value={value.payload} onChange={(p) => onChange({ type: "url", payload: p })} />;
  return <MultilinkForm value={value.payload} onChange={(p) => onChange({ type: "multilink", payload: p })} />;
}

function ImageForm({ value, onChange }: { value: ImagePayload; onChange: (v: ImagePayload) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("targetForm.image.tooLarge"));
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error(t("targetForm.image.unsupported"));
      return;
    }
    setUploading(true);
    try {
      const res = await qrsApi.uploadImage(file);
      onChange({ r2_key: res.r2_key, mime: res.mime as ImagePayload["mime"] });
      toast.success(t("targetForm.image.uploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("targetForm.image.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 block">
        {t("targetForm.image.label")}
      </label>
      {value.r2_key ? (
        <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
          <img src={`/r/${value.r2_key}`} alt="" className="w-full max-h-80 object-contain" />
          <button
            type="button"
            onClick={() => onChange({ r2_key: "", mime: "image/png" })}
            className="absolute top-2 right-2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 hover:border-red-200"
            aria-label={t("common.remove")}
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-12 px-6 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> : <Upload className="w-6 h-6 text-slate-400" />}
          <span className="text-sm font-medium text-slate-600">{uploading ? t("common.uploading") : t("targetForm.image.uploadCta")}</span>
          <span className="text-xs text-slate-400">{t("targetForm.image.uploadHint")}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function UrlForm({ value, onChange }: { value: UrlPayload; onChange: (v: UrlPayload) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("targetForm.url.label")}</label>
      <Input
        type="url"
        placeholder={t("targetForm.url.placeholder")}
        value={value.url}
        onChange={(e) => onChange({ url: e.target.value })}
        className="h-12"
      />
      <p className="text-xs text-slate-500">{t("targetForm.url.hint")}</p>
    </div>
  );
}

function MultilinkForm({ value, onChange }: { value: MultilinkPayload; onChange: (v: MultilinkPayload) => void }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const { t } = useTranslation();

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = value.items.findIndex((_, i) => `item-${i}` === active.id);
    const newIdx = value.items.findIndex((_, i) => `item-${i}` === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const items = [...value.items];
    const [moved] = items.splice(oldIdx, 1);
    items.splice(newIdx, 0, moved);
    onChange({ ...value, items });
  };

  const updateItem = (i: number, patch: Partial<{ label: string; url: string }>) => {
    const items = value.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange({ ...value, items });
  };

  const removeItem = (i: number) => {
    if (value.items.length === 1) return;
    onChange({ ...value, items: value.items.filter((_, idx) => idx !== i) });
  };

  const addItem = () => {
    if (value.items.length >= 10) {
      toast.error(t("targetForm.multilink.maxReached"));
      return;
    }
    onChange({ ...value, items: [...value.items, { label: "", url: "" }] });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("targetForm.multilink.pageTitle")}</label>
        <Input
          placeholder={t("targetForm.multilink.pageTitlePlaceholder")}
          value={value.title || ""}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className="h-11"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("targetForm.multilink.pageDesc")}</label>
        <Input
          placeholder={t("targetForm.multilink.pageDescPlaceholder")}
          value={value.description || ""}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className="h-11"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("targetForm.multilink.links")}</label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value.items.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {value.items.map((item, i) => (
                <SortableLinkRow
                  key={`item-${i}`}
                  id={`item-${i}`}
                  item={item}
                  onChange={(patch) => updateItem(i, patch)}
                  onRemove={() => removeItem(i)}
                  canRemove={value.items.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button type="button" variant="outline" onClick={addItem} className="w-full">
          <Plus className="w-4 h-4 mr-1" />
          {t("targetForm.multilink.addLink")}
        </Button>
      </div>
    </div>
  );
}

function SortableLinkRow({
  id,
  item,
  onChange,
  onRemove,
  canRemove,
}: {
  id: string;
  item: { label: string; url: string };
  onChange: (patch: Partial<{ label: string; url: string }>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const { t } = useTranslation();
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
      <button type="button" {...attributes} {...listeners} className="text-slate-400 hover:text-slate-600 cursor-grab" aria-label={t("targetForm.multilink.dragHandle")}>
        <GripVertical className="w-4 h-4" />
      </button>
      <Input
        placeholder={t("targetForm.multilink.linkLabel")}
        value={item.label}
        onChange={(e) => onChange({ label: e.target.value })}
        className="h-9 flex-1"
      />
      <Input
        type="url"
        placeholder={t("targetForm.multilink.linkUrl")}
        value={item.url}
        onChange={(e) => onChange({ url: e.target.value })}
        className="h-9 flex-2"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400"
        aria-label={t("targetForm.multilink.remove")}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
