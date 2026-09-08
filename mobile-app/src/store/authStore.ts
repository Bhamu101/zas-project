import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  /** False until the persisted session has been read back from SecureStore. */
  isRestoring: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

/** Raised for anything the user can act on; message is safe to show verbatim. */
export class AuthError extends Error {}

function profileFromSession(session: Session | null): UserProfile | null {
  if (!session?.user) return null;
  const email = session.user.email ?? '';
  const name =
    (session.user.user_metadata?.full_name as string | undefined) || email.split('@')[0] || 'Farmer';
  return { name, email };
}

// Deliberately NOT wrapped in zustand's `persist`: the session is already
// persisted by the Supabase client into SecureStore (see lib/supabase.ts).
// Mirroring it into AsyncStorage here would write the access + refresh tokens
// back out in plaintext, defeating the point.
export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  user: null,
  isRestoring: true,

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      // Supabase deliberately returns the same error for "no such user" and
      // "wrong password" so the API can't be used to enumerate accounts. Keep
      // that property in our copy too.
      throw new AuthError(
        error.message === 'Invalid login credentials'
          ? 'That email or password is not correct.'
          : error.message
      );
    }
    set({ isAuthenticated: true, user: profileFromSession(data.session), isRestoring: false });
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw new AuthError(error.message);

    // With "Confirm email" enabled, Supabase returns a user but no session —
    // the account isn't usable until the emailed link is clicked.
    if (!data.session) return { needsEmailConfirmation: true };

    set({ isAuthenticated: true, user: profileFromSession(data.session), isRestoring: false });
    return { needsEmailConfirmation: false };
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw new AuthError(error.message);
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ isAuthenticated: false, user: null, isRestoring: false });
  },
}));

// Single source of truth for session state: this fires on restore-from-storage,
// sign-in, sign-out, and every silent token refresh, so the store can never
// drift from what the Supabase client actually holds.
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({
    isAuthenticated: !!session,
    user: profileFromSession(session),
    isRestoring: false,
  });
});

// onAuthStateChange fires an initial event on startup, but if there is no stored
// session at all some versions resolve without one — settle `isRestoring` either way.
supabase.auth.getSession().then(({ data }) => {
  useAuthStore.setState({
    isAuthenticated: !!data.session,
    user: profileFromSession(data.session),
    isRestoring: false,
  });
});
