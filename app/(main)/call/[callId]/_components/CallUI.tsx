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
    MessageComposer,
    MessageList,
    Window,
    useCreateChatClient,
} from "stream-chat-react";
import "stream-chat-react/dist/css/index.css";

import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Sparkles } from "lucide-react";
import AIQuestionsPanel from "./AIQuestions";


// Drawer height presets (vh units)
const DRAWER_MIN_VH = 30   // smallest height when dragged down (still visible, "peek" state)
const DRAWER_DEFAULT_VH = 55  // default open height
const DRAWER_MAX_VH = 90   // fully expanded when dragged up
const DRAWER_CLOSE_THRESHOLD_VH = 20 // drag below this -> drawer closes completely


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


    // Auto-stop recording before leaving
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


    // Chat client - same token works for both Video + Chat SDKs
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

        const channel = chatClient.channel("messaging", callId, {
            name: "Interview Chat",
            members: [
                booking.interviewer.clerkUserId,
                booking.interviewee.clerkUserId,
            ],
        })

        channel
            .watch()
            .then(() => setChatChannel(channel))
            .catch(console.error)

        return () => {
            channel.stopWatching().catch(() => { })
        }
    }, [chatClient, callId, booking])


    // Reset drawer to default height whenever it's (re)opened
    useEffect(() => {
        if (panelOpen) {
            setDrawerHeightVh(DRAWER_DEFAULT_VH)
        }
    }, [panelOpen])


    // ---- Drag handlers (pointer events work for both touch & mouse) ----
    const handleDragStart = useCallback((clientY) => {
        dragState.current = {
            dragging: true,
            startY: clientY,
            startHeightVh: drawerHeightVh,
        }
    }, [drawerHeightVh])

    const handleDragMove = useCallback((clientY) => {
        if (!dragState.current.dragging) return

        const deltaY = clientY - dragState.current.startY // positive = dragged down
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
                // dragged down far enough -> close the drawer
                setPanelOpen(false)
                return DRAWER_DEFAULT_VH
            }
            if (current > (DRAWER_MAX_VH + DRAWER_DEFAULT_VH) / 2) {
                return DRAWER_MAX_VH
            }
            if (current < (DRAWER_MIN_VH + DRAWER_DEFAULT_VH) / 2) {
                return DRAWER_MIN_VH
            }
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

    const PanelContent = (
        <>
            {/* Tab switcher */}
            <div className="flex border-b border-white/8 shrink-0">
                <button
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${activeTab === "chat"
                        ? "text-amber-400 border-b-2 border-amber-400"
                        : "text-stone-500 hover:text-stone-300"
                        }`}>
                    <MessageSquare size={13} />
                    Chat
                </button>

                {/* AI Questions tab - interviewer only */}
                {true && (
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
                            <Channel channel={chatChannel}>
                                <Window>
                                    <MessageList />
                                    <MessageComposer focus />
                                </Window>
                            </Channel>
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
        </>
    )

    return (
        <div className="h-[92vh] bg-[#0a0a0b] flex flex-col overflow-hidden relative">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                        variant="outline"
                        className="border-white/10 text-stone-500 text-xs"
                    >
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
                {/* Video - fills the whole body area (Zoom-style, mobile & desktop) */}
                <div className="flex flex-col flex-1 min-w-0 relative">
                    <StreamTheme>
                        <SpeakerLayout participantsBarPosition="bottom" />
                        <CallControls onLeave={handleLeave} />
                    </StreamTheme>

                    {/* Floating chat button - mobile only */}
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

                {/* DESKTOP: permanent side panel */}
                <div className="hidden md:flex w-85 shrink-0 flex-col border-l border-white/8 bg-[#0a0a0b] min-h-0">
                    {PanelContent}
                </div>

                {/* MOBILE: draggable drawer overlay */}
                {panelOpen && (
                    <div className="md:hidden absolute inset-0 z-30 flex flex-col justify-end">
                        {/* backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60"
                            onClick={() => setPanelOpen(false)}
                        />
                        {/* drawer - height controlled by drag */}
                        <div
                            className="relative z-10 bg-[#0a0a0b] rounded-t-2xl border-t border-white/10 flex flex-col overflow-hidden"
                            style={{
                                height: `${drawerHeightVh}vh`,
                                transition: dragState.current.dragging ? "none" : "height 0.2s ease-out",
                            }}
                        >
                            {/* Drag handle */}
                            <div
                                className="w-full flex items-center justify-center py-2.5 cursor-grab active:cursor-grabbing touch-none shrink-0"
                                onMouseDown={onHandlePointerDown}
                                onTouchStart={onHandlePointerDown}
                            >
                                <div className="w-10 h-1.5 rounded-full bg-white/20" />
                            </div>

                            {PanelContent}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}