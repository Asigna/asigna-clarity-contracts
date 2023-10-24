(impl-trait .traits.sip-009-trait)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))

(define-non-fungible-token test-nft uint)

(define-data-var last-token-id uint u0)

(define-read-only (get-last-token-id)
	(ok (var-get last-token-id))
)

(define-read-only (get-token-uri (token-id uint))
	(ok (some "ipfs://ipfs/random_hash/json/{id}.json"))
)

(define-read-only (get-owner (token-id uint))
	(ok (nft-get-owner? test-nft token-id))
)

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
	(begin
		(asserts! (is-eq tx-sender sender) err-not-token-owner)
		(nft-transfer? test-nft token-id sender recipient)
	)
)

(define-public (mint (recipient principal))
	(let
		(
			(token-id (+ (var-get last-token-id) u1))
		)
		(try! (nft-mint? test-nft token-id recipient))
		(var-set last-token-id token-id)
		(ok token-id)
	)
)