import React, { useState } from 'react';
import MainLayout from '@/layouts/MainLayout';
import Button from '@/components/Common/Button';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Message sent successfully! We\'ll get back to you soon.');
    reset();
    setIsLoading(false);
  };

  return (
    <MainLayout title="Contact Us - Yarnitt">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-gray-600">
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label-field">Name</label>
                  <input
                    type="text"
                    {...register('name')}
                    className="input-field"
                    placeholder="Your name"
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
                  <label className="label-field">Subject</label>
                  <input
                    type="text"
                    {...register('subject')}
                    className="input-field"
                    placeholder="How can we help?"
                  />
                  {errors.subject && (
                    <p className="error-message">{errors.subject.message}</p>
                  )}
                </div>

                <div>
                  <label className="label-field">Message</label>
                  <textarea
                    {...register('message')}
                    className="input-field"
                    rows={6}
                    placeholder="Your message..."
                  />
                  {errors.message && (
                    <p className="error-message">{errors.message.message}</p>
                  )}
                </div>

                <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
                  Send Message
                </Button>
              </form>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-bold text-lg mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Mail size={20} className="text-brown-600 mt-1" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a href="mailto:hello@yarnitt.com" className="text-gray-600 hover:text-brown-600">
                      hello@yarnitt.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone size={20} className="text-brown-600 mt-1" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <a href="tel:+254700000000" className="text-gray-600 hover:text-brown-600">
                      +254 700 000 000
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin size={20} className="text-brown-600 mt-1" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-gray-600">
                      Nairobi, Kenya
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-lg mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="w-10 h-10 bg-brown-100 rounded-full flex items-center justify-center text-brown-600 hover:bg-brown-200"
                >
                  <Facebook size={20} />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-brown-100 rounded-full flex items-center justify-center text-brown-600 hover:bg-brown-200"
                >
                  <Instagram size={20} />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-brown-100 rounded-full flex items-center justify-center text-brown-600 hover:bg-brown-200"
                >
                  <Twitter size={20} />
                </a>
              </div>
            </div>

            <div className="card bg-brown-50">
              <h3 className="font-bold text-lg mb-2">Business Hours</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                <p>Saturday: 10:00 AM - 4:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
