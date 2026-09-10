"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Stream Video
import {
    CallControls,
    CallingState,
    SpeakerLayout,
    StreamTheme,
    useCall,
    useCallStateHooks,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";

// Stream Chat
import {
    Channel,
    Chat,
    GlobalModal,
    MessageActions,
    MessageComposer,
    MessageList,
    Window,
    WithComponents,
    defaultMessageActionSet,
    useCreateChatClient,
} from "stream-chat-react";
import "stream-chat-react/dist/css/index.css";

import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Sparkles } from "lucide-react";
import AIQuestionsPanel from "./AIQuestions";


// Drawer height presets (vh units) - mobile only
const DRAWER_MIN_VH = 30
const DRAWER_DEFAULT_VH = 55
const DRAWER_MAX_VH = 90
const DRAWER_CLOSE_THRESHOLD_VH = 20


// Menghilangkan opsi "Thread Reply" dari menu konteks pesan, tapi tetap
// menyisakan aksi lain (delete, edit, pin, dst).
const MessageActionsWithoutThread = () => {
    const messageActionSet = defaultMessageActionSet.filter(
        ({ placement, type }) => placement === "quick-dropdown-toggle" || type !== "reply"
    )
    return <MessageActions messageActionSet={messageActionSet} />
}


export default function CallUI({
    callId,
    isInterviewer,
    booking,
    onLeave,
    apiKey,
    token,
    currentUser,
}) {
    const { useCallCallingState } = useCallStateHooks()
    const call = useCall()
    const callingState = useCallCallingState()

    const [activeTab, setActiveTab] = useState("chat")
    // Mobile only: whether the chat/AI drawer is open. Desktop always shows the panel.
    const [panelOpen, setPanelOpen] = useState(false)

    // Drag state for the mobile drawer
    const [drawerHeightVh, setDrawerHeightVh] = useState(DRAWER_DEFAULT_VH)
    const dragState = useRef({
        dragging: false,
        startY: 0,
        startHeightVh: DRAWER_DEFAULT_VH,
    })


    const handleLeave = useCallback(async () => {
        try {
            if (call) {
                const isRecording = call.state?.recording
                if (isRecording) {
                    await call.stopRecording().catch(() => { })
                }
                await call.leave().catch(() => { })
            }
        } finally {
            onLeave()
        }
    }, [call, onLeave])


    const chatClient = useCreateChatClient({
        apiKey,
        tokenOrProvider: token,
        userData: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.imageUrl,
        },
    })

    const [chatChannel, setChatChannel] = useState(null)


    useEffect(() => {
        if (!chatClient) return

        let cancelled = false

        const channel = chatClient.channel("messaging", callId, {
            name: "Interview Chat",
            members: [
                booking.interviewer.clerkUserId,
                booking.interviewee.clerkUserId,
            ],
        })

        channel
            .watch()
            .then(() => {
                if (!cancelled) setChatChannel(channel)
            })
            .catch(console.error)

        return () => {
            cancelled = true
            channel.stopWatching().catch(() => { })
        }
    }, [chatClient, callId, booking])


    useEffect(() => {
        if (panelOpen) {
            setDrawerHeightVh(DRAWER_DEFAULT_VH)
        }
    }, [panelOpen])


    // ---- Drag handlers (mobile drawer only) ----
    const handleDragStart = useCallback((clientY) => {
        dragState.current = {
            dragging: true,
            startY: clientY,
            startHeightVh: drawerHeightVh,
        }
    }, [drawerHeightVh])

    const handleDragMove = useCallback((clientY) => {
        if (!dragState.current.dragging) return
        const deltaY = clientY - dragState.current.startY
        const deltaVh = (deltaY / window.innerHeight) * 100
        let nextVh = dragState.current.startHeightVh - deltaVh
        nextVh = Math.min(DRAWER_MAX_VH, Math.max(0, nextVh))
        setDrawerHeightVh(nextVh)
    }, [])

    const handleDragEnd = useCallback(() => {
        if (!dragState.current.dragging) return
        dragState.current.dragging = false

        setDrawerHeightVh((current) => {
            if (current < DRAWER_CLOSE_THRESHOLD_VH) {
                setPanelOpen(false)
                return current // biarkan tinggi apa adanya saat menutup, jangan lompat balik ke default
            }
            if (current > (DRAWER_MAX_VH + DRAWER_DEFAULT_VH) / 2) return DRAWER_MAX_VH
            if (current < (DRAWER_MIN_VH + DRAWER_DEFAULT_VH) / 2) return DRAWER_MIN_VH
            return DRAWER_DEFAULT_VH
        })
    }, [])

    const onHandlePointerDown = (e) => {
        e.preventDefault()
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        handleDragStart(clientY)

        const onMove = (moveEvent) => {
            const y = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY
            handleDragMove(y)
        }
        const onUp = () => {
            handleDragEnd()
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("mouseup", onUp)
            window.removeEventListener("touchmove", onMove)
            window.removeEventListener("touchend", onUp)
        }

        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseup", onUp)
        window.addEventListener("touchmove", onMove, { passive: false })
        window.addEventListener("touchend", onUp)
    }


    if (callingState === CallingState.LEFT) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center gap-3">
                <p className="text-stone-400 text-sm">Leaving call…</p>
            </div>
        )
    }

    return (
        <div className="h-[92vh] bg-[#0a0a0b] flex flex-col overflow-hidden relative">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-white/10 text-stone-500 text-xs">
                        {booking.interviewer.name}
                        <span className="text-stone-700 mx-1.5">×</span>
                        {booking.interviewee.name}
                    </Badge>
                    {isInterviewer && (
                        <Badge
                            variant="outline"
                            className="border-amber-400/20 bg-amber-400/5 text-amber-400 text-xs"
                        >
                            Interviewer
                        </Badge>
                    )}
                </div>
            </div>

            {/* Body: video + side panel */}
            <div className="flex flex-1 min-h-0 overflow-hidden relative">
                {/* Video */}
                <div className="flex flex-col flex-1 min-w-0 relative">
                    <StreamTheme>
                        <SpeakerLayout participantsBarPosition="bottom" />
                        <CallControls onLeave={handleLeave} />
                    </StreamTheme>

                    {/* Floating chat button - mobile only, hidden while drawer open */}
                    {!panelOpen && (
                        <button
                            type="button"
                            onClick={() => setPanelOpen(true)}
                            className="md:hidden absolute bottom-24 right-4 z-20 w-12 h-12 rounded-full bg-amber-400 text-[#0a0a0b] flex items-center justify-center shadow-lg shadow-black/40"
                        >
                            <MessageSquare size={18} />
                        </button>
                    )}
                </div>

                {/* Backdrop - mobile only, visible only when drawer open */}
                <div
                    onClick={() => setPanelOpen(false)}
                    className={`md:hidden absolute inset-0 z-20 bg-black/60 transition-opacity ${panelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                />

                {/* SINGLE panel instance - desktop docked sidebar, mobile bottom drawer.
                    Only ONE <Chat>/<Channel> is ever mounted; responsive classes + CSS vars
                    switch it between the two layouts so nothing double-renders. */}
                <div
                    style={{
                        "--drawer-h": `${drawerHeightVh}vh`,
                        "--drawer-y": panelOpen ? "0%" : "100%",
                    }}
                    className={`
                        flex flex-col bg-[#0a0a0b] min-h-0 overflow-hidden
                        fixed md:relative
                        inset-x-0 bottom-0 md:inset-auto
                        z-30 md:z-auto
                        h-[var(--drawer-h)] md:h-auto
                        translate-y-[var(--drawer-y)] md:translate-y-0
                        transition-transform md:transition-none
                        ${dragState.current.dragging ? "duration-0" : "duration-200"}
                        rounded-t-2xl md:rounded-none
                        border-t md:border-t-0 md:border-l border-white/10 md:border-white/8
                        w-full md:w-85 md:shrink-0
                    `}
                >
                    {/* Drag handle - mobile only */}
                    <div
                        className="md:hidden w-full flex items-center justify-center py-2.5 cursor-grab active:cursor-grabbing touch-none shrink-0"
                        onMouseDown={onHandlePointerDown}
                        onTouchStart={onHandlePointerDown}
                    >
                        <div className="w-10 h-1.5 rounded-full bg-white/20" />
                    </div>

                    {/* Tab switcher */}
                    <div className="flex border-b border-white/8 shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab("chat")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${activeTab === "chat"
                                ? "text-amber-400 border-b-2 border-amber-400"
                                : "text-stone-500 hover:text-stone-300"
                                }`}
                        >
                            <MessageSquare size={13} />
                            Chat
                        </button>

                        {/* ganti "true" jika ingin terlihat */}
                        {isInterviewer && (
                            <button
                                type="button"
                                onClick={() => setActiveTab("ai")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${activeTab === "ai"
                                    ? "text-amber-400 border-b-2 border-amber-400"
                                    : "text-stone-500 hover:text-stone-300"
                                    }`}
                            >
                                <Sparkles size={13} />
                                AI Questions
                            </button>
                        )}
                    </div>

                    {/* Panel content */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {activeTab === "chat" ? (
                            chatClient && chatChannel ? (
                                <Chat client={chatClient} theme="str-chat__theme-dark">
                                    <WithComponents overrides={{ MessageActions: MessageActionsWithoutThread }}>
                                        <Channel channel={chatChannel} Modal={GlobalModal}>
                                            <Window>
                                                <MessageList />
                                                <MessageComposer focus />
                                            </Window>
                                        </Channel>
                                    </WithComponents>
                                </Chat>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 size={18} className="text-stone-600 animate-spin" />
                                </div>
                            )
                        ) : (
                            <div>
                                <AIQuestionsPanel categories={booking.categories} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}