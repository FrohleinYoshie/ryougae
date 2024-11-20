package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

type DenominationCount map[int]int

type ExchangeRequest struct {
	CurrentMoney  DenominationCount `json:"currentMoney"`
	TargetAmounts []int             `json:"targetAmounts"`
}

type ExchangeResult struct {
	From         DenominationCount `json:"from"`
	To           DenominationCount `json:"to"`
	TotalCurrent int               `json:"totalCurrent"`
	TotalTarget  int               `json:"totalTarget"`
}

var denominations = []int{10000, 5000, 1000, 500, 100, 50, 10, 5, 1}

func calculateExchange(w http.ResponseWriter, r *http.Request) {
	var req ExchangeRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, fmt.Sprintf("リクエストの解析に失敗しました: %v", err), http.StatusBadRequest)
		return
	}

	result, err := processExchange(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func processExchange(req ExchangeRequest) (ExchangeResult, error) {
	totalCurrent := calculateTotal(req.CurrentMoney)
	totalTarget := sum(req.TargetAmounts)

	if totalCurrent != totalTarget {
		return ExchangeResult{}, fmt.Errorf("現在の金額(%d円)と目標金額(%d円)の合計が一致しません", totalCurrent, totalTarget)
	}

	result := ExchangeResult{
		From:         cleanDenominationCount(req.CurrentMoney),
		To:           make(DenominationCount),
		TotalCurrent: totalCurrent,
		TotalTarget:  totalTarget,
	}

	for _, targetAmount := range req.TargetAmounts {
		remaining := targetAmount
		for _, denom := range denominations {
			count := remaining / denom
			if count > 0 {
				result.To[denom] += count
				remaining -= count * denom
			}
		}
	}

	result.To = cleanDenominationCount(result.To)
	return result, nil
}

func calculateTotal(dc DenominationCount) int {
	total := 0
	for denomination, count := range dc {
		total += denomination * count
	}
	return total
}

func sum(amounts []int) int {
	total := 0
	for _, amount := range amounts {
		total += amount
	}
	return total
}

func cleanDenominationCount(dc DenominationCount) DenominationCount {
	cleaned := make(DenominationCount)
	for _, denom := range denominations {
		if count, exists := dc[denom]; exists && count > 0 {
			cleaned[denom] = count
		}
	}
	return cleaned
}

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/calculate-exchange", calculateExchange).Methods("POST")

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})

	handler := c.Handler(r)

	log.Println("Server is running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
