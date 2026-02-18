// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IEVC - Minimal interface for Ethereum Vault Connector
/// @notice Used for batching multi-vault operations and operator management
interface IEVC {
    struct BatchItem {
        address targetContract;
        address onBehalfOfAccount;
        uint256 value;
        bytes data;
    }

    struct BatchItemResult {
        bool success;
        bytes result;
    }

    struct StatusCheckResult {
        address checkedAddress;
        bool isValid;
        bytes result;
    }

    // ============ Execution ============

    function call(address targetContract, address onBehalfOfAccount, uint256 value, bytes calldata data)
        external
        payable
        returns (bytes memory result);

    function batch(BatchItem[] calldata items) external payable;

    function batchRevert(BatchItem[] calldata items) external payable;

    function batchSimulation(BatchItem[] calldata items)
        external
        payable
        returns (
            BatchItemResult[] memory batchItemsResult,
            StatusCheckResult[] memory accountsStatusCheckResult,
            StatusCheckResult[] memory vaultsStatusCheckResult
        );

    // ============ Collateral Management ============

    function getCollaterals(address account) external view returns (address[] memory);
    function isCollateralEnabled(address account, address vault) external view returns (bool);
    function enableCollateral(address account, address vault) external payable;
    function disableCollateral(address account, address vault) external payable;

    // ============ Controller Management ============

    function getControllers(address account) external view returns (address[] memory);
    function isControllerEnabled(address account, address vault) external view returns (bool);
    function enableController(address account, address vault) external payable;
    function disableController(address account) external payable;

    // ============ Account / Operator ============

    function getAccountOwner(address account) external view returns (address);
    function getAddressPrefix(address account) external pure returns (bytes19);
    function isAccountOperatorAuthorized(address account, address operator) external view returns (bool);
    function setAccountOperator(address account, address operator, bool authorized) external payable;
    function setOperator(bytes19 addressPrefix, address operator, uint256 operatorBitField) external payable;

    // ============ Status Checks ============

    function requireAccountStatusCheck(address account) external payable;
    function requireVaultStatusCheck() external payable;
    function areChecksDeferred() external view returns (bool);

    // ============ Execution Context ============

    function getCurrentOnBehalfOfAccount(address controllerToCheck)
        external
        view
        returns (address onBehalfOfAccount, bool controllerEnabled);

    function getRawExecutionContext() external view returns (uint256 context);
}
