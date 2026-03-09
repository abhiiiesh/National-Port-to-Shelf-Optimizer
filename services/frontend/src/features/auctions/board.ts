export interface BidView {
  bidderId: string;
  amount: number;
  submittedAtIso: string;
}

export interface AuctionOutcomeView {
  winnerBidderId: string;
  winningAmount: number;
  tieBreakReason: string;
}

export const selectAuctionWinner = (bids: BidView[]): AuctionOutcomeView | null => {
  if (bids.length === 0) {
    return null;
  }

  const sorted = [...bids].sort((a, b) => {
    if (b.amount !== a.amount) {
      return b.amount - a.amount;
    }

    return a.submittedAtIso.localeCompare(b.submittedAtIso);
  });

  const [winner, runnerUp] = sorted;
  const tieBreakReason =
    runnerUp && runnerUp.amount === winner.amount ? 'EARLIEST_TIMESTAMP' : 'HIGHEST_BID';

  return {
    winnerBidderId: winner.bidderId,
    winningAmount: winner.amount,
    tieBreakReason,
  };
};
