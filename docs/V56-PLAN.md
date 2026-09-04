# V56 plan

Audit finding: the live PKSK code is still CF-1.3, uses a 2-device constant, accepts client-reported score in `saveProgress`, and the public question JSON contains the canonical answer/weights data. The V56 repair will make the server authoritative for completed score by recalculating from the canonical set JSON, raise the device policy to 3, prevent unfinished-set resume, and preserve the existing payment/referral/admin flow. The earlier idea of a `pksk_question_keys` D1 table is not required for this targeted repair and should not be executed.
