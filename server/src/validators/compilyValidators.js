import { z } from "zod";
import { LANGUAGES } from "../constants/languages.js";

const languageKeys = Object.keys(LANGUAGES);

export const saveSnippetSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid snippet ID")
    .optional(),
  title: z.string().trim().min(1, "Title is required").max(100),
  language: z.enum(languageKeys),
  code: z.string().max(100_000).default(""),
  stdin: z.string().max(10_000).optional().default(""),
});

export const snippetIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid snippet ID"),
});
