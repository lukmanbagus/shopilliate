import { z } from 'zod'

export const USERNAME_PATTERN = /^[a-z0-9._]{3,32}$/

export const setupInputSchema = z
  .object({
    siteName: z
      .string()
      .trim()
      .min(1, 'Nama situs wajib diisi.')
      .max(60, 'Nama situs maksimal 60 karakter.'),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        USERNAME_PATTERN,
        'Username 3 sampai 32 karakter, hanya huruf kecil, angka, titik, atau garis bawah.',
      ),
    password: z.string().min(10, 'Password minimal 10 karakter.'),
    confirmPassword: z.string(),
    setupToken: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok.',
    path: ['confirmPassword'],
  })

export type SetupInput = z.infer<typeof setupInputSchema>

export const loginInputSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Username wajib diisi.'),
  password: z.string().min(1, 'Password wajib diisi.'),
})

export type LoginInput = z.infer<typeof loginInputSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi.'),
    newPassword: z.string().min(10, 'Password baru minimal 10 karakter.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password baru tidak cocok.',
    path: ['confirmPassword'],
  })

/** Mengambil pesan error pertama yang ramah dari ZodError. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Data yang dikirim tidak valid.'
}
