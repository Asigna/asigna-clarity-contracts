(use-trait ft-trait .traits.sip-010-trait)
(use-trait fee-manager-trait .traits.fee-manager-trait)

(define-constant contract-owner tx-sender)

(define-constant err-owner-only (err u100))
(define-constant err-beneficiary-only (err u104))
(define-constant err-invalid-duration (err u105))
(define-constant err-invalid-index (err u106))
(define-constant err-stream-not-found (err u107))
(define-constant err-nothing-claimable (err u108))
(define-constant err-cancelled (err u109))
(define-constant err-paused (err u110))
(define-constant err-invalid-beneficiary (err u110))
(define-constant err-invalid-start (err u111))
(define-constant err-invalid-amount (err u112))
(define-constant err-not-enough-balance (err u113))
(define-constant err-finished (err u114))
(define-constant err-not-paused (err u115))
(define-constant err-token-mismatch (err u116))
(define-constant err-token-transfer (err u117))
(define-constant err-stx-transfer (err u118))
(define-constant err-getting-fee (err u119))
(define-constant err-getting-fee-recipient (err u120))
(define-constant err-fee-transfer-stx (err u121))
(define-constant err-fee-transfer-token (err u122))

(define-data-var streams-amount uint u0)

(define-map streams 
    uint 
    {
        name: (buff 20),
        beneficiary: principal,
        amount: uint,
        claimed: uint,
        start: uint,
        duration: uint,
        stopped-at: uint,
        cancelled: bool,
        token: principal,
        is-stx: bool
    }
)

(define-read-only (get-streams-amount)
    (var-get streams-amount)
)
(define-read-only (get-stream (stream-id uint))
    (map-get? streams stream-id)
)

(define-read-only (get-streams (ids (list 100 uint)))
  (map get-stream ids)
)

(define-private (increase-streams-amount)
    (var-set streams-amount (+ (var-get streams-amount) u1))
)

(define-public (deposit (amount uint))
    (stx-transfer? amount tx-sender (as-contract tx-sender))
)

(define-public (deposit-token (token <ft-trait>) (amount uint))
    (contract-call? token transfer amount tx-sender (as-contract tx-sender) none)
)

(define-public (request-withdrawal (token <ft-trait>) (recipient principal) (amount uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (as-contract (contract-call? token transfer amount tx-sender recipient none))
    )
)

(define-public (request-withdrawal-stx (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (as-contract (stx-transfer? amount tx-sender recipient))
    )
)

(define-public (create-stream (beneficiary principal) (name (buff 20)) (start uint) (duration uint) (amount uint) (token <ft-trait>) (is-stx bool))
    (let 
        ((stream-id (get-streams-amount)))
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (asserts! (not (is-eq beneficiary contract-owner)) err-invalid-beneficiary)
        (asserts! (not (is-eq duration u0)) err-invalid-duration)
        (asserts! (>= start block-height) err-invalid-start)
        (asserts! (> amount u0) err-invalid-amount)
        (map-insert streams stream-id {
            name: name,
            beneficiary: beneficiary,
            amount: amount,
            claimed: u0,
            start: start,
            duration: duration,
            stopped-at: u0,
            cancelled: false,
            token: (contract-of token),
            is-stx: is-stx
        })
        (increase-streams-amount)
        (ok stream-id)
    )
)

(define-public (claim-stream (stream-id uint) (token-contract <ft-trait>))
    (
        begin
        (
            let (
                (stream (unwrap! (map-get? streams stream-id) err-stream-not-found))
                (claim-amount (get-claim-info-at stream-id))
                (token (get token stream))
                (beneficiary (get beneficiary stream))
                (fee (unwrap! (contract-call? .fee-manager calculate-platform-fee claim-amount) err-getting-fee))
                (fee-recipient (unwrap! (contract-call? .fee-manager get-fee-recipient) err-getting-fee-recipient))
                (new-stream (merge stream {claimed: (+ (get claimed stream) claim-amount)}))
            )
            (asserts! (is-eq beneficiary tx-sender) err-beneficiary-only)
            (asserts! (> claim-amount u0) err-nothing-claimable)
            (asserts! (is-eq token (contract-of token-contract)) err-token-mismatch)

            (
                if (get is-stx stream)
                    (unwrap! (as-contract (stx-transfer? claim-amount tx-sender beneficiary)) err-stx-transfer)
                    (unwrap! (as-contract (contract-call? token-contract transfer claim-amount tx-sender beneficiary none)) err-token-transfer)
            )

            (
                if (get is-stx stream)
                    (unwrap! (as-contract (stx-transfer? fee tx-sender fee-recipient)) err-fee-transfer-stx)
                    (unwrap! (as-contract (contract-call? token-contract transfer fee tx-sender fee-recipient none)) err-fee-transfer-token)
            )
            (map-set streams stream-id new-stream) 
            (ok true)
        )
    )
)

(define-public (cancel-stream (stream-id uint)) 
    (
        let 
            (
                (stream (unwrap! (map-get? streams stream-id) err-stream-not-found))
                (new-stream (merge stream {cancelled: true, stopped-at: block-height}))
            )
            (asserts! (is-eq tx-sender contract-owner) err-owner-only)
            (asserts! (not (get cancelled stream)) err-cancelled)
            (asserts! (not (is-finished (+ (get start stream) (get duration stream)))) err-finished)
            (map-set streams stream-id new-stream)
            (ok true)
    )
)

(define-public (pause-stream (stream-id uint)) 
    (
        let 
            (
                (stream (unwrap! (map-get? streams stream-id) err-stream-not-found))
                (new-stream (merge stream {stopped-at: block-height}))
            )
            (asserts! (is-eq tx-sender contract-owner) err-owner-only)
            (asserts! (not (get cancelled stream)) err-cancelled)
            (asserts! (not (is-finished (+ (get start stream) (get duration stream)))) err-finished)
            (asserts! (is-eq (get stopped-at stream) u0) err-paused)
            (map-set streams stream-id new-stream)
            (ok true)
    )
)

(define-public (resume-stream (stream-id uint)) 
    (
        let 
            (
                (stream (unwrap! (map-get? streams stream-id) err-stream-not-found))
                (new-stream (merge stream {stopped-at: u0}))
            )
            (asserts! (is-eq tx-sender contract-owner) err-owner-only)
            (asserts! (> (get stopped-at stream) u0) err-not-paused)
            (asserts! (not (get cancelled stream)) err-cancelled)
            (map-set streams stream-id new-stream)
            (ok true)
    )
)

(define-read-only (min (a uint) (b uint)) (if (< a b) a b))


(define-read-only (is-finished (finish-block uint)) 
    (<= finish-block block-height) 
)

(define-read-only (get-claim-info-at (stream-id uint)) 
    (let
        (
            (stream (unwrap! (map-get? streams stream-id) u0))
            (start (get start stream))
            (duration (get duration stream))
            (stopped-at (get stopped-at stream))
            (now-block (if (is-eq stopped-at u0) block-height stopped-at))
            (target-block (min now-block (+ start duration)))
            (max-rewards (if (> start block-height) u0 (/ (* (get amount stream) (- target-block start)) duration)))
        )
        (- max-rewards (get claimed stream))
    )
)
