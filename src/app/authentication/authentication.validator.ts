import { z } from "zod";

import { zodMessages } from "@/core/messages";
import {
	validateDate,
	validateEmail,
	validateNewPassword,
	validatePassword,
	validatePhoneNumber,
	validatePositiveNumber,
	validateString,
	validateUsername,
	validateUsernameOrEmail
} from "@/validators/commonRules";

export const UsernameLoginSchema = z.object({
	username: validateUsernameOrEmail,
	password: validatePassword,
	otp: z
		.boolean({
			invalid_type_error: zodMessages.error.invalid.invalidBoolean("OTP")
		})
		.optional()
});

export const UsernameLoginWithOTPSchema = z.object({
	username: validateUsernameOrEmail,
	password: validatePassword,
	otp: validatePositiveNumber("OTP")
});

export const UserRegisterSchema = z.object({
	name: validateString("Name"),
	username: validateUsername,
	email: validateEmail,
	password: validatePassword
});

export const UserVerificationSchema = z.object({
	username: validateUsernameOrEmail,
	otp: validatePositiveNumber("OTP")
});

export const UserReverificationSchema = z.object({
	username: validateUsernameOrEmail
});

export const UserPasswordResetOTPCheckSchema = z.object({
	email: validateEmail,
	otp: validatePositiveNumber("OTP")
});

export const UserPasswordResetSchema = z.object({
	email: validateEmail,
	otp: validatePositiveNumber("OTP"),
	password: validatePassword
});

export const UserChangePasswordSchema = z.object({
	oldPassword: validatePassword,
	newPassword: validateNewPassword
});

export const UserProfileUpdateSchema = z.object({
	firstName: validateString("First Name").optional(),
	lastName: validateString("Last Name").optional(),
	address: validateString("Address").optional(),
	city: validateString("City").optional(),
	state: validateString("State").optional(),
	country: validateString("Country").optional(),
	zipCode: validateString("Zip Code").optional(),
	dateOfBirth: validateDate("Date of Birth").optional(),
	phoneNumber: validatePhoneNumber("Phone Number").optional()
});

export type UsernameLoginSchemaType = z.infer<typeof UsernameLoginSchema>;
export type UserRegisterSchemaType = z.infer<typeof UserRegisterSchema>;
