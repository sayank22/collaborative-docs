'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/src/lib/supabase/client';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

// Zod schema replaces manual regex and length checks
const registerSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '' },
  });

  const isLoading = isSubmitting || isGoogleLoading;

  // ✅ Supabase Email/Password Registration
  const onSubmit = async (data: RegisterFormValues) => {
    setAuthError(null);
    setAuthSuccess(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('Email already registered. Try logging in.');
        }
        throw error;
      }

      setAuthSuccess('Registration successful! Redirecting...');
      
      // Usually, we route them straight to the editor/home page after a successful signup
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);

    } catch (error: any) {
      setAuthError(error.message || 'Registration failed. Try again.');
    }
  };

  // ✅ Google Login Web Flow (Consistent with Login Page)
  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setAuthError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, 
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setAuthError(error.message || 'Failed to sign up with Google.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/50">
        <div className="px-6 py-10 sm:px-10">
          
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter your details to get started.
            </p>
          </div>

          <div className="space-y-6">
            {/* Google Signup Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm font-medium">
                <span className="bg-white px-4 text-slate-500">or register with email</span>
              </div>
            </div>

            {/* Standard Email Registration */}
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  placeholder="name@example.com"
                  className={`block w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${
                    errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isLoading}
                    placeholder="Create a strong password"
                    className={`block w-full rounded-lg border px-3 py-2.5 pr-10 text-sm text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${
                      errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Error Message */}
              {authError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-800">{authError}</p>
                </div>
              )}

              {/* Success Message */}
              {authSuccess && (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <p className="text-sm font-medium text-green-800">{authSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </form>
          </div>
        </div>
        
        {/* Footer Area */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-6 text-center sm:px-10">
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 transition-colors hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}