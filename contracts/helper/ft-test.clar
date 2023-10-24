(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(impl-trait .traits.sip-010-trait)

;; No maximum supply!
(define-fungible-token test-coin)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(begin
		(asserts! (is-eq tx-sender sender) err-not-token-owner)
		(try! (ft-transfer? test-coin amount sender recipient))
		(match memo to-print (print to-print) 0x)
		(ok true)
	)
)

(define-read-only (get-name)
	(ok "Test Coin")
)

(define-read-only (get-symbol)
	(ok "TC")
)

(define-read-only (get-decimals)
	(ok u0)
)

(define-read-only (get-balance (who principal))
	(ok (ft-get-balance test-coin who))
)

(define-read-only (get-total-supply)
	(ok (ft-get-supply test-coin))
)

(define-read-only (get-token-uri)
	(ok none)
)

(define-public (mint (amount uint) (recipient principal))
	(begin
		(ft-mint? test-coin amount recipient)
	)
)