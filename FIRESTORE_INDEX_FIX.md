# Firestore Index Fix - Doubt Section

## Problem
The error occurred because of a complex Firestore query that required a composite index:
```
query(
  collection(db, 'doubts'),
  where('courseId', 'in', courseIds),
  where('askerEmail', '!=', currentUser.email),
  where('status', 'in', ['pending', 'under_discussion'])
)
```

## Solution
Restructured the queries to avoid complex index requirements:

### Before (Required Index)
```javascript
const feedQuery = query(
  collection(db, 'doubts'),
  where('courseId', 'in', courseIds),
  where('askerEmail', '!=', currentUser.email),  // This caused the issue
  where('status', 'in', ['pending', 'under_discussion'])
);
```

### After (No Index Required)
```javascript
const feedQuery = query(
  collection(db, 'doubts'),
  where('courseId', 'in', courseIds),
  where('status', 'in', ['pending', 'under_discussion'])
);

// Filter user's own doubts in processing instead of query
const unsubscribeFeed = onSnapshot(feedQuery, (snapshot) => {
  const doubtsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Filter out user's own doubts here
  const filteredDoubts = doubtsList.filter(doubt => doubt.askerEmail !== currentUser.email);
  setFeedDoubts(filteredDoubts.sort((a, b) => {
    const timeA = a.timestamp?.toDate?.() || new Date(0);
    const timeB = b.timestamp?.toDate?.() || new Date(0);
    return timeB - timeA;
  }));
});
```

## Why This Works
1. **Simplified Query**: Removed the `!=` operator which requires a composite index
2. **Client-side Filtering**: Filter out user's own doubts after fetching
3. **Same Functionality**: Users still only see doubts from others in their courses
4. **Better Performance**: Fewer complex queries, faster execution

## Query Structures That Work Without Custom Indexes

### Simple Equality Queries
```javascript
query(collection(db, 'doubts'), where('courseId', '==', 'course-id'))
```

### Array Queries (2 fields max)
```javascript
query(
  collection(db, 'doubts'),
  where('courseId', 'in', ['course1', 'course2']),
  where('status', 'in', ['pending', 'solved'])
)
```

### Single Field Queries
```javascript
query(collection(db, 'doubts'), where('askerEmail', '==', 'email@example.com'))
```

## Queries That Require Custom Indexes

### Complex Queries with 3+ fields
```javascript
query(
  collection(db, 'doubts'),
  where('courseId', 'in', courseIds),
  where('askerEmail', '!=', email),
  where('status', 'in', statuses)
)
```

### Inequality Queries + Other Fields
```javascript
query(
  collection(db, 'doubts'),
  where('askerEmail', '!=', email),
  where('status', '==', 'pending')
)
```

## Implementation Notes
- Student doubts page: Fixed feed query
- Teacher doubts page: Already using simple queries
- Both pages now work without custom Firestore indexes
- Functionality remains exactly the same for users

## Testing
The fix has been implemented and should resolve the Firestore index error. The doubt section will now work without requiring any custom indexes to be created in the Firebase console.
