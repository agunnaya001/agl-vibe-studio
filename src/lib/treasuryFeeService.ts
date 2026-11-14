import { AGL_TREASURY_ADDRESS } from "./aglContracts";

export interface TreasurySweepLog {
  id: string;
  timestamp: number;
  amountEth: number;
  amountAgl: number;
  amountUsd: number;
  txHash: string;
  sourceProtocol: string;
  treasuryRecipient: string;
  status: "completed" | "pending" | "failed";
  triggerReason: "threshold_reached" | "periodic_cron" | "manual_force";
}

export interface TreasuryFeeState {
  accumulatedFeesEth: number;
  accumulatedFeesAgl: number;
  accumulatedFeesUsd: number;
  thresholdEth: number;
  thresholdAgl: number;
  autoSweepEnabled: boolean;
  checkIntervalSeconds: number;
  lastSweepTimestamp: number;
  totalSweptEth: number;
  totalSweptAgl: number;
  sweepCount: number;
  treasuryRecipient: string;
  sweepHistory: TreasurySweepLog[];
}

const DEFAULT_STATE: TreasuryFeeState = {
  accumulatedFeesEth: 0,
  accumulatedFeesAgl: 0,
  accumulatedFeesUsd: 0,
  thresholdEth: 0.05,
  thresholdAgl: 2000,
  autoSweepEnabled: false,
  checkIntervalSeconds: 15,
  lastSweepTimestamp: 0,
  totalSweptEth: 0,
  totalSweptAgl: 0,
  sweepCount: 0,
  treasuryRecipient: AGL_TREASURY_ADDRESS,
  sweepHistory: []
};

type Listener = (state: TreasuryFeeState, lastSweep?: TreasurySweepLog) => void;
const listeners: Set<Listener> = new Set();

export class TreasuryFeeService {
  public static getState(): TreasuryFeeState {
    // Legacy localStorage counters and demo sweep records are deliberately not trusted.
    return { ...DEFAULT_STATE, sweepHistory: [] };
  }

  public static saveState(_state: TreasuryFeeState): void {
    // No local fee accumulator is authoritative. Real fees must be indexed from Base receipts/events.
  }

  public static subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  private static notify(state: TreasuryFeeState, lastSweep?: TreasurySweepLog): void {
    listeners.forEach((listener) => listener(state, lastSweep));
  }

  public static addProtocolFees(
    _ethAmount: number,
    _aglAmount: number,
    _sourceProtocol: string
  ): { state: TreasuryFeeState; swept: boolean; sweepLog?: TreasurySweepLog } {
    const state = this.getState();
    // Until a verified event/indexer source exists, do not fabricate accumulated protocol fees.
    this.notify(state);
    return { state, swept: false };
  }

  public static triggerSweepToTreasury(
    _triggerReason: "threshold_reached" | "periodic_cron" | "manual_force" = "manual_force",
    _sourceProtocol: string = "All Accumulated Protocol Fees",
    _customState?: TreasuryFeeState
  ): { state: TreasuryFeeState; sweepLog: TreasurySweepLog } {
    throw new Error("Treasury sweeps are disabled until a real wallet-signed transfer and confirmed Base receipt are implemented.");
  }

  public static updateSettings(
    thresholdEth: number,
    thresholdAgl: number,
    checkIntervalSeconds: number,
    _autoSweepEnabled: boolean
  ): TreasuryFeeState {
    const state: TreasuryFeeState = {
      ...DEFAULT_STATE,
      thresholdEth,
      thresholdAgl,
      checkIntervalSeconds,
      autoSweepEnabled: false
    };
    this.notify(state);
    return state;
  }
}
