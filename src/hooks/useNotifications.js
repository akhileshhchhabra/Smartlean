import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, doc, updateDoc, deleteDoc, collection, query, where, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';

export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await updateDoc(doc(collection(db, 'notifications'), notificationId), {
        isRead: true,
        readAt: new Date()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark multiple notifications as read
  const markMultipleAsRead = useCallback(async (notificationIds) => {
    try {
      const batch = writeBatch(db);
      
      notificationIds.forEach(id => {
        const notificationRef = doc(collection(db, 'notifications'), id);
        batch.update(notificationRef, {
          isRead: true,
          readAt: new Date()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking multiple notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await deleteDoc(doc(collection(db, 'notifications'), notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }, [userId]);

  // Real-time listener for notifications
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      }));
      
      setNotifications(notificationsList);
      
      // Update unread count
      const unreadCount = notificationsList.filter(n => !n.isRead).length;
      setUnreadCount(unreadCount);
      
      setLoading(false);
    }, (error) => {
      console.error('Error listening to notifications:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  // Auto-update unread count
  useEffect(() => {
    getUnreadCount().then(count => {
      setUnreadCount(count);
    });
  }, [userId, getUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markMultipleAsRead,
    deleteNotification,
    getUnreadCount
  };
};
