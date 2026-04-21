# Enrollment-Based Peer Challenge System

## Overview
The peer challenge system has been completely refactored to use the **enrollments collection** instead of relying on user profiles for course information.

## Database Structure

### Enrollments Collection
```javascript
{
  studentEmail: "chrome@example.com",
  studentId: "chrome-user-1", 
  studentName: "Chrome User",
  courseId: "webdev101",
  courseTitle: "Web Development 101",
  enrolledAt: Timestamp,
  status: "active"
}
```

### Challenges Collection (Peer Type)
```javascript
{
  senderId: "chrome-user-1",
  senderEmail: "chrome@example.com",
  senderName: "Chrome User",
  receiverId: "edge-user-1",
  receiverEmail: "edge@example.com", 
  receiverName: "Edge User",
  courseId: "webdev101",
  courseTitle: "Web Development 101",
  question: "What is 2+2?",
  options: ["3", "4", "5", "6"],
  correctAnswer: 1,
  status: "pending",
  createdAt: Timestamp,
  type: "peer"
}
```

## System Flow

### 1. Find Current Course
```javascript
// Query enrollments collection for current user
const enrollmentQuery = query(
  collection(db, 'enrollments'),
  where('studentEmail', '==', auth.currentUser.email)
);
```

### 2. Find Peers
```javascript
// Find other students in same course
const peersQuery = query(
  collection(db, 'enrollments'),
  where('courseId', '==', courseId)
);
```

### 3. Challenge Creation
- Uses enrollment data for courseId
- Dynamic ID generation with addDoc()
- Stores both sender and receiver emails
- No dependency on user profile course fields

## Key Benefits

### 1. **Solves "Missing Information" Error**
- CourseId fetched dynamically from enrollments
- No more dependency on user profile fields
- Robust error handling for missing enrollments

### 2. **Clean Data Separation**
- User profiles: Authentication + basic info
- Enrollments: Course relationships
- Challenges: Challenge data

### 3. **Flexible Field Support**
- Supports both studentEmail and studentId
- Handles missing fields gracefully
- Fallback values for display names

## Testing Setup

### 1. Create Test Enrollments
```bash
node create-enrollments.js
```

### 2. Verify System
```bash
node test-enrollment-system.js
```

### 3. Test Flow
1. Login as Chrome User (chrome@example.com)
2. Go to Challenges page
3. Should see "Peer Challenges" interface
4. See Edge User as peer in same course
5. Create challenge for Edge User
6. Login as Edge User to receive challenge

## Error Handling

### Common Issues & Solutions

#### "No enrollment found"
- User not enrolled in any course
- Solution: Create enrollment document first

#### "Enrollment found but no courseId specified"  
- Enrollment document missing courseId
- Solution: Ensure courseId field exists in enrollment

#### "No peers found"
- Only one student in course
- Solution: Add more enrollments with same courseId

## Debug Logging

The system includes comprehensive debug logging:
- Enrollment queries and results
- Peer discovery process
- Challenge creation data
- Error details with specific field information

## Firestore Index Requirements

The system may require composite indexes for:
- `enrollments` collection: (studentEmail, courseId)
- `challenges` collection: (type, receiverEmail)

Firebase will automatically provide index creation links when needed.

## Migration from User Profile System

If migrating from user profile-based system:
1. Create enrollment documents for existing users
2. Update peer challenge queries to use enrollment data
3. Remove courseId dependencies from user profiles
4. Test with existing challenge data

## Future Enhancements

1. **Multiple Course Support**: Students can be in multiple courses
2. **Course Management**: Add course details, instructors, schedules
3. **Challenge Categories**: Subject-based challenges within courses
4. **Analytics**: Track challenge completion rates by course
