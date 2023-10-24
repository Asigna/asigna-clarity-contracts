(impl-trait .traits.sip-010-trait)

(define-fungible-token none-token)

(define-read-only (get-name)
    (ok "None")
)

(define-read-only (get-symbol)
    (ok "NONE")
)

(define-read-only (get-decimals)
    (ok u6)
)

(define-read-only (get-balance (account principal))
    (ok (ft-get-balance none-token account))
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq true false) (err u333))  ;;  Transfers locked
        (ft-transfer? none-token amount sender recipient)
    )
)

(define-public (mint (amount uint) (recipient principal))
    (ok true)
)
