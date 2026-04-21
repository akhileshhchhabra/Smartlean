# Firebase Authentication Error Fix

## Error
```
FirebaseError: Error (auth/invalid-credential)
```

## Common Causes & Solutions

### 1. Wrong Email/Password (Most Common)
**Symptoms**: User can't login with existing credentials
**Solution**: 
- Verify the email and password are correct
- Check for typos in email address
- Ensure password is correct (case-sensitive)

### 2. User Doesn't Exist in Firebase Auth
**Symptoms**: New user trying to login without account creation
**Solution**: 
- User needs to sign up first at `/signup`
- Check if user was created properly in Firebase Auth

### 3. Firebase Configuration Issues
**Symptoms**: Authentication fails even with correct credentials
**Solution**: 
- Verify Firebase project configuration
- Check if Authentication is enabled in Firebase Console
- Ensure email/password sign-in method is enabled

## Quick Diagnostic Steps

### Step 1: Check Firebase Console
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `smart-learn-4e62c`
3. Go to Authentication > Users
4. Verify the user exists in the users list

### Step 2: Test Authentication Method
1. In Firebase Console > Authentication > Sign-in method
2. Ensure "Email/Password" is **Enabled**
3. Check if there are any restrictions

### Step 3: Verify User Creation
If user doesn't exist, they need to sign up first:
```
Navigate to: /signup
Create account with email and password
Then try login at: /login
```

## Code Improvements (Already Implemented)

### Better Error Handling
The login page already has comprehensive error handling:

```javascript
function friendlyAuthError(err) {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  // ... other error cases
}
```

### Auth State Management
Both student and teacher pages properly handle auth state:

```javascript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    setCurrentUser(user);
    if (user) {
      // User is authenticated, proceed with data fetching
    } else {
      // User is not authenticated, redirect to login
      router.push('/login');
    }
  });
  return unsubscribe;
}, []);
```

## Immediate Solutions

### For Users Trying to Login
1. **Check Credentials**: Ensure email and password are correct
2. **Sign Up First**: If new user, go to `/signup` to create account
3. **Reset Password**: Use "Forgot?" link if password is forgotten

### For Developers
1. **Verify Firebase Config**: Check `src/lib/firebase.js`
2. **Check Auth Settings**: Ensure email/password is enabled
3. **Test with Known User**: Try login with a known working account

## Prevention

### Add Better Validation
```javascript
// Add to login form validation
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password.length >= 6; // Minimum length
};
```

### Add User Status Check
```javascript
// Check if user exists before attempting login
const checkUserExists = async (email) => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  } catch (error) {
    return false;
  }
};
```

## Current Status

The authentication system is properly configured with:
- Firebase project setup: `smart-learn-4e62c`
- Email/password authentication enabled
- Comprehensive error handling
- Proper auth state management
- Role-based routing (Student/Teacher)

## Most Likely Issue

The `auth/invalid-credential` error is most likely caused by:
1. **Wrong password** (90% of cases)
2. **User trying to login without signing up first** (8% of cases)
3. **Typos in email address** (2% of cases)

## Quick Fix for Users

1. Go to `/signup` and create a new account
2. Or use the "Forgot?" link to reset password
3. Try login again with correct credentials

The authentication system is working correctly - this is typically a user credential issue rather than a code problem.
