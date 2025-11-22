import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MainLayout from '@/layouts/MainLayout';
import ShippingForm from '@/components/Checkout/ShippingForm';
import OrderSummary from '@/components/Checkout/OrderSummary';
import Button from '@/components/Common/Button';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { ordersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { CheckoutFormData } from '@/types';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  postalCode: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
});

export default function CheckoutPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      country: 'Kenya',
      paymentMethod: 'mpesa',
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout');
    }
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [isAuthenticated, items.length, router]);

  const onSubmit = async (data: CheckoutFormData) => {
    setIsLoading(true);
    try {
      const orderData = {
        items: items.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        shippingAddress: data,
        paymentMethod: data.paymentMethod,
      };

      const order = await ordersApi.create(orderData);
      clearCart();
      toast.success('Order placed successfully!');
      router.push(`/orders/${order._id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || items.length === 0) {
    return null;
  }

  return (
    <MainLayout title="Checkout - Yarnitt">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Address */}
              <div className="card">
                <ShippingForm register={register} errors={errors} />
              </div>

              {/* Payment Method */}
              <div className="card">
                <h2 className="font-bold text-xl mb-4">Payment Method</h2>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-button cursor-pointer hover:border-brown-600">
                    <input
                      type="radio"
                      value="mpesa"
                      {...register('paymentMethod')}
                      className="text-brown-600 focus:ring-brown-600"
                      defaultChecked
                    />
                    <div>
                      <p className="font-medium">M-Pesa</p>
                      <p className="text-sm text-gray-600">Pay with M-Pesa mobile money</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-button cursor-pointer hover:border-brown-600">
                    <input
                      type="radio"
                      value="card"
                      {...register('paymentMethod')}
                      className="text-brown-600 focus:ring-brown-600"
                    />
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-sm text-gray-600">Pay with card</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-button cursor-pointer hover:border-brown-600">
                    <input
                      type="radio"
                      value="cash"
                      {...register('paymentMethod')}
                      className="text-brown-600 focus:ring-brown-600"
                    />
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-gray-600">Pay when you receive</p>
                    </div>
                  </label>
                </div>
                {errors.paymentMethod && (
                  <p className="error-message mt-2">{errors.paymentMethod.message}</p>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummary />
              
              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full mt-4"
                size="lg"
              >
                Place Order
              </Button>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
