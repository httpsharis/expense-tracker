import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSplitsData } from "@features/splits";
import type { GroupWithMembers } from "@services/splits";
import type { TransactionType } from "@services/transactions";
import { formatCurrency, getCurrencySymbol } from "@shared/lib/currency";
import { getErrorMessage } from "@shared/lib/errors";
import { evaluateExpression } from "@shared/lib/mathEvaluator";
import { addMoney, computeSplitShares } from "@shared/lib/money";
import { DEFAULT_CATEGORIES } from "@services/categories";
import {
  useAccountsWithBalancesQuery,
  useCategoriesQuery,
  useCreateTransactionMutation,
  useTransactionsQuery,
  useUpdateTransactionMutation,
} from "@store/hooks";
import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";
import {
  buildTransactionPayload,
  canEditTransaction,
} from "../lib/buildTransactionPayload";

const ONE_DAY_MS = 86_400_000;
const MAX_DIGITS_PER_SEGMENT = 9;
const MAX_DECIMALS = 2;

export interface UseTransactionFormParams {
  editId?: string;
  initialType?: TransactionType;
  initialAmount?: string;
  initialDescription?: string;
  initialCategory?: string;
}

export function useTransactionForm({
  editId,
  initialType,
  initialAmount,
  initialDescription,
  initialCategory,
}: UseTransactionFormParams) {
  const router = useRouter();
  const storeCurrency = useUserStore((state) => state.currency);
  const { alert } = usePrompt();

  const { data: accounts = [] } = useAccountsWithBalancesQuery();
  const { data: rawCategories = [] } = useCategoriesQuery();
  const { data: liveTransactions = [] } = useTransactionsQuery();

  const categories = useMemo(() => {
    if (rawCategories.length > 0) return rawCategories;
    return DEFAULT_CATEGORIES.map((cat, idx) => ({
      id: `default-${idx + 1}`,
      name: cat.name,
      icon: cat.icon,
      is_default: true,
      user_id: "",
      created_at: "",
      updated_at: "",
    }));
  }, [rawCategories]);
  const createTxMutation = useCreateTransactionMutation();
  const updateTxMutation = useUpdateTransactionMutation();

  const isEditing = Boolean(editId);
  const editingTx = useMemo(
    () => (editId ? liveTransactions.find((tx) => tx.id === editId) ?? null : null),
    [editId, liveTransactions],
  );
  const editEligibility = useMemo(
    () =>
      isEditing
        ? canEditTransaction(editingTx)
        : { canEdit: true, canEditAmountAndAccount: true, lockReason: null },
    [isEditing, editingTx],
  );

  const [txType, setTxType] = useState<TransactionType>(initialType || "expense");
  const [amountInput, setAmountInput] = useState(initialAmount ? String(initialAmount) : "0");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState(initialDescription || "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateSelection, setDateSelection] = useState<"today" | "yesterday" | "custom">("today");
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString());

  // Auto-select category if initialCategory was passed from receipt scanner
  useEffect(() => {
    if (initialCategory && categories.length > 0 && !selectedCategoryId) {
      const match = categories.find((c) =>
        c.name.toLowerCase().includes(initialCategory.toLowerCase()) ||
        initialCategory.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) {
        setSelectedCategoryId(match.id);
      }
    }
  }, [initialCategory, categories, selectedCategoryId]);

  const {
    groups = [],
    peopleSummaries = [],
    createSplits,
    createDirectPeopleSplit,
  } = useSplitsData();
  const [selectedSplitGroup, setSelectedSplitGroup] = useState<GroupWithMembers | null>(null);
  const [selectedSplitPerson, setSelectedSplitPerson] = useState<string | null>(null);
  const [splitPaidBy, setSplitPaidBy] = useState<string>("You");

  useEffect(() => {
    if (!editingTx) return;
    setTxType((editingTx.type as TransactionType) || "expense");
    setAmountInput(String(Math.abs(Number(editingTx.amount))));
    setSelectedAccountId(editingTx.account_id);
    setSelectedTransferAccountId(editingTx.transfer_account_id || null);
    setSelectedCategoryId(editingTx.category_id || null);
    setSelectedTags(editingTx.tags ?? []);
    setDescription(editingTx.description || "");

    const txDateStr = new Date(editingTx.date).toDateString();
    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - ONE_DAY_MS).toDateString();
    if (txDateStr === todayStr) {
      setDateSelection("today");
    } else if (txDateStr === yesterdayStr) {
      setDateSelection("yesterday");
    } else {
      setDateSelection("custom");
      setCustomDate(editingTx.date);
    }
  }, [editingTx]);

  const sourceAccount =
    accounts.find((account) => account.id === selectedAccountId) ??
    accounts.find((account) => account.is_default) ??
    accounts[0];
  const targetAccount = accounts.find((account) => account.id === selectedTransferAccountId);

  // Auto-select a destination account for transfer if not set or if equal to source
  useEffect(() => {
    if (txType === "transfer" && accounts.length > 1) {
      const effectiveSourceId = sourceAccount?.id;
      if (!selectedTransferAccountId || selectedTransferAccountId === effectiveSourceId) {
        const differentAccount = accounts.find((a) => a.id !== effectiveSourceId);
        if (differentAccount) {
          setSelectedTransferAccountId(differentAccount.id);
        }
      }
    }
  }, [txType, accounts, sourceAccount?.id, selectedTransferAccountId]);

  const swapTransferAccounts = () => {
    if (!sourceAccount) return;
    const currentSourceId = sourceAccount.id;
    const currentTargetId = targetAccount?.id ?? accounts.find((a) => a.id !== currentSourceId)?.id;
    if (!currentTargetId) return;

    setSelectedAccountId(currentTargetId);
    setSelectedTransferAccountId(currentSourceId);
  };

  const [customTags, setCustomTags] = useState<string[]>([]);
  const addCustomTag = (tag: string) => {
    const clean = tag.trim().replace(/^#+/, "").trim();
    if (!clean) return;
    setCustomTags((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setSelectedTags((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
  };

  const activeCategory =
    categories.find((category) => category.id === selectedCategoryId) ??
    categories.find(
      (category) =>
        selectedCategoryId &&
        category.name.toLowerCase() === selectedCategoryId.toLowerCase(),
    ) ??
    (categories.length > 0 ? categories[0] : null);

  const activeCurrency = sourceAccount?.currency || storeCurrency || "PKR";
  const currencySymbol = getCurrencySymbol(activeCurrency);
  const hasMathOperator = /[+\-×÷]/.test(amountInput);
  const computedAmount = useMemo(() => evaluateExpression(amountInput), [amountInput]);

  const splitPreviewText = useMemo(() => {
    if (computedAmount <= 0 || (!selectedSplitPerson && !selectedSplitGroup)) return null;
    if (selectedSplitPerson) {
      const shares = computeSplitShares({
        totalAmount: computedAmount,
        participants: ["You", selectedSplitPerson],
        payerName: splitPaidBy,
        splitMode: "equal",
      });
      const friendShare =
        shares.find((share) => share.name.toLowerCase() === selectedSplitPerson.toLowerCase())
          ?.amount ?? 0;
      const yourShare =
        shares.find((share) => share.name.toLowerCase() === "you")?.amount ?? 0;
      return splitPaidBy === "You"
        ? `You paid. ${selectedSplitPerson} owes you ${formatCurrency(friendShare, activeCurrency)}`
        : `${selectedSplitPerson} paid. You owe ${selectedSplitPerson} ${formatCurrency(yourShare, activeCurrency)}`;
    }
    if (selectedSplitGroup) {
      const groupParticipants = [
        "You",
        ...(selectedSplitGroup.members || [])
          .map((member) => member.name)
          .filter((name) => name.toLowerCase() !== "you"),
      ];
      const shares = computeSplitShares({
        totalAmount: computedAmount,
        participants: groupParticipants,
        payerName: splitPaidBy,
        splitMode: "equal",
      });
      const perPersonShare =
        shares.find((share) => share.name.toLowerCase() !== splitPaidBy.toLowerCase())?.amount ??
        shares[0]?.amount ??
        0;
      return `Splits ${formatCurrency(computedAmount, activeCurrency)} with ${selectedSplitGroup.name} (${formatCurrency(perPersonShare, activeCurrency)}/ea)`;
    }
    return null;
  }, [computedAmount, selectedSplitPerson, selectedSplitGroup, splitPaidBy, activeCurrency]);

  const handleKey = (key: string) => {
    if (isEditing && !editEligibility.canEditAmountAndAccount) return;
    if (["+", "-", "×", "÷"].includes(key)) {
      if (amountInput === "0") return;
      setAmountInput((prev) =>
        /[+\-×÷]\s*$/.test(prev) ? prev.replace(/[+\-×÷]\s*$/, `${key} `) : `${prev} ${key} `,
      );
      return;
    }
    if (key === "CLEAR") {
      setAmountInput("0");
      return;
    }
    if (key === "=") {
      if (hasMathOperator) setAmountInput(computedAmount.toString());
      return;
    }
    if (key === ".") {
      const segments = amountInput.split(/\s+[+\-×÷]\s+/);
      const currentSegment = segments[segments.length - 1] || "";
      if (!currentSegment.includes(".")) {
        setAmountInput((prev) => (currentSegment === "" ? `${prev}0.` : `${prev}.`));
      }
      return;
    }
    if (key === "BACK") {
      if (amountInput.length <= 1) {
        setAmountInput("0");
        return;
      }
      setAmountInput((prev) =>
        /\s+[+\-×÷]\s+$/.test(prev) ? prev.replace(/\s+[+\-×÷]\s+$/, "") : prev.slice(0, -1),
      );
      return;
    }
    if (amountInput === "0") {
      setAmountInput(key);
      return;
    }
    const segments = amountInput.split(/\s+[+\-×÷]\s+/);
    const currentSegment = segments[segments.length - 1] || "";
    const decimals = currentSegment.split(".")[1];
    if (decimals && decimals.length >= MAX_DECIMALS) return;
    if (currentSegment.replace(".", "").length >= MAX_DIGITS_PER_SEGMENT) return;
    setAmountInput((prev) => prev + key);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((existing) => existing !== tag) : [...prev, tag],
    );
  };

  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (isEditing && !editEligibility.canEdit) {
      await alert({
        title: "Cannot Edit Transaction",
        message: editEligibility.lockReason || "This transaction cannot be edited.",
        variant: "warning",
      });
      return;
    }

    let built;
    try {
      built = buildTransactionPayload({
        mode: isEditing ? "edit" : "create",
        txType,
        evaluatedAmount: hasMathOperator ? computedAmount : evaluateExpression(amountInput),
        sourceAccountId: sourceAccount?.id,
        transferAccountId: selectedTransferAccountId,
        categoryId: activeCategory?.id,
        categoryName: activeCategory?.name,
        description,
        tags: selectedTags,
        dateSelection,
        customDate,
        splitPerson: selectedSplitPerson,
        splitGroupMembers: selectedSplitGroup?.members,
        splitPaidBy,
        canEditAmountAndAccount: editEligibility.canEditAmountAndAccount,
      });
    } catch (validationErr: unknown) {
      await alert({
        title: "Check Transaction Details",
        message: getErrorMessage(validationErr, "Please complete all required fields."),
        variant: "warning",
      });
      return;
    }

    submittingRef.current = true;
    try {
      if (isEditing && editingTx) {
        await updateTxMutation.mutateAsync({
          id: editingTx.id,
          data: built.updatePayload,
        });
      } else {
        const createdTx = await createTxMutation.mutateAsync(built.createPayload);
        if (txType === "expense" && createdTx?.id) {
          const splitLabel = built.cleanDescription || activeCategory?.name || "Shared Expense";
          if (selectedSplitPerson) {
            try {
              await createDirectPeopleSplit({
                transactionId: createdTx.id,
                totalAmount: built.totalAmountMajor,
                peopleNames: [selectedSplitPerson],
                description: splitLabel,
                payerName: splitPaidBy,
              });
            } catch (splitErr: unknown) {
              await alert({
                title: "Split Warning",
                message: getErrorMessage(
                  splitErr,
                  "Expense logged, but split could not be saved.",
                ),
                variant: "warning",
              });
            }
          } else if (selectedSplitGroup) {
            try {
              await createSplits({
                transactionId: createdTx.id,
                groupId: selectedSplitGroup.id,
                totalAmount: built.totalAmountMajor,
                members: selectedSplitGroup.members,
                description: splitLabel,
                payerName: splitPaidBy,
              });
            } catch (splitErr: unknown) {
              await alert({
                title: "Split Warning",
                message: getErrorMessage(
                  splitErr,
                  "Expense logged, but group split could not be saved.",
                ),
                variant: "warning",
              });
            }
          }
        }
      }

      setAmountInput("0");
      setDescription("");
      setSelectedTags([]);
      setSelectedSplitGroup(null);
      setSelectedSplitPerson(null);
      setSplitPaidBy("You");

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(root)/(tabs)");
      }
    } catch (err: unknown) {
      await alert({
        title: "Transaction Failed",
        message: getErrorMessage(err, "Could not save transaction."),
        variant: "warning",
      });
    } finally {
      submittingRef.current = false;
    }
  };

  const applyScannedReceipt = (scanned: {
    merchant: string;
    amount: number;
    date?: string;
    category?: string;
    note?: string;
  }) => {
    setTxType("expense");
    if (scanned.amount > 0) {
      setAmountInput(String(scanned.amount));
    }
    if (scanned.merchant) {
      setDescription(scanned.merchant);
    }
    if (scanned.category) {
      const match = categories.find((c) =>
        c.name.toLowerCase().includes(scanned.category!.toLowerCase()) ||
        scanned.category!.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) {
        setSelectedCategoryId(match.id);
      }
    }
    if (scanned.date) {
      try {
        const parsedDate = new Date(scanned.date);
        if (!isNaN(parsedDate.getTime())) {
          setDateSelection("custom");
          setCustomDate(parsedDate.toISOString());
        }
      } catch {
        // preserve current date
      }
    }
  };

  return {
    isEditing,
    editEligibility,
    isPending: createTxMutation.isPending || updateTxMutation.isPending,
    txType,
    setTxType,
    amountInput,
    hasMathOperator,
    computedAmount,
    accounts,
    categories,
    sourceAccount,
    targetAccount,
    activeCategory,
    activeCurrency,
    currencySymbol,
    selectedAccountId,
    setSelectedAccountId,
    selectedTransferAccountId,
    setSelectedTransferAccountId,
    selectedCategoryId,
    setSelectedCategoryId,
    description,
    setDescription,
    selectedTags,
    toggleTag,
    dateSelection,
    setDateSelection,
    customDate,
    setCustomDate,
    groups,
    peopleSummaries,
    selectedSplitGroup,
    setSelectedSplitGroup,
    selectedSplitPerson,
    setSelectedSplitPerson,
    splitPaidBy,
    setSplitPaidBy,
    splitPreviewText,
    swapTransferAccounts,
    customTags,
    addCustomTag,
    handleKey,
    applyScannedReceipt,
    handleSubmit,
  };
}

