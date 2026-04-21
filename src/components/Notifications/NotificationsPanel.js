import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Clock, Video, MessageSquare, BookOpen, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsPanel({ userId, isOpen, onClose }) {
  const { notifications, unreadCount, loading, markAsRead, markMultipleAsRead, deleteNotification } = useNotifications(userId);
  const [filter, setFilter] = useState('all');

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'doubt':
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      case 'enrollment':
        return <BookOpen className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-zinc-500" />;
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type) => {
    switch (type) {
      case 'video':
        return 'border-blue-200 bg-blue-50';
      case 'doubt':
        return 'border-orange-200 bg-orange-50';
      case 'enrollment':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-zinc-200 bg-zinc-50';
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Mark all as read
  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    markMultipleAsRead(unreadIds);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-zinc-600" />
                <h2 className="text-xl font-bold text-black">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-zinc-200">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'text-black border-b-2 border-black'
                    : 'text-zinc-600 hover:text-black border-b-2 border-transparent'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'text-black border-b-2 border-black'
                    : 'text-zinc-600 hover:text-black border-b-2 border-transparent'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  filter === 'read'
                    ? 'text-black border-b-2 border-black'
                    : 'text-zinc-600 hover:text-black border-b-2 border-transparent'
                }`}
              >
                Read ({notifications.length - unreadCount})
              </button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-zinc-300 border-t-zinc-600"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <Bell className="h-12 w-12 mb-4 text-zinc-300" />
                  <p className="text-lg font-medium">No notifications</p>
                  <p className="text-sm text-zinc-400">
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications found'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 hover:bg-zinc-50 transition-colors cursor-pointer ${
                        notification.isRead ? 'opacity-60' : ''
                      }`}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-full ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-black mb-1">
                                {notification.title}
                              </h3>
                              <p className="text-sm text-zinc-600 mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Clock className="h-3 w-3" />
                                <span>{formatTime(notification.timestamp)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                  Mark as Read
                                </button>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          {notification.link && (
                            <a
                              href={notification.link}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors mt-3"
                            >
                              <AlertCircle className="h-4 w-4" />
                              View Details
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-4 border-t border-zinc-200 bg-zinc-50">
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Mark All as Read
              </button>
              
              <div className="text-sm text-zinc-500">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
