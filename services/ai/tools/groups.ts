import { z } from "zod";
import { dedupeNamesCaseInsensitive } from "../resolvePerson";
import type { GeminiFunctionDeclaration } from "../types";
import {
  MAX_DESCRIPTION_CHARS,
  MAX_PERSON_NAME_CHARS,
  MAX_SPLIT_OTHER_PEOPLE,
} from "./splits";

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Group name is required.")
    .max(MAX_PERSON_NAME_CHARS, "Group name cannot exceed 60 characters."),
  members: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Member name cannot be empty.")
        .max(MAX_PERSON_NAME_CHARS, "Member name cannot exceed 60 characters."),
    )
    .min(1, "At least one member is required.")
    .max(MAX_SPLIT_OTHER_PEOPLE, "Group cannot exceed 20 members.")
    .transform((names) =>
      dedupeNamesCaseInsensitive(names, { excludeSelf: true }),
    )
    .refine((names) => names.length >= 1, {
      message: "Group must include at least one member other than yourself.",
    }),
  description: z
    .string()
    .trim()
    .max(MAX_DESCRIPTION_CHARS, "Description cannot exceed 120 characters.")
    .optional(),
  type: z.enum(["trip", "home", "couple", "other"]).optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const CREATE_GROUP_DECLARATION: GeminiFunctionDeclaration = {
  name: "create_group",
  description:
    "Create a shared expense group (e.g. 'Murree Trip') with a list of members (1 to 20 people).",
  parameters: {
    type: "OBJECT",
    properties: {
      name: {
        type: "STRING",
        description: "Name of the group (e.g. 'Murree Trip', 'Flatmates').",
      },
      members: {
        type: "ARRAY",
        description:
          "List of member names to add to the group (excluding the user, who is added automatically).",
        items: { type: "STRING" },
      },
      description: {
        type: "STRING",
        description: "Optional group description.",
      },
      type: {
        type: "STRING",
        enum: ["trip", "home", "couple", "other"],
        description: "Optional group category type.",
      },
    },
    required: ["name", "members"],
  },
};

