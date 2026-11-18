"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Crosshair, Sparkles, Upload } from "lucide-react";
import { equipDefenseItem, purchaseDefenseItem, type ShopActionResult } from "@/app/games/shop/actions";

export function ShopItemAction({ className = "", itemId, kind, price }: { className?: string; itemId: string; kind: "purchase" | "equip"; price?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const scrollPosition = captureShopPosition(itemId);
    setMessage(null);
    startTransition(async () => {
      const result = kind === "purchase"
        ? await purchaseDefenseItem(formData)
        : await equipDefenseItem(formData);
      const feedback = actionFeedback(result);
      setMessage(feedback.message);
      setIsError(feedback.error);
      if (!feedback.error) {
        router.refresh();
        restoreShopPosition(scrollPosition);
      }
    });
  }

  return <form onSubmit={submit} className={className}>
    <input type="hidden" name="itemId" value={itemId} />
    <button className={kind === "purchase" ? "nova-button !min-h-10 !w-full !rounded-xl" : "nova-button-secondary !min-h-10 !w-full !rounded-xl"} type="submit" disabled={pending}>
      {kind === "purchase" ? <Sparkles size={14} /> : <Crosshair size={14} />}
      {pending ? "Сохраняем..." : kind === "purchase" ? `Купить за ${price ?? 0}` : "Экипировать"}
    </button>
    {message && <p className={isError ? "mt-2 text-center text-[9px] text-red-300" : "mt-2 text-center text-[9px] text-emerald-300"}>{message}</p>}
  </form>;
}

export function ShopMediaUpload({ customUrl, kind }: { customUrl?: string | null; kind: "avatar" | "music" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const itemId = kind === "music" ? "music-custom" : "avatar-custom";
    const scrollPosition = captureShopPosition(itemId);
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile/media", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        setIsError(true);
        setMessage(uploadError(payload?.error));
        return;
      }
      setIsError(false);
      setMessage("Файл загружен и сразу используется");
      form.reset();
      router.refresh();
      restoreShopPosition(scrollPosition);
    } catch {
      setIsError(true);
      setMessage("Не удалось загрузить файл. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} encType="multipart/form-data" className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
    <input type="hidden" name="kind" value={kind} />
    <input className="block w-full text-[10px] text-white/45 file:mr-2 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-[9px] file:font-semibold file:text-white/70" type="file" name="file" required accept={kind === "music" ? "audio/mpeg,.mp3" : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"} />
    <button className="nova-button mt-3 !min-h-9 !w-full !rounded-lg" type="submit" disabled={pending}><Upload size={13} /> {pending ? "Загружаем..." : customUrl ? "Заменить файл" : "Загрузить и использовать"}</button>
    {message && <p className={isError ? "mt-2 text-center text-[9px] text-red-300" : "mt-2 text-center text-[9px] text-emerald-300"}>{message}</p>}
  </form>;
}

function actionFeedback(result: ShopActionResult) {
  if (result.status === "bought") return { error: false, message: "Куплено и сразу экипировано" };
  if (result.status === "equipped") return { error: false, message: "Предмет экипирован" };
  if (result.status === "owned") return { error: false, message: "Предмет уже в коллекции" };
  if (result.status === "credits") return { error: true, message: "Недостаточно NOVA Credits" };
  if (result.status === "not-owned") return { error: true, message: "Сначала купите этот предмет" };
  if (result.status === "upload-first") return { error: true, message: "Сначала загрузите свой файл" };
  return { error: true, message: "Не удалось выполнить действие" };
}

function uploadError(error?: string) {
  if (error === "avatar-format") return "Нужен JPG, PNG или WebP до 4 МБ";
  if (error === "music-format") return "Нужен настоящий MP3 до 12 МБ";
  if (error === "not-owned") return "Сначала купите персональный слот";
  if (error === "login") return "Войдите в аккаунт снова";
  return "Не удалось загрузить файл. Попробуйте ещё раз.";
}

type ShopScrollPosition = { itemId: string; itemOffset: number | null; pageY: number };

function captureShopPosition(itemId: string): ShopScrollPosition {
  const item = document.getElementById(`shop-item-${itemId}`);
  return { itemId, itemOffset: item?.getBoundingClientRect().top ?? null, pageY: window.scrollY };
}

function restoreShopPosition(position: ShopScrollPosition) {
  const restore = () => {
    const item = document.getElementById(`shop-item-${position.itemId}`);
    if (item && position.itemOffset !== null) {
      window.scrollBy({ top: item.getBoundingClientRect().top - position.itemOffset, behavior: "auto" });
      return;
    }
    window.scrollTo({ top: position.pageY, behavior: "auto" });
  };
  requestAnimationFrame(restore);
  window.setTimeout(restore, 120);
  window.setTimeout(restore, 450);
  window.setTimeout(restore, 900);
}
