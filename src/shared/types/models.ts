import type { InputMethod, TransactionType } from "@services/transactions";

/** Fully resolved transaction ready for UI rendering — no raw DB joins needed. */
export interface DetailedTransactionItem {
  id: string;
  name: string;
  note?: string | null;
  time: string;
  dateStr: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  categoryIcon: string;
  accountName: string;
  transferAccountName?: string | null;
  currency: string;
  inputMethod: InputMethod;
  avatarBg: string;
  status?: string;
  isReversal?: boolean;
  isGroup?: boolean;
  tags?: string[];
  fullDateStr?: string;
  rawDate?: string;
}

export interface TransactionRowItemProps {
  item: DetailedTransactionItem;
  onPress: (item: DetailedTransactionItem) => void;
  onDelete?: (item: DetailedTransactionItem) => void;
}

export interface TransactionDetailModalProps {
  transaction: DetailedTransactionItem | null;
  onClose: () => void;
  onDelete?: (transaction: DetailedTransactionItem) => void;
  onReverse?: (transaction: DetailedTransactionItem) => void;
  onEdit?: (transaction: DetailedTransactionItem) => void;
}

