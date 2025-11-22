import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/Common/Button';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      login(response.user, response.token);
      toast.success('Login successful!');
      
      const redirect = router.query.redirect as string;
      router.push(redirect || '/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label-field">Email</label>
        <input
          type="email"
          {...register('email')}
          className="input-field"
          placeholder="your@email.com"
        />
        {errors.email && (
          <p className="error-message">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="label-field">Password</label>
        <input
          type="password"
          {...register('password')}
          className="input-field"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="error-message">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        isLoading={isLoading}
        className="w-full"
        size="lg"
      >
        Login
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-brown-600 hover:text-brown-700 font-medium">
          Register here
        </Link>
      </p>
    </form>
  );
}
