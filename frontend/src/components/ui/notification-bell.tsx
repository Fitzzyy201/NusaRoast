"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Bell, Package, Truck, Check } from "lucide-react"
import { notificationApi, AppNotification } from "@/services/api"
import { cn } from "@/lib/utils"

function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  active: boolean
) {
  useEffect(() => {
    if (!active) return
    const handlePointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside()
      }
    }
    document.addEventListener("mousedown", handlePointer)
    return () => document.removeEventListener("mousedown", handlePointer)
  }, [ref, onOutside, active])
}

function NotificationItem({ notification, onClick }: { notification: AppNotification; onClick: () => void }) {
  const Icon =
    notification.type === "SHIPMENT"
      ? Truck
      : notification.type === "COMPLETED"
        ? Check
        : Package

  return (
    <Link
      href="/orders"
      onClick={onClick}
      className={cn(
        "flex gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-primary/5",
        !notification.isRead && "bg-accent/5"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-primary">{notification.title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted">{notification.message}</span>
        <span className="mt-1 block text-[10px] text-muted">
          {new Date(notification.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </span>
    </Link>
  )
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getNotifications()
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.isRead).length)
    } catch {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [])

  const closeAndMarkRead = useCallback(() => {
    setIsOpen(false)
    notificationApi.markAllAsRead().catch(() => {})
    setUnreadCount(0)
  }, [])

  useOutsideClick(ref, closeAndMarkRead, isOpen)

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void fetchNotifications()
    }, 0)
    const interval = window.setInterval(() => {
      void fetchNotifications()
    }, 60_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [fetchNotifications])

  return (
    <div ref={ref} className="relative block">
      <button
        type="button"
        onClick={() => {
          if (!isOpen) void fetchNotifications()
          setIsOpen((o) => !o)
        }}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-primary/5 hover:text-primary",
          isOpen ? "text-primary" : "text-muted"
        )}
        aria-label="Notifikasi"
        aria-expanded={isOpen}
        aria-controls="notification-menu"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-jakarta text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-menu"
          className="absolute right-0 top-full mt-3 w-80 overflow-hidden rounded-lg border border-border bg-paper shadow-xl shadow-primary/10"
        >
          <div className="border-b border-border px-4 py-3 text-sm font-semibold text-primary">
            Notifikasi
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">Belum ada notifikasi.</p>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <NotificationItem key={n.id} notification={n} onClick={closeAndMarkRead} />
              ))
            )}
          </div>
          <div className="border-t border-border bg-paper px-4 py-2 text-center">
            <Link
              href="/orders"
              onClick={closeAndMarkRead}
              className="text-xs font-semibold text-primary underline underline-offset-2"
            >
              Lihat semua pesanan
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
