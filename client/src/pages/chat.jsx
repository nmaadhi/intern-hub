import { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { socket } from "../lib/socket";
import useAuthStore from "../store/authStore";

// ── Sound ─────────────────────────────────────────────────────────
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.log("Sound error:", e);
  }
}

// ── Ticks ─────────────────────────────────────────────────────────
// isBubble = true  → on purple bubble (use white/green)
// isBubble = false → on sidebar (use gray/green)
function Ticks({ delivered, read, isBubble }) {
  if (read) {
    // 2 green ticks
    return (
      <span style={{ color: "#22c55e", fontSize: "13px", letterSpacing: "-3px", fontWeight: "bold" }}>
        ✓✓
      </span>
    );
  }
  if (delivered) {
    // 2 ticks — white on bubble, gray on sidebar
    return (
      <span style={{ color: isBubble ? "rgba(255,255,255,0.8)" : "#9ca3af", fontSize: "13px", letterSpacing: "-3px", fontWeight: "bold" }}>
        ✓✓
      </span>
    );
  }
  // 1 tick — white on bubble, gray on sidebar
  return (
    <span style={{ color: isBubble ? "rgba(255,255,255,0.8)" : "#9ca3af", fontSize: "13px", fontWeight: "bold" }}>
      ✓
    </span>
  );
}

function RoleBadge({ role }) {
  const colors = {
    ADMIN: "bg-blue-100 text-blue-700",
    MENTOR: "bg-purple-100 text-purple-700",
    INTERN: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={"text-xs px-1.5 py-0.5 rounded-full font-medium " + (colors[role] || "bg-gray-100 text-gray-600")}>
      {role}
    </span>
  );
}

function fmtTime(s) {
  return new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(s) {
  const d = new Date(s);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { dateStyle: "medium" });
}

export default function Chat() {
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return sessionStorage.getItem("chat_sound") !== "off";
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const selectedUserRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEnabledRef.current = next;
    sessionStorage.setItem("chat_sound", next ? "on" : "off");
  };

  const loadConversations = async () => {
    try {
      const res = await api.get("/chat/conversations");
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations");
    } finally {
      setLoadingConvos(false);
    }
  };

  useEffect(() => {
    loadConversations();
    if (user?.id) {
      socket.emit("join:user", user.id);
      sessionStorage.setItem("userId", user.id);
    }
  }, [user?.id]);

  const openChat = async (contactUser) => {
    setSelectedUser(contactUser);
    setLoadingMsgs(true);
    try {
      const res = await api.get("/chat/" + contactUser.id + "/messages");
      setMessages(res.data.messages || []);
      setConversations((prev) =>
        prev.map((c) => c.user.id === contactUser.id ? { ...c, unreadCount: 0 } : c)
      );
    } catch (err) {
      console.error("Failed to load messages");
    } finally {
      setLoadingMsgs(false);
    }
    inputRef.current?.focus();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onMessageNew = ({ message }) => {
      const currentSelected = selectedUserRef.current;
      const isInCurrentChat =
        currentSelected &&
        (message.senderId === currentSelected.id || message.receiverId === currentSelected.id);

      // Play sound for incoming messages only
      if (message.senderId !== user?.id) {
        if (soundEnabledRef.current) {
          playNotificationSound();
        }
      }

      if (isInCurrentChat) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        if (message.senderId === currentSelected.id) {
          api.patch("/chat/" + currentSelected.id + "/read").catch(() => {});
        }
      } else {
        if (message.senderId !== user?.id) {
          setConversations((prev) =>
            prev.map((c) =>
              c.user.id === message.senderId
                ? {
                    ...c,
                    unreadCount: c.unreadCount + 1,
                    lastMessage: {
                      content: message.content,
                      createdAt: message.createdAt,
                      isMine: false,
                      delivered: message.delivered,
                      read: message.read,
                    },
                  }
                : c
            )
          );
        }
      }

      setConversations((prev) =>
        prev.map((c) => {
          const isRelated = c.user.id === message.senderId || c.user.id === message.receiverId;
          if (!isRelated) return c;
          return {
            ...c,
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              isMine: message.senderId === user?.id,
              delivered: message.delivered,
              read: message.read,
            },
          };
        })
      );
    };

    const onMessageDelivered = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, delivered: true } : m))
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.lastMessage?.isMine
            ? { ...c, lastMessage: { ...c.lastMessage, delivered: true } }
            : c
        )
      );
    };

    const onMessageRead = ({ messageIds }) => {
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m.id) ? { ...m, read: true, delivered: true } : m
        )
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.lastMessage?.isMine
            ? { ...c, lastMessage: { ...c.lastMessage, read: true, delivered: true } }
            : c
        )
      );
    };

    socket.on("message:new", onMessageNew);
    socket.on("message:delivered", onMessageDelivered);
    socket.on("message:read", onMessageRead);

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("message:delivered", onMessageDelivered);
      socket.off("message:read", onMessageRead);
    };
  }, [user?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await api.post("/chat/" + selectedUser.id + "/send", { content });
      const newMsg = res.data.message;
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.user.id === selectedUser.id
            ? {
                ...c,
                lastMessage: {
                  content: newMsg.content,
                  createdAt: newMsg.createdAt,
                  isMine: true,
                  delivered: newMsg.delivered,
                  read: newMsg.read,
                },
              }
            : c
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send message");
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = fmtDate(msg.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl shadow-sm overflow-hidden">

      {/* Sidebar */}
      <div className="w-80 border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </h2>
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute sound" : "Unmute sound"}
            className="text-xl p-1 rounded-lg hover:bg-gray-100 transition"
          >
            {soundEnabled ? "🔔" : "🔕"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <p className="text-4xl mb-2">💬</p>
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.user.id}
                onClick={() => openChat(convo.user)}
                className={"w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition text-left border-b border-gray-50 " +
                  (selectedUser?.id === convo.user.id ? "bg-purple-50 border-l-4 border-l-purple-500" : "")}
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 shrink-0">
                  {convo.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{convo.user.name}</p>
                      <RoleBadge role={convo.user.role} />
                    </div>
                    {convo.lastMessage && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {fmtTime(convo.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate flex-1 flex items-center gap-1">
                      {convo.lastMessage ? (
                        <>
                          {convo.lastMessage.isMine && (
                            <Ticks
                              delivered={convo.lastMessage.delivered}
                              read={convo.lastMessage.read}
                              isBubble={false}
                            />
                          )}
                          <span className="truncate">{convo.lastMessage.content}</span>
                        </>
                      ) : (
                        <span className="italic">No messages yet</span>
                      )}
                    </p>
                    {convo.unreadCount > 0 && (
                      <span className="ml-2 bg-purple-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-medium">
                        {convo.unreadCount > 9 ? "9+" : convo.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {!selectedUser ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
          <div className="text-6xl">💬</div>
          <p className="font-medium text-gray-500">Select a conversation</p>
          <p className="text-sm">Choose someone from the left to start chatting</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-white">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
              {selectedUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-800">{selectedUser.name}</p>
              <div className="flex items-center gap-1">
                <RoleBadge role={selectedUser.role} />
                {selectedUser.internId && (
                  <span className="text-xs text-gray-400">{selectedUser.internId}</span>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50">
            {loadingMsgs ? (
              <p className="text-center text-gray-400 py-8">Loading messages...</p>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-4xl mb-3">👋</p>
                <p className="font-medium">Say hello to {selectedUser.name}!</p>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 bg-gray-50 px-2">{date}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {msgs.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={"flex mb-1.5 " + (isMine ? "justify-end" : "justify-start")}>
                        <div className={"max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm shadow-sm " +
                          (isMine ? "bg-purple-600 text-white rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm")}>
                          <p className="leading-relaxed break-words">{msg.content}</p>
                          <div className={"flex items-center justify-end gap-1 mt-0.5 " + (isMine ? "text-purple-200" : "text-gray-400")}>
                            <span className="text-xs opacity-80">{fmtTime(msg.createdAt)}</span>
                            {isMine && (
                              <Ticks delivered={msg.delivered} read={msg.read} isBubble={true} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 bg-white flex gap-3 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"Message " + selectedUser.name + "..."}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="bg-purple-600 text-white p-2.5 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
