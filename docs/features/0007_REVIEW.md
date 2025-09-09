# Code Review: Team Availability Feature

## Overview
This review covers the implementation of the team availability feature that allows team creators to set weekly availability for games, including days of the week and time ranges.

## Implementation Summary
- **Database Schema**: Added `team_availability` table with proper constraints
- **API Endpoints**: GET and PUT endpoints for team availability management
- **Frontend**: Modal component for availability management with day/time selection
- **Integration**: Updated team detail page with "Edit Availability" button

## ✅ Correct Implementation

### 1. Plan Adherence
The feature was correctly implemented according to the requirements:
- ✅ Button renamed from "Edit Team" to "Edit Availability"
- ✅ Team creators can set weekly availability
- ✅ Days of the week selection (Monday-Sunday)
- ✅ Time range selection for available days
- ✅ Proper authorization (only team creators can edit)

### 2. Database Design
- ✅ **Schema**: Well-designed `team_availability` table with appropriate fields
- ✅ **Constraints**: Unique constraint prevents duplicate entries per team/day
- ✅ **Types**: Proper TypeScript types exported for frontend use
- ✅ **Migration**: Clean migration file generated successfully

### 3. API Implementation
- ✅ **Security**: Proper authorization checks (team creator for updates, members/admins for viewing)
- ✅ **Validation**: Input validation for day names and time requirements
- ✅ **Error Handling**: Consistent error handling using `handleDatabaseError`
- ✅ **Data Integrity**: Delete-and-insert pattern ensures clean updates

### 4. Frontend Implementation
- ✅ **UI/UX**: Clean, intuitive modal with toggle switches and time pickers
- ✅ **State Management**: Proper React state management with loading/error states
- ✅ **Responsive Design**: Modal works well on different screen sizes
- ✅ **Accessibility**: Proper labels and form controls

## ⚠️ Issues Found

### 1. **CRITICAL: Inconsistent API Usage**
**Location**: `ui/src/components/TeamAvailabilityModal.tsx` lines 66-70, 118-125

**Issue**: The modal component uses direct `fetch()` calls instead of the established `fetchWithAuth()` pattern used throughout the codebase.

**Current Code**:
```typescript
const response = await fetch(`/api/v1/protected/teams/${teamId}/availability`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('firebase-token')}`,
  },
});
```

**Problem**: 
- Inconsistent with codebase patterns
- Manual token management instead of using the established auth helper
- Potential for auth token issues

**Fix**: Use the existing `api.getTeamAvailability()` and `api.updateTeamAvailability()` functions that were already created in `serverComm.ts`.

### 2. **Data Alignment Issue**
**Location**: `ui/src/components/TeamAvailabilityModal.tsx` lines 77-86

**Issue**: The `loadAvailability()` function has a potential race condition and data alignment issue.

**Current Code**:
```typescript
const updatedAvailability = availability.map(day => {
  const existing = existingAvailability.find((e: any) => e.day_of_week === day.day_of_week);
  // ...
});
```

**Problem**: 
- Uses `availability` state in the map function, but this might be stale
- The `availability` state is set in the same `useEffect` that calls `loadAvailability()`
- Could lead to inconsistent data merging

**Fix**: Use the `initialAvailability` variable directly instead of the state:
```typescript
const updatedAvailability = initialAvailability.map(day => {
  const existing = existingAvailability.find((e: any) => e.day_of_week === day.day_of_week);
  // ...
});
```

### 3. **Missing Error Handling**
**Location**: `ui/src/components/TeamAvailabilityModal.tsx` lines 88-89

**Issue**: The error handling in `loadAvailability()` doesn't handle non-200 responses properly.

**Current Code**:
```typescript
if (response.ok) {
  // handle success
}
// No else clause for non-200 responses
```

**Problem**: Non-200 responses are silently ignored, which could lead to confusing UX.

**Fix**: Add proper error handling for non-200 responses.

### 4. **Type Safety Issue**
**Location**: `ui/src/components/TeamAvailabilityModal.tsx` line 78

**Issue**: Uses `any` type for the existing availability object.

**Current Code**:
```typescript
const existing = existingAvailability.find((e: any) => e.day_of_week === day.day_of_week);
```

**Problem**: Loses type safety and could lead to runtime errors.

**Fix**: Define proper interface for the API response or use the existing `TeamAvailability` type.

### 5. **Potential Performance Issue**
**Location**: `server/src/api.ts` lines 1448-1465

**Issue**: The update endpoint uses delete-and-insert pattern, which could be inefficient for large datasets.

**Current Code**:
```typescript
// Delete existing availability for this team
await db.delete(team_availability).where(eq(team_availability.team_id, teamId));

// Insert new availability
await db.insert(team_availability).values(newAvailability);
```

**Problem**: 
- Two separate database operations
- Could cause brief inconsistency if the operation fails between delete and insert
- Not atomic

**Fix**: Consider using an upsert pattern or wrapping in a transaction.

## 🔧 Recommended Fixes

### Priority 1 (Critical)
1. **Fix API Usage**: Update `TeamAvailabilityModal` to use the established `api` functions instead of direct fetch calls.

### Priority 2 (Important)
2. **Fix Data Alignment**: Resolve the race condition in `loadAvailability()`.
3. **Add Error Handling**: Handle non-200 responses in the modal.
4. **Improve Type Safety**: Replace `any` types with proper interfaces.

### Priority 3 (Nice to Have)
5. **Optimize Database Operations**: Consider using upsert pattern for availability updates.
6. **Add Loading States**: Show loading indicators during save operations.

## 📊 Code Quality Assessment

### Strengths
- ✅ Clean database schema design
- ✅ Proper authorization and validation
- ✅ Good UI/UX design
- ✅ Consistent error handling in API
- ✅ Proper TypeScript types for database

### Areas for Improvement
- ⚠️ Inconsistent API usage patterns
- ⚠️ Some type safety issues
- ⚠️ Missing error handling in frontend
- ⚠️ Potential race conditions

## 🎯 Overall Assessment

**Score: 7.5/10**

The feature is functionally correct and well-implemented overall, but has some consistency and robustness issues that should be addressed. The core functionality works as intended, but the code quality could be improved to match the established patterns in the codebase.

**Recommendation**: Address the critical API usage issue and the data alignment problem before considering this feature complete. The other issues are important but not blocking.
