import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { z } from "zod";

import { SortingHelper } from "@/core/sortingHelper";
import { ROLE_LIST } from "@/databases/drizzle/lists";
import { BaseQuerySchema } from "@/validators/baseQuery.schema";
import {
	validateBoolean,
	validateEmail,
	validateEnum,
	validatePassword,
	validatePositiveNumber,
	validateString,
	validateUsername
} from "@/validators/commonRules";

export const UserQuerySchema = <T extends PgTableWithColumns<any>>(
	sortingHelper: SortingHelper<T>
) => {
	const baseSchema = BaseQuerySchema(sortingHelper);

	return z.preprocess(
		(data: any) => ({
			...baseSchema.parse(data),
			roleQuery: data.roleQuery ? String(data.roleQuery) : undefined
		}),
		z.object({
			...baseSchema.innerType().shape,
			roleQuery: validateEnum("Role query", ROLE_LIST.enumValues).optional()
		})
	);
};

export const UserDeleteQuerySchema = z.object({
	ids: z
		.string()
		.optional()
		.transform(value => (value ? value.split(",") : []))
		.refine(values => values.length === 0 || values.every(val => !isNaN(Number(val))), {
			message: "Invalid User IDs"
		})
		.transform(values => values.map(Number))
});

export const UserCreateSchema = z.object({
	username: validateUsername,
	email: validateEmail,
	name: validateString("Name"),
	emailVerified: validateBoolean("Email Verified"),
	role: validateEnum("Role", ROLE_LIST.enumValues)
});

export const UserUpdatePasswordSchema = z.object({
	userId: validatePositiveNumber("User ID"),
	password: validatePassword
});

export type UserQuerySchemaType = z.infer<ReturnType<typeof UserQuerySchema>>;
