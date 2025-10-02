# Common Components

Shared UI components for FitFlow Pro mobile app.

## DeleteAccountModal

Confirmation modal for irreversible account deletion with text validation.

### Features

- **Text Validation**: Requires user to type "DELETE" exactly to confirm
- **Loading State**: Shows spinner during API call
- **Error Handling**: Displays error messages gracefully
- **Data Cleanup**: Clears AsyncStorage after successful deletion
- **Navigation**: Navigates to AuthScreen after deletion

### Usage

```typescript
import React, { useState } from 'react';
import DeleteAccountModal from '../components/common/DeleteAccountModal';
import { useNavigation } from '@react-navigation/native';

function SettingsScreen() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigation = useNavigation();

  const handleDeleteSuccess = () => {
    // Navigate to auth screen after successful deletion
    navigation.navigate('Auth');
  };

  return (
    <>
      <Button
        mode="outlined"
        buttonColor="error"
        onPress={() => setShowDeleteModal(true)}
      >
        Delete Account
      </Button>

      <DeleteAccountModal
        visible={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visible` | `boolean` | Yes | Controls modal visibility |
| `onDismiss` | `() => void` | Yes | Called when modal is closed (cancel) |
| `onSuccess` | `() => void` | Yes | Called after successful deletion |

### Behavior

1. **Display Modal**: Shows warning message and text input
2. **Validate Input**: Enables "Delete Forever" button only when user types "DELETE"
3. **Call API**: Invokes `deleteAccount()` from `authApi.ts`
4. **Clear Storage**: Removes JWT token and all AsyncStorage data
5. **Navigate**: Calls `onSuccess()` to navigate to auth screen
6. **Show Confirmation**: Displays success alert

### Security Features

- **Irreversible Warning**: Clear message about permanent data loss
- **Text Validation**: Prevents accidental deletion
- **Backend Cascade**: Server-side cascade deletion (workouts, sets, recovery, etc.)
- **Token Cleanup**: Ensures complete logout after deletion

### Integration with Backend

The modal calls the `deleteAccount()` API function which:

1. Extracts user ID from JWT token
2. Sends DELETE request to `/api/users/:id`
3. Backend cascades deletion to all related data
4. Clears local JWT token from AsyncStorage

```typescript
// From authApi.ts
export async function deleteAccount(): Promise<void> {
  const client = await createAuthenticatedClient();
  const token = await getToken();
  const payload = JSON.parse(atob(token.split('.')[1]));
  const userId = payload.userId;

  await client.delete(`/api/users/${userId}`);
  await clearToken();
}
```

### Accessibility

- **WCAG 2.1 AA Compliant**: Focus management and screen reader support
- **Focus Trap**: Modal traps focus for keyboard navigation
- **Error Announcements**: Screen reader announces validation errors
- **Touch Targets**: 44pt minimum touch target size for buttons

### Testing

See `mobile/tests/unit/delete-account-modal.test.tsx` for unit tests covering:
- Text validation logic
- API error handling
- AsyncStorage cleanup
- Navigation after success
