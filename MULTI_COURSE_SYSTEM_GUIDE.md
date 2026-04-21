# Multi-Course Peer Challenge System

## Overview
The peer challenge system has been enhanced to support **multiple courses per student**, **course selection dropdown**, and **"Challenge All" functionality**.

## New Features

### 1. Course Selection Dropdown
- **Location**: Top of peer challenge modal
- **Data Source**: User's enrollments collection
- **Functionality**: 
  - Shows all courses the student is enrolled in
  - Displays course titles (courseTitle, courseName, or courseId fallback)
  - Auto-selects first course if none selected
  - Dynamic peer filtering based on selection

### 2. "Challenge All" Toggle
- **Location**: Below course selection in modal
- **Functionality**:
  - Toggle switch to challenge all peers in selected course
  - When enabled, hides peer selection list
  - Shows peer count in button text: "Challenge All (3)"
  - Creates separate challenge document for each peer

### 3. Dynamic Peer Filtering
- **Main View**: Course filter dropdown (only shows if user has >1 course)
- **Modal View**: Peer list updates based on selected course
- **Real-time**: Peers update instantly when course changes

## Updated Data Flow

### 1. Course Selection
```javascript
// Fetch user enrollments
const enrollmentQuery = query(
  collection(db, 'enrollments'),
  where('studentEmail', '==', auth.currentUser.email)
);

// Set selected course
setSelectedCourse(enrollment);
```

### 2. Peer Filtering
```javascript
// Fetch peers for selected course
const peersQuery = query(
  collection(db, 'enrollments'),
  where('courseId', '==', selectedCourse.courseId)
);
```

### 3. Challenge Creation (Single Peer)
```javascript
const challengeData = {
  senderId: auth.currentUser.uid,
  senderEmail: auth.currentUser.email,
  senderName: senderName,
  receiverId: selectedPeer.uid,
  receiverEmail: selectedPeer.email,
  receiverName: selectedPeer.displayName,
  courseId: selectedCourse.courseId,
  courseTitle: selectedCourse.courseTitle,
  question, options, correctAnswer,
  status: 'pending',
  type: 'peer'
};
```

### 4. Challenge Creation (All Peers)
```javascript
// Fetch all peers in course
const allPeersSnapshot = await getDocs(
  query(collection(db, 'enrollments'), where('courseId', '==', selectedCourse.courseId))
);

// Create challenge for each peer
const challengePromises = allPeers.map(peer => 
  addDoc(collection(db, 'challenges'), peerChallengeData)
);
await Promise.all(challengePromises);
```

## UI Components

### Modal Structure
```
1. Course Selection Section
   - Dropdown with user's courses
   - Course info display (title, ID)

2. Challenge All Toggle
   - Switch button
   - Description text

3. Peer Selection (Conditional)
   - Only shows when Challenge All is OFF
   - List of peers in selected course
   - Click to select peer

4. Challenge Details
   - Question textarea
   - 4 answer options with radio buttons
   - Correct answer selection

5. Action Buttons
   - Cancel / Send
   - Dynamic button text
```

### Main View Updates
```
- Course filter dropdown (if >1 course)
- Dynamic course title in header
- Peer list updates with course selection
- Course info under each peer
```

## State Management

### New State Variables
```javascript
const [selectedCourse, setSelectedCourse] = useState(null);
const [userEnrollments, setUserEnrollments] = useState([]);
const [challengeAll, setChallengeAll] = useState(false);
```

### useEffect Dependencies
```javascript
// Fetch user enrollments
useEffect(() => {
  // Runs when auth.currentUser.email changes
}, [auth.currentUser?.email]);

// Fetch peers for selected course
useEffect(() => {
  // Runs when selectedCourse.courseId changes
}, [selectedCourse?.courseId, auth.currentUser?.email]);
```

## Validation Logic

### Updated Requirements
- **Required**: auth.currentUser, selectedCourse
- **Conditional**: selectedPeer (if not Challenge All)
- **Form Validation**: question, all 4 options filled

### Error Messages
- "Missing required information: auth.currentUser, selectedCourse"
- "Please select a peer or choose 'Challenge All'"
- "Please enter a question"
- "Please fill in all four options"

## Button States

### Send Button Text
- **Loading**: "Sending..."
- **Challenge All**: "Challenge All (3)"
- **Single Peer**: "Send Challenge"

### Button Disabled When
- Currently creating challenge
- No course selected
- Not Challenge All AND no peer selected

## Database Schema

### Enrollments Collection (unchanged)
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

### Challenges Collection (enhanced)
```javascript
{
  // Sender info
  senderId: "chrome-user-1",
  senderEmail: "chrome@example.com",
  senderName: "Chrome User",
  
  // Receiver info
  receiverId: "edge-user-1",
  receiverEmail: "edge@example.com",
  receiverName: "Edge User",
  
  // Course info
  courseId: "webdev101",
  courseTitle: "Web Development 101",
  
  // Challenge content
  question: "What is 2+2?",
  options: ["3", "4", "5", "6"],
  correctAnswer: 1,
  
  // Metadata
  status: "pending",
  createdAt: Timestamp,
  type: "peer"
}
```

## Testing Scenarios

### 1. Single Course User
- Only one enrollment
- No course filter in main view
- Course dropdown in modal (only one option)

### 2. Multi-Course User
- Multiple enrollments
- Course filter in main view
- Course dropdown in modal
- Dynamic peer switching

### 3. Challenge All Testing
- Toggle Challenge All ON
- Peer selection disappears
- Button shows peer count
- Creates multiple challenges

### 4. Course Switching
- Change course in main view
- Peer list updates
- Modal reflects new selection
- Previous selections reset

## Performance Considerations

### Optimizations
- **Real-time listeners** for peer updates
- **Promise.all()** for bulk challenge creation
- **Conditional rendering** for peer selection
- **Memoized course data** to prevent re-fetches

### Potential Issues
- **Large courses**: Challenge All creates many documents
- **Network**: Multiple Firebase calls for Challenge All
- **State**: Complex state dependencies

## Future Enhancements

### Possible Improvements
1. **Batch operations**: Use batched writes for Challenge All
2. **Progress indicators**: Show progress during bulk creation
3. **Course management**: Add/remove courses from UI
4. **Challenge templates**: Save common question patterns
5. **Analytics**: Track challenge creation by course

## Migration Notes

### From Single Course System
1. **No breaking changes** to existing data
2. **Backward compatible** with single-course users
3. **Gradual rollout** possible
4. **Same challenge collection** used

### Data Cleanup
- Old peer fetching logic can be removed
- User profile courseId dependencies eliminated
- Enrollment-based system is now primary
