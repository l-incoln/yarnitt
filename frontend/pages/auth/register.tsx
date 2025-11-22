import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import RegisterForm from '@/components/Auth/RegisterForm';

export default function RegisterPage() {
  return (
    <MainLayout title="Register - Yarnitt">
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="card">
          <h1 className="text-3xl font-bold text-center mb-8">Create Account</h1>
          <RegisterForm />
        </div>
      </div>
    </MainLayout>
  );
}
