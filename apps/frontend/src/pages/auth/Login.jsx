import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { APP_NAME } from '../../utils/constants.js';

export default function Login() {
  const { login, loading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: 'admin@estateops.com',
      password: 'Admin@12345',
    },
  });

  const onSubmit = async (values) => {
    try {
      await login(values);
    } catch {
      /* toast handled in context */
    }
  };

  return (
    <div>
      <h1 className="page-title text-3xl text-[var(--text)] md:text-4xl">Welcome back</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Sign in to {APP_NAME} to manage your portfolio.
      </p>

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
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 6, message: 'At least 6 characters' },
          })}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--text-muted)]">
        Demo: <span className="font-medium text-[var(--text)]">admin@estateops.com</span> /{' '}
        <span className="font-medium text-[var(--text)]">Admin@12345</span>
      </p>
    </div>
  );
}
