const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore');

// Initialize Firebase Admin
admin.initializeApp();

// Notification Cloud Functions
exports.onNewVideo = onDocumentCreated('courses/{courseId}/videos/{videoId}', async (event) => {
  const { courseId, videoId } = event.params;
  const videoData = event.data.data;
  
  try {
    // Get all users enrolled in this course
    const enrollmentsSnapshot = await admin.firestore()
      .collection('enrollments')
      .where('courseId', '==', courseId)
      .get();
    
    const enrolledUsers = enrollmentsSnapshot.docs.map(doc => doc.data().userId);
    
    // Create notifications for each enrolled user
    const notificationPromises = enrolledUsers.map(userId => {
      return admin.firestore().collection('notifications').add({
        recipientId: userId,
        senderName: 'SmartLearn System',
        title: 'New Video Available',
        message: `A new video "${videoData.title}" has been added to your course.`,
        type: 'video',
        link: `/student-dashboard/courses/${courseId}`,
        isRead: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        courseId: courseId,
        videoId: videoId
      });
    });
    
    await Promise.all(notificationPromises);
    
    console.log(`Created ${enrolledUsers.length} notifications for new video in course ${courseId}`);
  } catch (error) {
    console.error('Error creating video notifications:', error);
  }
});

exports.onNewDoubt = onDocumentCreated('doubts/{doubtId}', async (event) => {
  const { doubtId } = event.params;
  const doubtData = event.data.data;
  
  try {
    // Identify the teacher who should receive this doubt
    if (doubtData.teacherId) {
      await admin.firestore().collection('notifications').add({
        recipientId: doubtData.teacherId,
        senderName: 'SmartLearn System',
        title: 'New Student Doubt',
        message: `A student has asked a new doubt: "${doubtData.question}"`,
        type: 'doubt',
        link: `/teacher-dashboard/doubt-1/${doubtId}`,
        isRead: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        doubtId: doubtId,
        studentId: doubtData.studentId
      });
      
      console.log(`Created notification for teacher ${doubtData.teacherId} about new doubt ${doubtId}`);
    }
  } catch (error) {
    console.error('Error creating doubt notification:', error);
  }
});

exports.onDoubtResolved = onDocumentUpdated('doubts/{doubtId}', async (event) => {
  const { doubtId } = event.params;
  const beforeData = event.data.before;
  const afterData = event.data.after;
  
  try {
    // Check if status changed to 'resolved'
    if (beforeData.status !== 'resolved' && afterData.status === 'resolved') {
      // Notify the student who created the doubt
      if (afterData.studentId) {
        await admin.firestore().collection('notifications').add({
          recipientId: afterData.studentId,
          senderName: 'SmartLearn System',
          title: 'Doubt Resolved',
          message: `Your doubt "${afterData.question}" has been resolved by your teacher.`,
          type: 'doubt',
          link: `/student-dashboard/doubt/${doubtId}`,
          isRead: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          doubtId: doubtId,
          teacherId: afterData.teacherId
        });
        
        console.log(`Created notification for student ${afterData.studentId} about resolved doubt ${doubtId}`);
      }
    }
  } catch (error) {
    console.error('Error creating resolved doubt notification:', error);
  }
});

// Utility function to mark notifications as read
exports.markNotificationAsRead = functions.https.onCall(async (data, context) => {
  const { notificationId } = data;
  
  try {
    await admin.firestore().collection('notifications').doc(notificationId).update({
      isRead: true,
      readAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'Notification marked as read' };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new functions.https.HttpsError('internal', 'Error marking notification as read');
  }
});

// Batch mark multiple notifications as read
exports.markMultipleNotificationsAsRead = functions.https.onCall(async (data, context) => {
  const { notificationIds } = data;
  
  try {
    const batch = admin.firestore().batch();
    
    notificationIds.forEach(notificationId => {
      const notificationRef = admin.firestore().collection('notifications').doc(notificationId);
      batch.update(notificationRef, {
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    return { success: true, message: `${notificationIds.length} notifications marked as read` };
  } catch (error) {
    console.error('Error marking multiple notifications as read:', error);
    throw new functions.https.HttpsError('internal', 'Error marking notifications as read');
  }
});

// Get unread notifications count
exports.getUnreadCount = functions.https.onCall(async (data, context) => {
  const { userId } = data;
  
  try {
    const snapshot = await admin.firestore()
      .collection('notifications')
      .where('recipientId', '==', userId)
      .where('isRead', '==', false)
      .get();
    
    const unreadCount = snapshot.size;
    
    return { success: true, unreadCount };
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw new functions.https.HttpsError('internal', 'Error getting unread count');
  }
});
