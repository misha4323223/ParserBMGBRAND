import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Send, Copy, RefreshCw, Sparkles, ExternalLink,
  MapPin, AtSign, Mail, MessageSquare, X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

type CollabPerson = {
  name: string;
  type?: string | null;
  niche?: string | null;
  city?: string | null;
  followersInstagram?: string | null;
  followersVk?: string | null;
  instagram?: string | null;
  vk?: string | null;
  telegram?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  email?: string | null;
  description?: string | null;
  whyRelevant?: string | null;
  fitScore?: number | null;
  pitch?: string | null;
};

type VkMessage = {
  id: number;
  from_id: number;
  text: string;
  date: number;
  out: number;
};

type Props = {
  person: CollabPerson | null;
  open: boolean;
  onClose: () => void;
  vkConnected: boolean;
};

export function BloggerSheet({ person, open, onClose, vkConnected }: Props) {
  const [peerId, setPeerId] = useState<number | null>(null);
  const [peerIdLoading, setPeerIdLoading] = useState(false);
  const [peerIdError, setPeerIdError] = useState<string | null>(null);
  const [noMessagesPermission, setNoMessagesPermission] = useState(false);

  const [messages, setMessages] = useState<VkMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!person || !open) return;
    setPeerId(null);
    setPeerIdError(null);
    setNoMessagesPermission(false);
    setMessages([]);
    setMessageText(person.pitch ?? "");
    setAiPrompt("");
    if (vkConnected && person.vk) {
      doResolvePeerId(person.vk);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.name, open]);

  useEffect(() => {
    if (peerId) loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getScreenName = (vkUrl: string) =>
    vkUrl.replace(/.*vk\.com\//, "").replace(/\/$/, "").trim();

  const doResolvePeerId = async (vkUrl: string) => {
    const screenName = getScreenName(vkUrl);
    setPeerIdLoading(true);
    setPeerIdError(null);
    try {
      const res = await fetch("/api/vk-messages/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenName }),
      });
      const data = await res.json() as { peerId?: number; error?: string };
      if (res.ok && data.peerId) {
        setPeerId(data.peerId);
      } else if (res.status === 403) {
        setNoMessagesPermission(true);
      } else {
        setPeerIdError(data.error ?? "Не удалось найти VK аккаунт");
      }
    } catch {
      setPeerIdError("Ошибка соединения");
    } finally {
      setPeerIdLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!peerId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/vk-messages/history?peerId=${peerId}&count=30`);
      const data = await res.json() as { messages?: VkMessage[]; error?: string };
      if (res.ok) {
        setMessages(data.messages ?? []);
      } else if (res.status === 403) {
        setNoMessagesPermission(true);
      }
    } catch { /* silent */ } finally {
      setHistoryLoading(false);
    }
  };

  const handleSend = async () => {
    if (!peerId || !messageText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/vk-messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId, message: messageText.trim() }),
      });
      const data = await res.json() as { ok?: boolean; messageId?: number; error?: string };
      if (res.ok) {
        toast.success("Сообщение отправлено!");
        const sentText = messageText.trim();
        setMessageText("");
        setMessages(prev => [...prev, {
          id: data.messageId ?? Date.now(),
          from_id: 0,
          text: sentText,
          date: Math.floor(Date.now() / 1000),
          out: 1,
        }]);
        setTimeout(loadHistory, 2000);
      } else if (res.status === 403) {
        setNoMessagesPermission(true);
        toast.error("Нет прав на отправку сообщений");
      } else {
        toast.error(data.error ?? "Ошибка отправки");
      }
    } finally {
      setSending(false);
    }
  };

  const handleAiSuggest = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/vk-messages/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloggerName: person?.name,
          bloggerNiche: person?.niche,
          history: messages.slice(-10).map(m => ({ out: m.out, text: m.text })),
          userRequest: aiPrompt.trim() || undefined,
        }),
      });
      const data = await res.json() as { suggestion?: string; error?: string };
      if (res.ok && data.suggestion) {
        setMessageText(data.suggestion);
        setAiPrompt("");
      } else {
        toast.error(data.error ?? "Ошибка Gemini");
      }
    } finally {
      setAiLoading(false);
    }
  };

  if (!person) return null;

  const fitScoreClass = person.fitScore != null
    ? person.fitScore >= 8 ? "bg-green-500/20 text-green-400"
    : person.fitScore >= 5 ? "bg-yellow-500/20 text-yellow-400"
    : "bg-red-500/20 text-red-400"
    : "";

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-card border-l border-border flex flex-col p-0 overflow-hidden"
      >
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 p-5 border-b border-border/50">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {person.fitScore != null && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${fitScoreClass}`}>
                    {person.fitScore}/10
                  </span>
                )}
                {person.type && (
                  <Badge variant="outline" className="rounded-sm text-xs border-purple-400/40 text-purple-400">
                    {person.type}
                  </Badge>
                )}
              </div>
              <h2 className="text-lg font-display font-bold leading-tight">{person.name}</h2>
              {person.niche && (
                <p className="text-xs text-muted-foreground mt-0.5">🎯 {person.niche}</p>
              )}
              {person.city && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3" />{person.city}
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Social links */}
          <div className="flex flex-wrap gap-1.5">
            {person.instagram && (
              <a href={person.instagram.startsWith("http") ? person.instagram : `https://instagram.com/${person.instagram.replace("@", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-pink-500/20 transition-colors">
                IG {person.followersInstagram} <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {person.vk && (
              <a href={person.vk.startsWith("http") ? person.vk : `https://vk.com/${person.vk}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-blue-500/20 transition-colors">
                VK {person.followersVk} <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {person.telegram && (
              <a href={person.telegram.startsWith("http") ? person.telegram : `https://t.me/${person.telegram.replace("@", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-sky-500/20 transition-colors">
                TG <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {person.youtube && (
              <a href={person.youtube} target="_blank" rel="noopener noreferrer"
                className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-red-500/20 transition-colors">
                YT <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {person.tiktok && (
              <a href={person.tiktok.startsWith("http") ? person.tiktok : `https://tiktok.com/@${person.tiktok.replace("@", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs bg-foreground/10 text-foreground/70 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-foreground/20 transition-colors">
                <AtSign className="h-2.5 w-2.5" />{person.tiktok.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, "")} <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {person.email && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-0.5">
                <Mail className="h-2.5 w-2.5" />{person.email}
              </span>
            )}
          </div>

          {person.whyRelevant && (
            <p className="text-xs text-muted-foreground mt-2 italic opacity-80">💡 {person.whyRelevant}</p>
          )}
        </div>

        {/* ─── Scrollable body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-h-0">

          {/* ── VK Messaging ── */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-400">
              <MessageSquare className="h-4 w-4" />
              Диалог во ВКонтакте
            </h3>
            {peerId && !historyLoading && (
              <button onClick={loadHistory}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Обновить">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* No VK URL */}
          {!person.vk ? (
            <div className="p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground text-center">
              У этого блогера не указана страница ВКонтакте
            </div>

          ) : !vkConnected ? (
            <div className="p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg text-xs text-yellow-400 text-center">
              Подключите ВКонтакте во вкладке «ВКонтакте»
            </div>

          ) : noMessagesPermission ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              <p className="font-semibold mb-1">⚠️ Нет прав на сообщения</p>
              <p>Текущий токен VK не имеет разрешения на чтение/отправку сообщений. Перейдите во вкладку «ВКонтакте» и переподключите аккаунт — при OAuth запросятся права на сообщения.</p>
            </div>

          ) : peerIdLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Определяем ID аккаунта ВКонтакте...
            </div>

          ) : peerIdError ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-start gap-2">
              <span className="flex-1">{peerIdError}</span>
              <button onClick={() => doResolvePeerId(person.vk!)}
                className="underline shrink-0 hover:opacity-80">
                Повторить
              </button>
            </div>

          ) : peerId ? (
            <>
              {/* Message history */}
              {historyLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Загружаем историю переписки...
                </div>
              ) : messages.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto bg-background/30 rounded-lg p-3 border border-border/50">
                  {messages.map(msg => (
                    <div key={`${msg.id}-${msg.date}`} className={`flex ${msg.out === 1 ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        msg.out === 1
                          ? "bg-primary/20 text-foreground"
                          : "bg-muted/50 text-foreground"
                      }`}>
                        {msg.text || <span className="opacity-40 italic">[вложение]</span>}
                        <p className="text-[10px] opacity-40 mt-0.5 text-right">
                          {new Date(msg.date * 1000).toLocaleString("ru", {
                            hour: "2-digit", minute: "2-digit",
                            day: "numeric", month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground text-center">
                  Переписки ещё нет — отправьте первое сообщение
                </div>
              )}

              {/* AI suggest */}
              <div className="flex gap-2">
                <Input
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Что написать? AI сформулирует сообщение..."
                  className="text-xs h-8 bg-background/50 border-border/50 flex-1"
                  onKeyDown={e => { if (e.key === "Enter") handleAiSuggest(); }}
                />
                <Button
                  size="sm" variant="outline"
                  onClick={handleAiSuggest}
                  disabled={aiLoading}
                  className="h-8 px-2 shrink-0 border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400"
                  title="Сгенерировать сообщение через AI">
                  {aiLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {/* Compose */}
              <div className="flex flex-col gap-2">
                <Textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Текст сообщения..."
                  className="min-h-[110px] text-sm bg-background/50 border-border/50 resize-none focus-visible:ring-primary/30"
                  onKeyDown={e => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(messageText); toast.success("Скопировано!"); }}
                    disabled={!messageText.trim()}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-30 transition-colors">
                    <Copy className="h-3 w-3" /> Копировать
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground opacity-50">Ctrl+Enter</span>
                    <Button
                      onClick={handleSend}
                      disabled={!messageText.trim() || sending}
                      className="gap-1.5 text-sm">
                      {sending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />}
                      Отправить
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
