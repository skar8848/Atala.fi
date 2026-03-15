import type { NodeTypes } from "@xyflow/react";
import WalletNode from "./WalletNode";
import EulerDepositNode from "./EulerDepositNode";
import EulerBorrowNode from "./EulerBorrowNode";
import EulerWithdrawNode from "./EulerWithdrawNode";
import EulerRepayNode from "./EulerRepayNode";
import SiloDepositNode from "./SiloDepositNode";
import SiloBorrowNode from "./SiloBorrowNode";
import SiloWithdrawNode from "./SiloWithdrawNode";
import SiloRepayNode from "./SiloRepayNode";
import SwapNode from "./SwapNode";
import AtalaDepositNode from "./AtalaDepositNode";
import AtalaWithdrawNode from "./AtalaWithdrawNode";
import PositionNode from "./PositionNode";

// MUST be defined outside any component to avoid React Flow re-renders
export const nodeTypes: NodeTypes = {
  walletNode: WalletNode,
  eulerDepositNode: EulerDepositNode,
  eulerBorrowNode: EulerBorrowNode,
  eulerWithdrawNode: EulerWithdrawNode,
  eulerRepayNode: EulerRepayNode,
  siloDepositNode: SiloDepositNode,
  siloBorrowNode: SiloBorrowNode,
  siloWithdrawNode: SiloWithdrawNode,
  siloRepayNode: SiloRepayNode,
  swapNode: SwapNode,
  atalaDepositNode: AtalaDepositNode,
  atalaWithdrawNode: AtalaWithdrawNode,
  positionNode: PositionNode,
};
