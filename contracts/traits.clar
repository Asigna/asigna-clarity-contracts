(define-trait sip-009-trait
    (
        (transfer (uint principal principal) (response bool uint))
    )
)

(define-trait sip-010-trait
    (
        (transfer (uint principal principal (optional (buff 34))) (response bool uint))
        (mint (uint principal) (response bool uint))
        (get-balance (principal) (response uint uint))
    )
)

(define-trait fee-manager-trait
    (
        (calculate-platform-fee (uint) (response uint uint))
        (get-fee-recipient () (response principal uint))
    )
)
