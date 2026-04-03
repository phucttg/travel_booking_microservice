import { z } from 'zod';
import { PassengerType, Role } from '@/types/enums';

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;
const passportRegex = /^[A-Z0-9]{6,20}$/i;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must include at least 1 letter and 1 number')
});

const userBaseSchema = z.object({
  name: z.string().min(2, 'Tối thiểu 2 ký tự').max(100, 'Tối đa 100 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  role: z.nativeEnum(Role),
  passportNumber: z
    .string()
    .min(6, 'Passport tối thiểu 6 ký tự')
    .max(20, 'Passport tối đa 20 ký tự')
    .regex(passportRegex, 'Passport chỉ được chứa chữ và số'),
  age: z.number().int('Tuổi phải là số nguyên').min(0, 'Tuổi không hợp lệ'),
  passengerType: z.nativeEnum(PassengerType)
});

export const registerFormSchema = userBaseSchema.omit({ role: true }).extend({
  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .regex(passwordRegex, 'Mật khẩu phải chứa ít nhất 1 chữ và 1 số')
});

export const createUserFormSchema = userBaseSchema.extend({
  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .regex(passwordRegex, 'Mật khẩu phải chứa ít nhất 1 chữ và 1 số')
});

export const updateUserFormSchema = userBaseSchema.extend({
  password: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || value.length >= 8, 'Mật khẩu tối thiểu 8 ký tự')
    .refine((value) => !value || passwordRegex.test(value), 'Mật khẩu phải chứa ít nhất 1 chữ và 1 số')
});

export const airportFormSchema = z.object({
  code: z
    .string()
    .min(2, 'Mã sân bay tối thiểu 2 ký tự')
    .transform((value) => value.toUpperCase()),
  name: z.string().min(2, 'Tên sân bay tối thiểu 2 ký tự'),
  address: z.string().min(1, 'Địa chỉ là bắt buộc')
});

export const aircraftFormSchema = z.object({
  name: z.string().min(1, 'Tên máy bay là bắt buộc'),
  model: z.string().min(1, 'Model là bắt buộc'),
  manufacturingYear: z
    .number({ invalid_type_error: 'Năm sản xuất phải là số' })
    .min(1900)
    .max(new Date().getFullYear())
});
