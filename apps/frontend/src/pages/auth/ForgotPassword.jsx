import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email }) => {
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title text-3xl text-[var(--text)] md:text-4xl">Reset password</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Enter your account email and we&apos;ll send a reset link.
      </p>

      {sent ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-100">
            If an account exists for that email, a reset link is on its way.
          </p>
          <Link
            to="/login"
            className="inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Enter a valid email',
              },
            })}
          />
          <Button type="submit" className="w-full" loading={submitting}>
            Send reset link
          </Button>
          <Link
            to="/login"
            className="block text-center text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
