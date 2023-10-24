(use-trait nft-trait .traits.sip-009-trait)

(define-constant ITERATOR (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19 u20 u21 u22 u23 u24 u25 u26 u27 u28 u29 u30 u31 u32 u33 u34 u35 u36 u37 u38 u39 u40 u41 u42 u43 u44 u45 u46 u47 u48 u49))
(define-constant ERR-UNWRAP-ITERATOR (err u1999))
(define-constant ERR-TRANSFER (err u2999))

(define-private (transfer-fold (id-to-send uint) (state { nft: <nft-trait>, ids: (list 50 uint), recipient: principal, sent: (list 50 uint) }))
    (let
        (
            (nft-a (get nft state))
            (nft-id (unwrap! (element-at? (get ids state) id-to-send) state))
        )
        (unwrap! (contract-call? nft-a transfer nft-id tx-sender (get recipient state)) state)
        (merge state { sent: (unwrap! (as-max-len? (append (get sent state) nft-id) u50) state) })
    )
)

(define-public (batch-nft-transfer (recipient principal) (nft <nft-trait>) (ids (list 50 uint)))
    (let
        (
            (it (unwrap! (slice? ITERATOR u0 (len ids)) ERR-UNWRAP-ITERATOR))
            (res (fold transfer-fold it {nft: nft, ids: ids, recipient: recipient, sent: (list)}))
        )
        (asserts! (is-eq (len (get sent res)) (len ids)) ERR-TRANSFER)
        (ok true)
    )
)
