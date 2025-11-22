import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import LoginForm from '@/components/Auth/LoginForm';

export default function LoginPage() {
  return (
    <MainLayout title="Login - Yarnitt">
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="card">
          <h1 className="text-3xl font-bold text-center mb-8">Welcome Back</h1>
          <LoginForm />
        </div>
      </div>
    </MainLayout>
  );
}
