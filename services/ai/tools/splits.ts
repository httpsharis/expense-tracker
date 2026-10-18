import { z } from "zod";
import {
  computeSplitShares,
  fromMinorUnits,
  subtractMoney,
  toMinorUnits,
} from "@shared/lib/money";
import {
  cleanPersonName,
  dedupeNamesCaseInsensitive,
  isSelfReference,
  normalizePersonName,
  resolvePerson,
} from "../resolvePerson";
import type {
  GeminiFunctionDeclaration,
  KnownPerson,
  SplitExpenseProposal,
  SplitParticipantPreview,
} from "../types";

export const MAX_MONETARY_AMOUNT = 10_000_000;
export const MAX_DESCRIPTION_CHARS = 120;
export const MAX_PERSON_NAME_CHARS = 60;
export const MAX_SPLIT_OTHER_PEOPLE = 20;
export const MAX_PARTICIPANT_COUNT = 50;

export const createSplitExpenseSchema = z
  .object({
    total_amount: z
      .number()
      .finite()
      .positive("Total amount must be greater than zero.")
      .max(MAX_MONETARY_AMOUNT, "Total amount cannot exceed 10,000,000."),
    description: z
      .string()
      .trim()
      .min(1, "Description is required.")
      .max(MAX_DESCRIPTION_CHARS, "Description cannot exceed 120 characters."),
    paid_by: z
      .string()
      .trim()
      .min(1, "Payer is required ('me' or a person's name).")
      .max(MAX_PERSON_NAME_CHARS, "Payer name cannot exceed 60 characters."),
    participant_count: z
      .number()
      .int("Participant count must be an integer.")
      .min(2, "Split requires at least 2 participants.")
      .max(MAX_PARTICIPANT_COUNT, "Participant count cannot exceed 50.")
      .optional(),
    other_people: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Person name cannot be empty.")
          .max(MAX_PERSON_NAME_CHARS, "Person name cannot exceed 60 characters."),
      )
      .min(1)
      .max(MAX_SPLIT_OTHER_PEOPLE)
      .optional(),
    my_share: z
      .number()
      .finite()
      .positive("Your share must be greater than zero.")
      .max(MAX_MONETARY_AMOUNT)
      .optional(),
    group_name: z.string().trim().min(1).max(MAX_PERSON_NAME_CHARS).optional(),
    category: z.string().trim().min(1).max(MAX_PERSON_NAME_CHARS).optional(),
    account: z.string().trim().min(1).max(MAX_PERSON_NAME_CHARS).optional(),
  })
  .superRefine((data, ctx) => {
    const isPaidByMe = isSelfReference(data.paid_by);
    const dedupedOthers = dedupeNamesCaseInsensitive(data.other_people ?? [], {
      excludeSelf: true,
    });

    if (isPaidByMe) {
      if (dedupedOthers.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["other_people"],
          message:
            "When you paid, other_people must list at least one other person.",
        });
      } else if (
        data.participant_count !== undefined &&
        data.participant_count !== dedupedOthers.length + 1
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["participant_count"],
          message:
            "participant_count must match other_people length + 1 (including you).",
        });
      }
    } else {
      const normalizedPayer = normalizePersonName(data.paid_by);
      const nonPayerOthers = dedupedOthers.filter(
        (name) => normalizePersonName(name) !== normalizedPayer,
      );
      const hasValidCount =
        data.participant_count !== undefined && data.participant_count >= 2;
      const hasOtherNames =
        dedupedOthers.length >= 1 || nonPayerOthers.length >= 1;

      if (!hasValidCount && !hasOtherNames) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["participant_count"],
          message:
            "When someone else paid, provide either participant_count (>= 2) or other_people.",
        });
      }
    }

    if (
      data.my_share !== undefined &&
      toMinorUnits(data.my_share) >= toMinorUnits(data.total_amount)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["my_share"],
        message: "my_share must be strictly less than total_amount.",
      });
    }
  });

export type CreateSplitExpenseInput = z.infer<typeof createSplitExpenseSchema>;

export const createLoanSchema = z.object({
  person: z
    .string()
    .trim()
    .min(1, "Person name is required.")
    .max(MAX_PERSON_NAME_CHARS, "Person name cannot exceed 60 characters."),
  amount: z
    .number()
    .finite()
    .positive("Loan amount must be greater than zero.")
    .max(MAX_MONETARY_AMOUNT, "Loan amount cannot exceed 10,000,000."),
  direction: z.enum(["lent", "borrowed"]),
  note: z
    .string()
    .trim()
    .max(MAX_DESCRIPTION_CHARS, "Note cannot exceed 120 characters.")
    .optional(),
  account: z.string().trim().min(1).max(MAX_PERSON_NAME_CHARS).optional(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;

export type SplitProposalBuildResult =
  | {
      status: "proposal";
      proposal: SplitExpenseProposal;
      summary: string;
    }
  | {
      status: "ambiguous_person";
      inputName: string;
      candidates: string[];
      message: string;
    };

/**
 * Pure builder that validates split arguments, resolves people against knownPeople,
 * and computes integer minor-unit shares using the shared computeSplitShares helper.
 */
export function buildSplitExpenseProposal(
  rawArgs: unknown,
  knownPeople: readonly KnownPerson[],
): SplitProposalBuildResult {
  const args = createSplitExpenseSchema.parse(rawArgs);
  const isPaidByMe = isSelfReference(args.paid_by);
  const totalAmountMinor = toMinorUnits(args.total_amount);

  if (!isPaidByMe) {
    const payerResolution = resolvePerson(args.paid_by, knownPeople);
    if (payerResolution.status === "ambiguous") {
      const candidates = payerResolution.candidates.map((person) => person.name);
      return {
        status: "ambiguous_person",
        inputName: payerResolution.inputName,
        candidates,
        message: `Multiple people match "${payerResolution.inputName}": ${candidates.join(", ")}. Which one paid?`,
      };
    }

    const payerName =
      payerResolution.status === "matched"
        ? payerResolution.person.name
        : cleanPersonName(payerResolution.inputName);
    const isNewPayer = payerResolution.status === "unknown";

    const dedupedOthers = dedupeNamesCaseInsensitive(args.other_people ?? [], {
      excludeSelf: true,
    }).filter(
      (name) => normalizePersonName(name) !== normalizePersonName(payerName),
    );

    const participantCount =
      args.participant_count ?? Math.max(2, 2 + dedupedOthers.length);

    const syntheticParticipants = [
      "You",
      payerName,
      ...Array.from(
        { length: Math.max(0, participantCount - 2) },
        (_, index) => `__guest_${index + 1}`,
      ),
    ];

    const shares =
      args.my_share !== undefined
        ? computeSplitShares({
            totalAmount: args.total_amount,
            participants: ["You", payerName],
            payerName,
            splitMode: "exact",
            customAmounts: {
              You: args.my_share,
              [payerName]: subtractMoney(args.total_amount, args.my_share),
            },
          })
        : computeSplitShares({
            totalAmount: args.total_amount,
            participants: syntheticParticipants,
            payerName,
            splitMode: "equal",
          });

    const yourShare = shares.find((share) => share.name === "You");
    if (!yourShare) {
      throw new Error("Failed to calculate your share of the split.");
    }

    const proposal: SplitExpenseProposal = {
      kind: "create_split_expense",
      mode: "friend_paid",
      description: args.description,
      totalAmount: args.total_amount,
      totalAmountMinor,
      paidBy: payerName,
      participantCount,
      myShareAmount: yourShare.amount,
      myShareAmountMinor: yourShare.amountMinor,
      owedToPayerAmount: yourShare.amount,
      owedToPayerAmountMinor: yourShare.amountMinor,
      participants: [
        {
          name: payerName,
          shareAmount: yourShare.amount,
          shareAmountMinor: yourShare.amountMinor,
          direction: "i_owe",
          isNewPerson: isNewPayer,
        },
      ],
      newPeople: isNewPayer ? [payerName] : [],
      groupName: args.group_name,
      categoryName: args.category,
      accountName: args.account,
    };

    return {
      status: "proposal",
      proposal,
      summary: `Split "${args.description}" (${args.total_amount} across ${participantCount} people, ${payerName} paid): you owe ${payerName} ${yourShare.amount}. Please confirm to record.`,
    };
  }

  const rawOtherNames = dedupeNamesCaseInsensitive(args.other_people ?? [], {
    excludeSelf: true,
  });

  const resolvedOthers: { name: string; isNewPerson: boolean }[] = [];
  const seenResolvedNormalized = new Set<string>();

  for (const rawName of rawOtherNames) {
    const resolution = resolvePerson(rawName, knownPeople);
    if (resolution.status === "ambiguous") {
      const candidates = resolution.candidates.map((person) => person.name);
      return {
        status: "ambiguous_person",
        inputName: resolution.inputName,
        candidates,
        message: `Multiple people match "${resolution.inputName}": ${candidates.join(", ")}. Which one did you mean?`,
      };
    }

    const resolvedName =
      resolution.status === "matched"
        ? resolution.person.name
        : cleanPersonName(resolution.inputName);
    const normalized = normalizePersonName(resolvedName);
    if (seenResolvedNormalized.has(normalized)) continue;
    seenResolvedNormalized.add(normalized);

    resolvedOthers.push({
      name: resolvedName,
      isNewPerson: resolution.status === "unknown",
    });
  }

  const allParticipants = ["You", ...resolvedOthers.map((person) => person.name)];
  const participantCount = allParticipants.length;

  let myShareAmountMinor: number;
  let participantPreviews: SplitParticipantPreview[];

  if (args.my_share !== undefined) {
    myShareAmountMinor = toMinorUnits(args.my_share);
    const remainingAmount = subtractMoney(args.total_amount, args.my_share);
    const otherShares = computeSplitShares({
      totalAmount: remainingAmount,
      participants: resolvedOthers.map((person) => person.name),
      payerName: resolvedOthers[0].name,
      splitMode: "equal",
    });

    participantPreviews = resolvedOthers.map((person) => {
      const share = otherShares.find((item) => item.name === person.name);
      const shareMinor = share ? share.amountMinor : 0;
      return {
        name: person.name,
        shareAmount: fromMinorUnits(shareMinor),
        shareAmountMinor: shareMinor,
        direction: "owed_to_me",
        isNewPerson: person.isNewPerson,
      };
    });
  } else {
    const shares = computeSplitShares({
      totalAmount: args.total_amount,
      participants: allParticipants,
      payerName: "You",
      splitMode: "equal",
    });

    const yourShare = shares.find((share) => share.name === "You");
    if (!yourShare) {
      throw new Error("Failed to calculate your share of the split.");
    }
    myShareAmountMinor = yourShare.amountMinor;

    participantPreviews = resolvedOthers.map((person) => {
      const share = shares.find((item) => item.name === person.name);
      const shareMinor = share ? share.amountMinor : 0;
      return {
        name: person.name,
        shareAmount: fromMinorUnits(shareMinor),
        shareAmountMinor: shareMinor,
        direction: "owed_to_me",
        isNewPerson: person.isNewPerson,
      };
    });
  }

  const owedToPayerAmountMinor = participantPreviews.reduce(
    (sumMinor, participant) => sumMinor + participant.shareAmountMinor,
    0,
  );

  const proposal: SplitExpenseProposal = {
    kind: "create_split_expense",
    mode: "me_paid",
    description: args.description,
    totalAmount: args.total_amount,
    totalAmountMinor,
    paidBy: "You",
    participantCount,
    myShareAmount: fromMinorUnits(myShareAmountMinor),
    myShareAmountMinor,
    owedToPayerAmount: fromMinorUnits(owedToPayerAmountMinor),
    owedToPayerAmountMinor,
    participants: participantPreviews,
    newPeople: resolvedOthers
      .filter((person) => person.isNewPerson)
      .map((person) => person.name),
    groupName: args.group_name,
    categoryName: args.category,
    accountName: args.account,
  };

  const perPersonSummary = participantPreviews
    .map((participant) => `${participant.name} owes you ${participant.shareAmount}`)
    .join(", ");

  return {
    status: "proposal",
    proposal,
    summary: `Split "${args.description}" (${args.total_amount} across ${participantCount} people, you paid): ${perPersonSummary} (your share: ${proposal.myShareAmount}). Please confirm to record.`,
  };
}

export const CREATE_SPLIT_EXPENSE_DECLARATION: GeminiFunctionDeclaration = {
  name: "create_split_expense",
  description:
    "Propose a shared or split expense. Handles both 'someone else paid' (you owe them your share) and 'I paid' (others owe you their shares). Always creates an in-chat confirmation card before writing.",
  parameters: {
    type: "OBJECT",
    properties: {
      total_amount: {
        type: "NUMBER",
        description: "The total bill amount in major currency units (must be > 0).",
      },
      description: {
        type: "STRING",
        description: "Short description of the shared bill (e.g. 'Dinner', 'Lunch').",
      },
      paid_by: {
        type: "STRING",
        description:
          "Use 'me' if the user paid the bill, or the payer's name (e.g. 'Ali') if someone else paid.",
      },
      participant_count: {
        type: "NUMBER",
        description:
          "Total number of people sharing the bill INCLUDING the user (e.g. 6 for '6 people'). Required when someone else paid and individual names of all participants are not given.",
      },
      other_people: {
        type: "ARRAY",
        description:
          "Names of the OTHER people in the split (excluding the user). Required when paid_by is 'me'.",
        items: { type: "STRING" },
      },
      my_share: {
        type: "NUMBER",
        description:
          "Optional explicit share for the user if the split is not equal.",
      },
      group_name: {
        type: "STRING",
        description: "Optional group name if this split belongs to a group.",
      },
      category: {
        type: "STRING",
        description: "Optional expense category name (e.g. 'Food & Dining').",
      },
      account: {
        type: "STRING",
        description: "Optional account name used when the user paid.",
      },
    },
    required: ["total_amount", "description", "paid_by"],
  },
};

export const CREATE_LOAN_DECLARATION: GeminiFunctionDeclaration = {
  name: "create_loan",
  description:
    "Propose a 1-to-1 direct loan ('I lent Ali 5000' or 'I borrowed 2000 from Sara'). Always asks for confirmation before recording.",
  parameters: {
    type: "OBJECT",
    properties: {
      person: {
        type: "STRING",
        description: "Name of the person you lent money to or borrowed money from.",
      },
      amount: {
        type: "NUMBER",
        description: "Loan amount in major currency units (must be > 0).",
      },
      direction: {
        type: "STRING",
        enum: ["lent", "borrowed"],
        description: "'lent' if the user gave money (they owe user); 'borrowed' if the user received money (user owes them).",
      },
      note: {
        type: "STRING",
        description: "Optional note or reason for the loan.",
      },
      account: {
        type: "STRING",
        description: "Optional account name used for the loan.",
      },
    },
    required: ["person", "amount", "direction"],
  },
};

