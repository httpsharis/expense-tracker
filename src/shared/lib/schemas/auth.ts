import { z } from "zod";

/**
 * ZOD SCHEMA FOR SIGNUP 
 * TYPE EXPORTED
 */
export const signUpSchema = z.object({
    firstName: z.string().trim().min(1, "Please enter the first name"),
    lastName: z.string().trim().min(1, "Please enter the last name"),
    email: z.email("Enter a valid email").trim().min(1, "Enter email address"),
    password: z.string().trim().min(6, "Password must be of 6 characters")
})

export type SignUpSchema = z.infer<typeof signUpSchema>

/**
 * ZOD SCHEMA FOR LOGIN
 */ 
export const signInSchema = z.object({
    email: z.email("Enter a valid email").trim().min(1, "Enter email address"),
    password: z.string().trim().min(6, "Password must be of 6 characters")
}) 

export type SignInSchema = z.infer<typeof signInSchema>

/** 
 * zOD SCHEMA FOR VERIFICATION CODE 
 */
export const codeSchema = z.object({
    code: z.string().trim().min(4, "Enter a valid code")
})

export type CodeFormSchema = z.infer<typeof codeSchema>