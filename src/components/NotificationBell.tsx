// src/components/NotificationBell.tsx
import { useState, useEffect, useRef } from 'react';
import { Bell, X, BookOpen, Clock, AlertCircle, CheckCircle, BookMarked } from 'lucide-react';

export interface Notification {
    id: string;
    userId: string;
    type:
    | 'DUE_TODAY'
    | 'DUE_SOON'
    | 'OVERDUE'
    | 'HOLD_PLACED'
    | 'HOLD_REMOVED'
    | 'RESERVATION_CONFIRMED'
    | 'RESERVATION_OVERDUE';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

interface NotificationBellProps {
    userId: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

const NOTIFICATION_ICONS: Record<Notification['type'], React.ReactNode> = {
    DUE_TODAY: <Clock className="h-4 w-4 text-yellow-500" />,
    DUE_SOON: <Clock className="h-4 w-4 text-blue-500" />,
    OVERDUE: <AlertCircle className="h-4 w-4 text-red-500" />,
    HOLD_PLACED: <BookMarked className="h-4 w-4 text-library-primary" />,
    HOLD_REMOVED: <BookMarked className="h-4 w-4 text-gray-400" />,
    RESERVATION_CONFIRMED: <CheckCircle className="h-4 w-4 text-green-500" />,
    RESERVATION_OVERDUE: <AlertCircle className="h-4 w-4 text-red-600" />,
};

const NOTIFICATION_COLORS: Record<Notification['type'], string> = {
    DUE_TODAY: 'border-l-yellow-400',
    DUE_SOON: 'border-l-blue-400',
    OVERDUE: 'border-l-red-500',
    HOLD_PLACED: 'border-l-green-500',
    HOLD_REMOVED: 'border-l-gray-400',
    RESERVATION_CONFIRMED: 'border-l-green-600',
    RESERVATION_OVERDUE: 'border-l-red-600',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/notifications/${userId}`);
            if (!res.ok) return;
            const data: Notification[] = await res.json();
            setNotifications(data);
        } catch {
            // silently fail — bell just shows nothing
        } finally {
            setLoading(false);
        }
    };

    // Fetch on mount + poll every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [userId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, read: true } : n))
            );
        } catch {
            // optimistic update already applied
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch(`${API_BASE_URL}/notifications/user/${userId}/read-all`, { method: 'PATCH' });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    };

    const dismissNotification = async (id: string) => {
        try {
            await fetch(`${API_BASE_URL}/notifications/${id}`, { method: 'DELETE' });
        } catch { /* ignore */ }
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen(prev => !prev)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5 text-white" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-library-primary text-white">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            <span className="font-semibold text-sm">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-library-accent hover:text-white transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification list */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {loading && notifications.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                                <BookOpen className="h-8 w-8 opacity-30" />
                                <span className="text-sm">No notifications</span>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`flex gap-3 px-4 py-3 border-l-4 transition-colors cursor-pointer
                    ${NOTIFICATION_COLORS[notification.type]}
                    ${notification.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}`}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {NOTIFICATION_ICONS[notification.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${notification.read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {timeAgo(notification.createdAt)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); dismissNotification(notification.id); }}
                                        className="shrink-0 mt-0.5 text-gray-300 hover:text-gray-500 transition-colors"
                                        aria-label="Dismiss"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                            <button
                                onClick={() => setNotifications([])}
                                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
