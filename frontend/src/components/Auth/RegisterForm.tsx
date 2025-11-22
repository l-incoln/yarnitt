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

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['buyer', 'seller']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'buyer',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const response = await authApi.register(registerData);
      login(response.user, response.token);
      toast.success('Registration successful!');
      router.push('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label-field">Name</label>
        <input
          type="text"
          {...register('name')}
          className="input-field"
          placeholder="John Doe"
        />
        {errors.name && (
          <p className="error-message">{errors.name.message}</p>
        )}
      </div>

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

      <div>
        <label className="label-field">Confirm Password</label>
        <input
          type="password"
          {...register('confirmPassword')}
          className="input-field"
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="error-message">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div>
        <label className="label-field">I want to:</label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="buyer"
              {...register('role')}
              className="text-brown-600 focus:ring-brown-600"
            />
            <span className="text-sm">Buy handmade goods</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="seller"
              {...register('role')}
              className="text-brown-600 focus:ring-brown-600"
            />
            <span className="text-sm">Sell my handmade goods</span>
          </label>
        </div>
        {errors.role && (
          <p className="error-message">{errors.role.message}</p>
        )}
      </div>

      <Button
        type="submit"
        isLoading={isLoading}
        className="w-full"
        size="lg"
      >
        Register
      </Button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-brown-600 hover:text-brown-700 font-medium">
          Login here
        </Link>
      </p>
    </form>
  );
}
