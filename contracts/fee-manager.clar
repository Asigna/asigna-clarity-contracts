(impl-trait .traits.fee-manager-trait)

;; Max possible fee is 1%
(define-constant MAX_FEE u100000000)
(define-constant FEE_DIVIDER u10000000000)

(define-constant err-owner-only (err u100))
(define-constant err-fee-too-high (err u101))

;; default fee is 0.05%
(define-data-var fee uint u50000000)
(define-data-var fee-platform-owner principal tx-sender)
(define-data-var fee-recipient principal tx-sender)

(define-read-only (calculate-platform-fee (claim-amount uint))
    (ok (/ (* claim-amount (var-get fee)) FEE_DIVIDER))
)

(define-read-only (get-fee-recipient)
    (ok (var-get fee-recipient))
)

(define-read-only (get-fee)
    (ok (var-get fee))
)

(define-public (set-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender (var-get fee-platform-owner)) err-owner-only)
        (asserts! (<= new-fee MAX_FEE) err-fee-too-high)
        (var-set fee new-fee)
        (ok true)
    )
)

(define-public (set-fee-recipient (new-fee-recipient principal))
    (begin
        (asserts! (is-eq tx-sender (var-get fee-platform-owner)) err-owner-only)
        (var-set fee-recipient new-fee-recipient)
        (ok true)
    )
)

(define-public (transfer-ownership (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get fee-platform-owner)) err-owner-only)
        (var-set fee-platform-owner new-owner)
        (ok true)
    )
)
