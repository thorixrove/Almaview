import {
    format,
    isToday,
    isTomorrow,
    addDays,
    addMinutes,
    isBefore,
    isAfter,
    set,
    differenceInMinutes,
} from "date-fns"

export function formatDate(iso) {
    return format(new Date(iso), "EEE, MMM d, yyyy")
}

export function formatDateFull(date) {
    return format(new Date(date), "EEEE, MMMM d, yyyy")
}

export function formatTime(date) {
    return format(new Date(date), "h:mm a")
}

export function formatDuration(start, end) {
    const mins = differenceInMinutes(new Date(end), new Date(start))
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}


export function formatDateTab(date) {
    const bottom = format(date, "MMM d")
    if (isToday(date)) return { top: "Today", bottom }
    if (isTomorrow(date)) return { top: "Tomorrow", bottom }
    return { top: format(date, "EEE"), bottom }
}

export function generateDates(daysAhead) {
    return Array.from({ length: daysAhead }, (_, i) => addDays(new Date(), i))
}

export function generateSlots(
    date,
    availStartTime,
    availEndTime,
    bookedSlots,
    slotDurationMinutes
) {
    console.log(availStartTime, availEndTime, bookedSlots)

    const avStart = new Date(availStartTime)
    const avEnd = new Date(availEndTime)


    const start = set(new Date(date), {
        hours: avStart.getHours(),
        minutes: avStart.getMinutes(),
        seconds: 0,
        milliseconds: 0,
    })

    const end = set(new Date(date), {
        hours: avEnd.getHours(),
        minutes: avStart.getMinutes(),
        seconds: 0,
        milliseconds: 0,
    })


    const now = new Date()
    const slots = []
    let cursor = start

    while (isBefore(cursor, end)) {
        const slotEnd = addMinutes(cursor, slotDurationMinutes)

        if (isAfter(slotEnd, end)) break

        const isBooked = bookedSlots.some(
            (b) =>
                isBefore(cursor, new Date(b.endTime)) &&
            isAfter(slotEnd, new Date(b.startTime))
        )

        if(isAfter(cursor, now)) {
            slots.push({
                startTime: cursor,
                endTime: slotEnd,
                isBooked,
                available: !isBooked,
            })
        }

        cursor = slotEnd
    }

    return slots
}