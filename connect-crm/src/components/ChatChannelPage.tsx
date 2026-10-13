import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChatMobileNav } from "@/context/ChatMobileNavContext";
import {
  getChatThreads,
  getChatContacts,
  getChatThread,
  sendChatMessage,
} from "@/services/crmService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Search,
  RefreshCw,
  User,
  ArrowLeft,
  Camera,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  Phone,
  Video,
  Mail,
  Edit3,
  ChevronLeft,
  Facebook,
  Image as ImageIcon,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ChatChannel = "whatsapp" | "email" | "sms" | "facebook";

const WA_WALLPAPER =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8b8a8' fill-opacity='0.18'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

type SidebarItem = {
  leadId?: string;
  name: string;
  preview: string;
  lastAt: string;
  hasMessages: boolean;
};

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtMobileListTime(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtBubbleTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ChatChannelPage({ channel }: { channel: ChatChannel }) {
  const { user, organization } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ lead: any; messages: any[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { setThreadOpen } = useChatMobileNav();

  const loadThreads = useCallback(async (silent = false) => {
    if (!organization?.id) return;
    if (!silent) setLoading(true);
    try {
      const [t, c] = await Promise.all([
        getChatThreads(organization.id, channel),
        getChatContacts(organization.id, channel),
      ]);
      setThreads(t);
      setContacts(c);
    } catch (e: any) {
      if (!silent) toast.error(e?.message || "Could not load chats");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [organization?.id, channel]);

  const loadThread = useCallback(
    async (leadId: string) => {
      if (!organization?.id) return;
      try {
        const data = await getChatThread(organization.id, leadId, channel);
        setThread(data);
      } catch (e: any) {
        toast.error(e?.message || "Could not load conversation");
      }
    },
    [organization?.id, channel],
  );

  useEffect(() => {
    loadThreads();
    setSelectedLeadId(null);
    setThread(null);
    setDraft("");
    setEmailSubject("");
  }, [loadThreads]);

  useEffect(() => {
    if (selectedLeadId) loadThread(selectedLeadId);
  }, [selectedLeadId, loadThread]);

  useEffect(() => {
    if (!organization?.id) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void loadThreads(true);
      if (selectedLeadId) void loadThread(selectedLeadId);
    };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [organization?.id, selectedLeadId, loadThread, loadThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  useEffect(() => {
    setThreadOpen(!!selectedLeadId);
  }, [selectedLeadId, setThreadOpen]);

  useEffect(() => {
    return () => setThreadOpen(false);
  }, [setThreadOpen]);

  const sidebarItems = useMemo((): SidebarItem[] => {
    const threadLeadIds = new Set(threads.map((t) => t.leadId).filter(Boolean));
    const fromThreads = threads.map((t) => ({
      leadId: t.leadId,
      name: t.leadName,
      preview: t.preview,
      lastAt: t.lastAt,
      hasMessages: true,
    }));
    const fromContacts = contacts
      .filter((c) => !threadLeadIds.has(c.id))
      .map((c) => ({
        leadId: c.id,
        name: c.name,
        preview: channel === "email" ? c.email : c.phone,
        lastAt: "",
        hasMessages: false,
      }));
    const merged = [...fromThreads, ...fromContacts];
    if (!search.trim()) return merged;
    const q = search.toLowerCase();
    return merged.filter(
      (x) =>
        x.name?.toLowerCase().includes(q) ||
        x.preview?.toLowerCase().includes(q),
    );
  }, [threads, contacts, search, channel]);

  const sendWhatsAppTemplate = async (templateName = "hello_world") => {
    if (!organization?.id || !selectedLeadId || channel !== "whatsapp") return;
    setSending(true);
    try {
      await sendChatMessage(organization.id, {
        leadId: selectedLeadId,
        channel: "whatsapp",
        text: "",
        templateName,
        templateLanguage: "en_US",
      });
      await loadThread(selectedLeadId);
      await loadThreads();
      toast.success(`Sent template "${templateName}"`);
    } catch (e: any) {
      toast.error(e?.message || "Could not send template");
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (!organization?.id || !selectedLeadId) return;
    const text = draft.trim();
    if (!text) return;
    if (channel === "email" && !emailSubject.trim()) {
      toast.error("Enter an email subject");
      return;
    }
    setSending(true);
    try {
      await sendChatMessage(organization.id, {
        leadId: selectedLeadId,
        channel,
        text,
        subject: channel === "email" ? emailSubject.trim() : undefined,
      });
      setDraft("");
      if (channel === "email") setEmailSubject("");
      await loadThread(selectedLeadId);
      await loadThreads();
    } catch (e: any) {
      toast.error(e?.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  const closeThread = () => {
    setSelectedLeadId(null);
    setThread(null);
    setDraft("");
    if (channel === "email") setEmailSubject("");
  };

  const selectContact = (leadId?: string) => {
    if (leadId) setSelectedLeadId(leadId);
  };

  if (!user) return null;

  const activeLead = thread?.lead;
  const contactLabel =
    channel === "email"
      ? activeLead?.email
      : channel === "facebook"
        ? "Facebook Messenger"
        : activeLead?.phone;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden max-lg:-m-0 lg:-m-8">
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row",
          "max-lg:rounded-none max-lg:border-0 max-lg:shadow-none",
          "lg:rounded-2xl lg:border lg:shadow-[var(--shadow-sm)]",
          channelShell(channel),
        )}
      >
        {/* Mobile: full-screen contact list */}
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col lg:max-w-[320px]",
            "lg:border-r",
            channelSidebar(channel),
            selectedLeadId ? "max-lg:hidden" : "max-lg:flex max-lg:flex-1 max-lg:min-h-0",
          )}
        >
          <div className="lg:hidden flex min-h-0 flex-1 flex-col">
            <MobileListHeader channel={channel} search={search} onSearch={setSearch} />
            <MobileContactList
              channel={channel}
              items={sidebarItems}
              loading={loading}
              onSelect={selectContact}
            />
          </div>

          {/* Desktop list */}
          <div className="hidden lg:flex min-h-0 flex-1 flex-col">
            <div className="border-b border-black/5 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                <Input
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </div>
            <DesktopContactList
              channel={channel}
              items={sidebarItems}
              loading={loading}
              selectedLeadId={selectedLeadId}
              onSelect={selectContact}
            />
            <div className="border-t border-black/5 p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1"
                onClick={() => loadThreads()}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>
        </aside>

        {/* Thread */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            !selectedLeadId && "max-lg:hidden",
          )}
        >
          {!selectedLeadId ? (
            <div
              className={cn(
                "hidden lg:flex flex-1 items-center justify-center text-sm",
                channelEmpty(channel),
              )}
            >
              Select a conversation to start chatting
            </div>
          ) : channel === "whatsapp" ? (
            <WhatsAppThread
              activeLead={activeLead}
              contactLabel={contactLabel}
              messages={thread?.messages ?? []}
              draft={draft}
              sending={sending}
              bottomRef={bottomRef}
              onBack={closeThread}
              onDraft={setDraft}
              onSend={send}
              onSendTemplate={sendWhatsAppTemplate}
            />
          ) : channel === "email" ? (
            <EmailThread
              activeLead={activeLead}
              contactLabel={contactLabel}
              messages={thread?.messages ?? []}
              draft={draft}
              emailSubject={emailSubject}
              sending={sending}
              bottomRef={bottomRef}
              onBack={closeThread}
              onDraft={setDraft}
              onSubject={setEmailSubject}
              onSend={send}
            />
          ) : channel === "facebook" ? (
            <MessengerThread
              activeLead={activeLead}
              contactLabel={contactLabel}
              messages={thread?.messages ?? []}
              draft={draft}
              sending={sending}
              bottomRef={bottomRef}
              onBack={closeThread}
              onDraft={setDraft}
              onSend={send}
            />
          ) : (
            <SmsThread
              activeLead={activeLead}
              contactLabel={contactLabel}
              messages={thread?.messages ?? []}
              draft={draft}
              sending={sending}
              bottomRef={bottomRef}
              onBack={closeThread}
              onDraft={setDraft}
              onSend={send}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function MobileListHeader({
  channel,
  search,
  onSearch,
}: {
  channel: ChatChannel;
  search: string;
  onSearch: (v: string) => void;
}) {
  if (channel === "whatsapp") {
    return (
      <div className="shrink-0 bg-[#075e54] text-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="text-[19px] font-normal tracking-tight">WhatsApp</span>
          <div className="flex items-center gap-6">
            <Camera className="h-5 w-5 opacity-95" strokeWidth={1.75} />
            <Search className="h-5 w-5 opacity-95" strokeWidth={1.75} />
            <MoreVertical className="h-5 w-5 opacity-95" strokeWidth={1.75} />
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
            <input
              type="search"
              placeholder="Search or start new chat"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="h-9 w-full rounded-lg bg-white pl-9 pr-3 text-sm text-[#111b21] placeholder:text-[#8696a0] outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

  if (channel === "email") {
    return (
      <div className="shrink-0 border-b border-[#e0e0e0] bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-[#1a73e8]" />
            <span className="text-xl font-medium text-[#1f1f1f]">Mail</span>
          </div>
          <Search className="h-5 w-5 text-[#5f6368]" strokeWidth={1.75} />
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6368]" />
            <input
              type="search"
              placeholder="Search mail"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="h-10 w-full rounded-full bg-[#f1f3f4] pl-9 pr-4 text-sm text-[#1f1f1f] placeholder:text-[#5f6368] outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

  if (channel === "facebook") {
    return (
      <div className="shrink-0 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Facebook className="h-6 w-6 text-[#0084ff]" fill="#0084ff" strokeWidth={0} />
            <span className="text-xl font-semibold text-[#050505]">Chats</span>
          </div>
          <Edit3 className="h-5 w-5 text-[#0084ff]" strokeWidth={2} />
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65676b]" />
            <input
              type="search"
              placeholder="Search Messenger"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="h-9 w-full rounded-full bg-[#f0f2f5] pl-9 pr-3 text-sm text-[#050505] placeholder:text-[#65676b] outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-[#c6c6c8] bg-[#f6f6f6] pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-end justify-between px-4 pb-1 pt-1">
        <span className="text-[34px] font-bold leading-none text-black">Messages</span>
        <button type="button" className="mb-1 p-1 text-[#007AFF]" aria-label="Compose">
          <Edit3 className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </div>
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8e93]" />
          <input
            type="search"
            placeholder="Search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="h-9 w-full rounded-xl bg-[#e3e3e8] pl-9 pr-3 text-[17px] text-black placeholder:text-[#8e8e93] outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function MobileContactList({
  channel,
  items,
  loading,
  onSelect,
}: {
  channel: ChatChannel;
  items: SidebarItem[];
  loading: boolean;
  onSelect: (leadId?: string) => void;
}) {
  const isSms = channel === "sms";
  const isEmail = channel === "email";
  const isFacebook = channel === "facebook";

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 bg-white">
      {loading && (
        <div className="p-6 text-center text-sm text-[#667781]">Loading…</div>
      )}
      {!loading && items.length === 0 && (
        <div className="p-6 text-center text-sm text-[#667781]">
          {isFacebook ? "No Messenger conversations yet" : "No contacts yet"}
        </div>
      )}
      {items.map((item) => (
        <button
          key={item.leadId ?? item.name}
          type="button"
          onClick={() => onSelect(item.leadId)}
          className={cn(
            "flex w-full gap-3 px-4 py-3 text-left transition active:bg-[#f0f2f5]",
            isSms ? "border-b border-[#c6c6c8]/60" : "border-b border-[#e9edef]",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full",
              isSms
                ? "h-12 w-12 bg-[#c7c7cc] text-white"
                : isEmail
                  ? "h-10 w-10 bg-[#1a73e8] text-white"
                  : isFacebook
                    ? "h-[49px] w-[49px] bg-[#0084ff] text-white"
                    : "h-[49px] w-[49px] bg-[#dfe5e7] text-[#8696a0]",
            )}
          >
            <User className={isSms ? "h-6 w-6" : "h-5 w-5"} />
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  "truncate text-[#111b21]",
                  isSms ? "text-[17px] font-normal" : isEmail || isFacebook ? "text-[15px] font-medium" : "text-[17px]",
                )}
              >
                {item.name}
              </span>
              {item.lastAt && (
                <span className="shrink-0 text-xs text-[#667781]">
                  {fmtMobileListTime(item.lastAt)}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm text-[#667781]">
              {item.preview || (item.hasMessages ? "No preview" : "Tap to message")}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function DesktopContactList({
  channel,
  items,
  loading,
  selectedLeadId,
  onSelect,
}: {
  channel: ChatChannel;
  items: SidebarItem[];
  loading: boolean;
  selectedLeadId: string | null;
  onSelect: (leadId?: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      {loading && (
        <div className="p-6 text-center text-sm opacity-60">Loading…</div>
      )}
      {!loading && items.length === 0 && (
        <div className="p-6 text-center text-sm opacity-60">No conversations yet</div>
      )}
      {items.map((item) => (
        <button
          key={item.leadId ?? item.name}
          type="button"
          onClick={() => onSelect(item.leadId)}
          className={cn(
            "flex w-full gap-3 border-b border-black/5 px-4 py-3 text-left transition",
            selectedLeadId === item.leadId
              ? channelSidebarActive(channel)
              : "hover:bg-black/5",
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              channelAvatar(channel),
            )}
          >
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-2">
              <span className="truncate text-sm font-medium">{item.name}</span>
              {item.lastAt && (
                <span className="shrink-0 text-[10px] opacity-60">
                  {fmtTime(item.lastAt)}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs opacity-70">
              {item.preview || "—"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function MobileBackButton({ onBack, className }: { onBack: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={cn(
        "flex h-10 w-10 items-center justify-center lg:hidden",
        className,
      )}
      aria-label="Back to list"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

function WhatsAppThread({
  activeLead,
  contactLabel,
  messages,
  draft,
  sending,
  bottomRef,
  onBack,
  onDraft,
  onSend,
  onSendTemplate,
}: {
  activeLead: any;
  contactLabel?: string;
  messages: any[];
  draft: string;
  sending: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onDraft: (v: string) => void;
  onSend: () => void;
  onSendTemplate: (templateName?: string) => void;
}) {
  return (
    <>
      <header className="flex shrink-0 items-center gap-1 bg-[#075e54] px-1 py-2 text-white pt-[env(safe-area-inset-top,0px)]">
        <MobileBackButton onBack={onBack} className="text-white" />
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-[#8696a0]">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-normal">{activeLead?.name ?? "…"}</div>
            <div className="truncate text-xs text-white/80">
              {contactLabel || "tap here for contact info"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 pr-2">
          <Video className="mx-2.5 h-5 w-5" strokeWidth={1.75} />
          <Phone className="mx-2.5 h-5 w-5" strokeWidth={1.75} />
          <MoreVertical className="mx-2.5 h-5 w-5" strokeWidth={1.75} />
        </div>
      </header>

      <div
        className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-[4%] py-2 max-lg:min-h-0"
        style={{ backgroundColor: "#e5ddd5", backgroundImage: WA_WALLPAPER }}
      >
        {messages.length === 0 && (
          <div className="py-8 px-4 text-center text-sm text-[#667781] space-y-3">
            <p>Messages are end-to-end encrypted.</p>
            <p className="text-xs">
              New contact? Meta requires an approved template first. Then you can reply with free text for 24 hours.
            </p>
            <button
              type="button"
              disabled={sending}
              onClick={() => onSendTemplate("hello_world")}
              className="rounded-full bg-[#00a884] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              Send hello_world template
            </button>
          </div>
        )}
        {messages.map((m) => (
          <WaMessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="shrink-0 bg-[#f0f2f5] px-2 py-2 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        <div className="flex items-end gap-1">
          <button type="button" className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center text-[#8696a0]" aria-label="Emoji">
            <Smile className="h-6 w-6" strokeWidth={1.5} />
          </button>
          <div className="mb-0.5 flex min-h-[42px] flex-1 items-center gap-2 rounded-3xl bg-white px-4 py-2 shadow-sm">
            <input
              type="text"
              placeholder="Message"
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#111b21] outline-none placeholder:text-[#8696a0]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Paperclip className="h-5 w-5 shrink-0 text-[#8696a0]" strokeWidth={1.75} />
          </div>
          <button
            type="button"
            className="mb-0.5 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-50"
            onClick={onSend}
            disabled={sending || !draft.trim()}
          >
            {draft.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </footer>
    </>
  );
}

function EmailThread({
  activeLead,
  contactLabel,
  messages,
  draft,
  emailSubject,
  sending,
  bottomRef,
  onBack,
  onDraft,
  onSubject,
  onSend,
}: {
  activeLead: any;
  contactLabel?: string;
  messages: any[];
  draft: string;
  emailSubject: string;
  sending: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onDraft: (v: string) => void;
  onSubject: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <>
      <header className="flex shrink-0 items-center gap-1 border-b border-[#dadce0] bg-white px-1 py-2 pt-[env(safe-area-inset-top,0px)] lg:bg-slate-800 lg:text-white lg:border-slate-800">
        <MobileBackButton onBack={onBack} className="text-[#1a73e8] lg:text-white" />
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-white lg:bg-slate-600">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-medium text-[#1f1f1f] lg:text-white">
              {activeLead?.name ?? "…"}
            </div>
            <div className="truncate text-xs text-[#5f6368] lg:text-white/80">
              {contactLabel || "—"}
            </div>
          </div>
        </div>
        <MoreVertical className="mx-2 h-5 w-5 text-[#5f6368] lg:text-white" strokeWidth={1.75} />
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#f6f8fc] p-4 max-lg:min-h-0 lg:bg-slate-100/80">
        {messages.length === 0 && (
          <div className="py-12 text-center text-sm text-[#5f6368]">
            No emails yet. Compose your first message below.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} channel="email" />
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="shrink-0 border-t border-[#dadce0] bg-white p-3 pb-[max(env(safe-area-inset-bottom,0px),12px)] lg:border-border">
        <input
          type="text"
          placeholder="Subject"
          value={emailSubject}
          onChange={(e) => onSubject(e.target.value)}
          className="mb-2 h-10 w-full rounded-lg border border-[#dadce0] bg-white px-3 text-sm outline-none focus:border-[#1a73e8] lg:hidden"
        />
        <div className="hidden lg:block mb-2">
          <Input placeholder="Subject" value={emailSubject} onChange={(e) => onSubject(e.target.value)} className="bg-white" />
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Write your email…"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            rows={3}
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-white lg:rounded-md lg:border"
          />
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 shrink-0 bg-[#1a73e8] text-white hover:bg-[#1a73e8]/90 lg:bg-slate-800"
            onClick={onSend}
            disabled={sending || !draft.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </>
  );
}

function MessengerThread({
  activeLead,
  contactLabel,
  messages,
  draft,
  sending,
  bottomRef,
  onBack,
  onDraft,
  onSend,
}: {
  activeLead: any;
  contactLabel?: string;
  messages: any[];
  draft: string;
  sending: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onDraft: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <>
      <header className="flex shrink-0 items-center gap-1 border-b border-black/5 bg-white px-1 py-2 pt-[env(safe-area-inset-top,0px)]">
        <MobileBackButton onBack={onBack} className="text-[#0084ff]" />
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0084ff] text-white">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-medium text-[#050505]">
              {activeLead?.name ?? "…"}
            </div>
            <div className="truncate text-xs text-[#65676b]">
              {contactLabel || "Active on Messenger"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 pr-2 text-[#0084ff]">
          <Phone className="mx-2 h-5 w-5" strokeWidth={1.75} />
          <Video className="mx-2 h-5 w-5" strokeWidth={1.75} />
        </div>
      </header>

      <div className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain bg-white px-3 py-3 max-lg:min-h-0">
        {messages.length === 0 && (
          <div className="py-12 text-center text-sm text-[#65676b]">
            No messages yet. Say hello 👋
          </div>
        )}
        {messages.map((m) => (
          <MessengerMessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="shrink-0 border-t border-black/5 bg-white px-2 py-2 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        <div className="flex items-end gap-1">
          <button type="button" className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center text-[#0084ff]" aria-label="Attach image">
            <ImageIcon className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <div className="mb-0.5 flex min-h-[38px] flex-1 items-center rounded-full bg-[#f0f2f5] px-4 py-1.5">
            <input
              type="text"
              placeholder="Aa"
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#050505] outline-none placeholder:text-[#65676b]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
          </div>
          <button
            type="button"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-[#0084ff] disabled:opacity-50"
            onClick={onSend}
            disabled={sending || !draft.trim()}
            aria-label={draft.trim() ? "Send" : "Like"}
          >
            {draft.trim() ? <Send className="h-5 w-5" /> : <ThumbsUp className="h-6 w-6" fill="#0084ff" strokeWidth={0} />}
          </button>
        </div>
      </footer>
    </>
  );
}

function SmsThread({
  activeLead,
  contactLabel,
  messages,
  draft,
  sending,
  bottomRef,
  onBack,
  onDraft,
  onSend,
}: {
  activeLead: any;
  contactLabel?: string;
  messages: any[];
  draft: string;
  sending: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onDraft: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <>
      <header className="flex shrink-0 items-center gap-1 border-b border-[#c6c6c8] bg-[#f6f6f6]/95 px-1 py-2 backdrop-blur pt-[env(safe-area-inset-top,0px)] lg:bg-[#007AFF] lg:text-white lg:border-[#007AFF]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center text-[#007AFF] lg:hidden"
          aria-label="Back to messages"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 lg:flex-row lg:items-center lg:gap-3 lg:justify-start">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c7c7cc] text-white lg:h-9 lg:w-9 lg:bg-white/20">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 text-center lg:text-left">
            <div className="truncate text-sm font-semibold text-black lg:text-base lg:font-semibold lg:text-white">
              {activeLead?.name ?? "…"}
            </div>
            <div className="truncate text-[11px] text-[#8e8e93] lg:text-xs lg:text-white/80">
              {contactLabel || "—"}
            </div>
          </div>
        </div>
        <div className="w-10 lg:hidden" />
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain bg-white px-3 py-3 max-lg:min-h-0 lg:bg-[#ececec] lg:p-4 lg:space-y-3">
        {messages.length === 0 && (
          <div className="py-12 text-center text-sm text-[#8e8e93]">
            No messages yet. Send the first text below.
          </div>
        )}
        {messages.map((m) => (
          <SmsMessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="shrink-0 border-t border-[#c6c6c8] bg-[#f6f6f6] px-2 py-2 pb-[max(env(safe-area-inset-bottom,0px),8px)] lg:bg-[#f2f2f7]">
        <div className="flex items-end gap-2">
          <div className="mb-0.5 flex min-h-[36px] flex-1 items-center rounded-full border border-[#c6c6c8] bg-white px-4 py-1.5">
            <input
              type="text"
              placeholder="Text Message"
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[17px] text-black outline-none placeholder:text-[#8e8e93]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
          </div>
          <button
            type="button"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-white disabled:opacity-40 lg:hidden"
            onClick={onSend}
            disabled={sending || !draft.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
          <Button
            type="button"
            size="icon"
            className="mb-0.5 hidden h-11 w-11 shrink-0 rounded-full bg-[#007AFF] text-white hover:bg-[#007AFF]/90 lg:flex"
            onClick={onSend}
            disabled={sending || !draft.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </>
  );
}

function WaMessageBubble({ message: m }: { message: any }) {
  const outbound = m.direction === "outbound";
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[85%] px-2 py-1.5 text-[14.2px] leading-[19px] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]",
          outbound ? "rounded-lg rounded-tr-sm bg-[#d9fdd3]" : "rounded-lg rounded-tl-sm bg-white",
        )}
      >
        <span className="whitespace-pre-wrap break-words">{m.textBody}</span>
        <span className="float-right ml-3 mt-1 translate-y-0.5 text-[11px] leading-none text-[#667781]">
          {fmtBubbleTime(m.createdAt)}
        </span>
      </div>
    </div>
  );
}

function SmsMessageBubble({ message: m }: { message: any }) {
  const outbound = m.direction === "outbound";
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] whitespace-pre-wrap px-3 py-2 text-[17px] leading-snug",
          outbound
            ? "rounded-[20px] rounded-br-md bg-[#007AFF] text-white"
            : "rounded-[20px] rounded-bl-md bg-[#E5E5EA] text-black",
        )}
      >
        {m.textBody}
        <div
          className={cn(
            "mt-0.5 text-right text-[11px]",
            outbound ? "text-blue-100" : "text-[#8e8e93]",
          )}
        >
          {fmtBubbleTime(m.createdAt)}
        </div>
      </div>
    </div>
  );
}

function MessengerMessageBubble({ message: m }: { message: any }) {
  const outbound = m.direction === "outbound";
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] whitespace-pre-wrap px-3.5 py-2 text-[15px] leading-snug",
          outbound
            ? "rounded-[18px] rounded-br-[4px] bg-[#0084ff] text-white"
            : "rounded-[18px] rounded-bl-[4px] bg-[#e4e6eb] text-[#050505]",
        )}
      >
        {m.textBody}
      </div>
    </div>
  );
}

function MessageBubble({
  message: m,
  channel,
  leadName,
}: {
  message: any;
  channel: ChatChannel;
  leadName?: string;
}) {
  const outbound = m.direction === "outbound";

  if (channel === "email") {
    return (
      <div
        className={cn(
          "max-w-[92%] overflow-hidden rounded-lg border bg-white shadow-sm",
          outbound ? "ml-auto border-blue-200" : "mr-auto border-border",
        )}
      >
        <div className="space-y-0.5 border-b bg-muted/40 px-4 py-2 text-xs">
          <div>
            <span className="font-medium">From:</span>{" "}
            {outbound ? "You" : m.fromAddress}
          </div>
          <div>
            <span className="font-medium">To:</span>{" "}
            {outbound ? m.fromAddress : "You"}
          </div>
          {m.subject && (
            <div>
              <span className="font-medium">Subject:</span> {m.subject}
            </div>
          )}
          <div className="text-muted-foreground">{fmtTime(m.createdAt)}</div>
        </div>
        <div className="whitespace-pre-wrap px-4 py-3 text-sm">{m.textBody}</div>
      </div>
    );
  }

  if (channel === "sms") {
    return <SmsMessageBubble message={m} />;
  }

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[78%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm",
          outbound
            ? "rounded-tr-none bg-[#D9FDD3] text-[#111b21]"
            : "rounded-tl-none bg-white text-[#111b21]",
        )}
      >
        {!outbound && leadName && (
          <div className="mb-0.5 text-[11px] font-semibold text-[#075e54]">{leadName}</div>
        )}
        {m.textBody}
        <div className="mt-1 text-right text-[10px] text-[#667781]">
          {fmtTime(m.createdAt)}
        </div>
      </div>
    </div>
  );
}

function channelShell(ch: ChatChannel) {
  if (ch === "whatsapp") return "lg:border-[#075e54]/20";
  if (ch === "email") return "border-slate-200";
  if (ch === "facebook") return "border-[#0084ff]/20";
  return "border-blue-200";
}

function channelSidebar(ch: ChatChannel) {
  if (ch === "whatsapp") return "lg:bg-[#f0f2f5]";
  if (ch === "email") return "bg-slate-50";
  if (ch === "facebook") return "bg-white";
  return "bg-[#f2f2f7]";
}

function channelSidebarActive(ch: ChatChannel) {
  if (ch === "whatsapp") return "bg-[#d9fdd3]/60";
  if (ch === "email") return "bg-slate-200/80";
  if (ch === "facebook") return "bg-[#e7f3ff]";
  return "bg-blue-100";
}

function channelAvatar(ch: ChatChannel) {
  if (ch === "whatsapp") return "bg-[#075e54] text-white";
  if (ch === "email") return "bg-slate-600 text-white";
  if (ch === "facebook") return "bg-[#0084ff] text-white";
  return "bg-[#007AFF] text-white";
}

function channelEmpty(ch: ChatChannel) {
  if (ch === "whatsapp") return "bg-[#f0f2f5] text-[#667781]";
  if (ch === "email") return "bg-slate-50 text-muted-foreground";
  if (ch === "facebook") return "bg-white text-muted-foreground";
  return "bg-[#ececec] text-muted-foreground";
}
