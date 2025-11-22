import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CheckoutFormData } from '@/types';

interface ShippingFormProps {
  register: UseFormRegister<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
}

export default function ShippingForm({ register, errors }: ShippingFormProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-xl mb-4">Shipping Address</h2>

      <div>
        <label className="label-field">Full Name *</label>
        <input
          type="text"
          {...register('fullName')}
          className="input-field"
          placeholder="John Doe"
        />
        {errors.fullName && (
          <p className="error-message">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label className="label-field">Phone Number *</label>
        <input
          type="tel"
          {...register('phone')}
          className="input-field"
          placeholder="+254 700 000 000"
        />
        {errors.phone && (
          <p className="error-message">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label className="label-field">Address *</label>
        <textarea
          {...register('address')}
          className="input-field"
          rows={3}
          placeholder="Street address, apartment, suite, etc."
        />
        {errors.address && (
          <p className="error-message">{errors.address.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label-field">City *</label>
          <input
            type="text"
            {...register('city')}
            className="input-field"
            placeholder="Nairobi"
          />
          {errors.city && (
            <p className="error-message">{errors.city.message}</p>
          )}
        </div>

        <div>
          <label className="label-field">Postal Code</label>
          <input
            type="text"
            {...register('postalCode')}
            className="input-field"
            placeholder="00100"
          />
          {errors.postalCode && (
            <p className="error-message">{errors.postalCode.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="label-field">Country *</label>
        <input
          type="text"
          {...register('country')}
          className="input-field"
          placeholder="Kenya"
          defaultValue="Kenya"
        />
        {errors.country && (
          <p className="error-message">{errors.country.message}</p>
        )}
      </div>
    </div>
  );
}
