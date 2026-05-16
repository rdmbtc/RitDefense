// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title RitDefenseLeaderboard
 * @notice Gasless leaderboard for the RitDefense game.
 *
 *         Players never pay gas. They sign an EIP-712 typed message
 *         {player, score, nonce, gameHash} with their wallet. A trusted
 *         relayer (the deployer's wallet) submits the signed message
 *         on-chain via {submitScore}. The contract verifies the
 *         signature, increments the player's nonce (replay protection)
 *         and updates the leaderboard storage.
 */
contract RitDefenseLeaderboard is EIP712 {
    /// @dev EIP-712 type hash for ScoreSubmission.
    bytes32 public constant SCORE_TYPEHASH =
        keccak256("ScoreSubmission(address player,uint256 score,uint256 nonce,bytes32 gameHash)");

    /// @notice Owner can update the relayer.
    address public owner;

    /// @notice The single relayer address allowed to call submitScore.
    address public relayer;

    struct PlayerStats {
        uint256 bestScore;       // Highest score the player has submitted.
        uint256 totalScore;      // Cumulative score across all submissions.
        uint256 totalSubmissions;// How many submissions the player has made.
        uint256 lastSubmittedAt; // Block timestamp of last submission.
    }

    /// @notice Stats keyed by player address.
    mapping(address => PlayerStats) public stats;

    /// @notice Replay-protection nonces keyed by player address.
    mapping(address => uint256) public nonces;

    /// @notice Whether an address is already on the leaderboard.
    mapping(address => bool) public isRegistered;

    /// @notice Ordered list of all unique players ever submitted.
    address[] public players;

    /// @notice Total submissions across all players.
    uint256 public totalSubmissions;

    event ScoreSubmitted(
        address indexed player,
        uint256 score,
        uint256 newBestScore,
        uint256 totalSubmissions,
        bytes32 gameHash,
        uint256 nonce
    );

    event RelayerUpdated(address indexed previousRelayer, address indexed newRelayer);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotRelayer();
    error InvalidSignature();
    error ZeroAddress();

    constructor(address initialRelayer) EIP712("RitDefenseLeaderboard", "1") {
        if (initialRelayer == address(0)) revert ZeroAddress();
        owner = msg.sender;
        relayer = initialRelayer;
        emit OwnershipTransferred(address(0), msg.sender);
        emit RelayerUpdated(address(0), initialRelayer);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice Update the trusted relayer that pays gas for {submitScore}.
    function setRelayer(address newRelayer) external onlyOwner {
        if (newRelayer == address(0)) revert ZeroAddress();
        emit RelayerUpdated(relayer, newRelayer);
        relayer = newRelayer;
    }

    /// @notice Transfer contract ownership.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Build the EIP-712 digest a player must sign.
    function hashScoreSubmission(
        address player,
        uint256 score,
        uint256 nonce,
        bytes32 gameHash
    ) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(SCORE_TYPEHASH, player, score, nonce, gameHash))
        );
    }

    /**
     * @notice Relay a player's signed score on-chain.
     * @param player    The address whose score is being recorded.
     * @param score     The score being submitted.
     * @param gameHash  An opaque hash of the game state, useful for off-chain
     *                  audits. Not validated on-chain.
     * @param signature EIP-712 signature produced by `player` over the typed
     *                  payload {player, score, nonce, gameHash}.
     */
    function submitScore(
        address player,
        uint256 score,
        bytes32 gameHash,
        bytes calldata signature
    ) external returns (uint256 currentBest, uint256 currentTotalSubs) {
        if (msg.sender != relayer) revert NotRelayer();

        uint256 nonce = nonces[player];
        bytes32 digest = hashScoreSubmission(player, score, nonce, gameHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != player) revert InvalidSignature();

        unchecked {
            nonces[player] = nonce + 1;
            totalSubmissions += 1;
        }

        PlayerStats storage s = stats[player];
        if (score > s.bestScore) {
            s.bestScore = score;
        }
        s.totalScore += score;
        s.totalSubmissions += 1;
        s.lastSubmittedAt = block.timestamp;

        if (!isRegistered[player]) {
            isRegistered[player] = true;
            players.push(player);
        }

        emit ScoreSubmitted(player, score, s.bestScore, s.totalSubmissions, gameHash, nonce);
        return (s.bestScore, s.totalSubmissions);
    }

    /// @notice Number of unique players that have submitted at least once.
    function playersCount() external view returns (uint256) {
        return players.length;
    }

    /**
     * @notice Read a window of players from the registered set.
     *         Useful for paginated reads from a frontend / indexer.
     */
    function getPlayers(uint256 offset, uint256 limit)
        external
        view
        returns (
            address[] memory addrs,
            uint256[] memory bestScores,
            uint256[] memory totalScores,
            uint256[] memory submissions,
            uint256[] memory lastSubmittedAts
        )
    {
        uint256 len = players.length;
        if (offset > len) offset = len;
        uint256 end = offset + limit;
        if (end > len) end = len;
        uint256 size = end - offset;

        addrs = new address[](size);
        bestScores = new uint256[](size);
        totalScores = new uint256[](size);
        submissions = new uint256[](size);
        lastSubmittedAts = new uint256[](size);

        for (uint256 i = 0; i < size; i++) {
            address p = players[offset + i];
            PlayerStats storage st = stats[p];
            addrs[i] = p;
            bestScores[i] = st.bestScore;
            totalScores[i] = st.totalScore;
            submissions[i] = st.totalSubmissions;
            lastSubmittedAts[i] = st.lastSubmittedAt;
        }
    }

    /// @notice Convenience getter exposing the current EIP-712 domain separator.
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
