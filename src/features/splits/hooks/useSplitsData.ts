import { useMemo, useState } from "react";

import { getPeopleDebtSummaries } from "@services/splits";
import {
  useCreateDirectPeopleSplitMutation,
  useCreateGroupMutation,
  useCreateLoanMutation,
  useCreateTransactionSplitsMutation,
  useDeletePersonMutation,
  useGroupsQuery,
  useRenamePersonMutation,
  useSettleSplitMutation,
  useSplitsSummaryQuery,
} from "@store/hooks";

export function useSplitsData() {
  const {
    data: groups = [],
    isLoading: groupsLoading,
    isError: groupsError,
    error: groupsErrorObj,
    refetch: refetchGroups,
  } = useGroupsQuery();

  const {
    data: splitsData,
    isLoading: splitsLoading,
    isError: splitsError,
    error: splitsErrorObj,
    refetch: refetchSplits,
  } = useSplitsSummaryQuery();

  const createGroupMutation = useCreateGroupMutation();
  const createSplitsMutation = useCreateTransactionSplitsMutation();
  const createDirectPeopleSplitMutation = useCreateDirectPeopleSplitMutation();
  const createLoanMutation = useCreateLoanMutation();
  const settleSplitMutation = useSettleSplitMutation();
  const renamePersonMutation = useRenamePersonMutation();
  const deletePersonMutation = useDeletePersonMutation();

  const [refreshing, setRefreshing] = useState(false);
  const refetchAll = async () => {
    setRefreshing(true);
    await Promise.all([refetchGroups(), refetchSplits()]);
    setRefreshing(false);
  };

  const summary = splitsData?.summary || {
    totalOwedToMe: 0,
    totalIOwe: 0,
    netBalance: 0,
    openCount: 0,
  };

  const splits = splitsData?.splits || [];
  const settlements = splitsData?.settlements || [];
  const settlementSummary = splitsData?.settlementSummary || {
    totalReceived: 0,
    totalPaid: 0,
    netSettled: 0,
    receivedCount: 0,
    paidCount: 0,
    totalCount: 0,
  };

  const peopleSummaries = useMemo(
    () => getPeopleDebtSummaries(splits),
    [splits],
  );

  return {
    groups,
    splits,
    peopleSummaries,
    summary,
    settlements,
    settlementSummary,
    isLoading: groupsLoading || splitsLoading,
    isError: groupsError || splitsError,
    error: groupsErrorObj ?? splitsErrorObj,
    refreshing,
    refetchAll,
    createGroup: createGroupMutation.mutateAsync,
    isCreatingGroup: createGroupMutation.isPending,
    createSplits: createSplitsMutation.mutateAsync,
    isCreatingSplits: createSplitsMutation.isPending,
    createDirectPeopleSplit: createDirectPeopleSplitMutation.mutateAsync,
    isCreatingDirectSplit: createDirectPeopleSplitMutation.isPending,
    createLoan: createLoanMutation.mutateAsync,
    isCreatingLoan: createLoanMutation.isPending,
    settleSplit: settleSplitMutation.mutateAsync,
    isSettlingSplit: settleSplitMutation.isPending,
    renamePerson: renamePersonMutation.mutateAsync,
    deletePerson: deletePersonMutation.mutateAsync,
  };
}
