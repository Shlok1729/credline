// Package types contains types that could be useful to other apps when interacting with this extension.
package types

import (
	"github.com/ethereum/go-ethereum/common"
)

// ScoreRequest is the JSON payload sent via the Solidity contract.
// It contains mock financial history data for credit scoring.
type ScoreRequest struct {
	// UserAddress is the Ethereum address to associate the score with.
	UserAddress string `json:"userAddress"`
	// AccountAgeDays is the age of the user's financial account in days.
	AccountAgeDays int `json:"accountAgeDays"`
	// TotalTransactions is the total number of transactions on the account.
	TotalTransactions int `json:"totalTransactions"`
	// MonthlyVolumeUSD is the average monthly transaction volume in USD.
	MonthlyVolumeUSD float64 `json:"monthlyVolumeUsd"`
	// ActiveMonths is the number of months the account has been active.
	ActiveMonths int `json:"activeMonths"`
}

// ScoreResponse is the JSON payload returned in ActionResult.Data.
type ScoreResponse struct {
	// UserAddress is the Ethereum address the score is associated with.
	UserAddress string `json:"userAddress"`
	// Score is the computed credit score (300-850 range).
	Score uint16 `json:"score"`
	// Tier is a human-readable credit tier label.
	Tier string `json:"tier"`
}

// State holds the extension's observable state, returned by GET /state.
type State struct {
	ScoresComputed int    `json:"scoresComputed"`
	LastScoreUser  string `json:"lastScoreUser"`
	LastScore      uint16 `json:"lastScore"`
}

// --- DO NOT MODIFY below this line. ---

// StateResponse is the envelope returned by GET /state.
type StateResponse struct {
	StateVersion common.Hash `json:"stateVersion"`
	State        State       `json:"state"`
}
