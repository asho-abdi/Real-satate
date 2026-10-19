import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token') || '';
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      token: tokenFromQuery,
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async ({ password: nextPassword, token }) => {
    setSubmitting(true);
    try {
      await resetPassword({ password: nextPassword, token });
    } catch {
      /* toast handled in context / service */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title text-3xl text-[var(--text)] md:text-4xl">Choose a new password</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Set a strong password for your RJK REALTY account.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        {!tokenFromQuery ? (
          <Input
            label="Reset token"
            error={errors.token?.message}
            hint="Paste the token from your reset email"
            {...register('token', { required: 'Reset token is required' })}
          />
        ) : (
          <input type="hidden" {...register('token', { required: true })} />
        )}

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
          })}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Update password
        </Button>
        <Link
          to="/login"
          className="block text-center text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
        >
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
