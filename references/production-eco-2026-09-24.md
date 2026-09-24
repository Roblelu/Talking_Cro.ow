# Eco production deployment — 2026-09-24

Scope: processTTSMessage, testClonedVoiceWeb, createEcoVoice, filterTTSMessage.
Private credential: Google Secret Manager PREMIUM_TTS_API_KEY version 2; no value stored here.
Actual owner-sample diagnostic passed: clone, synthesize, delete temporary voice. Original Firebase sample retained.
Moderation model changed to gemini-3.5-flash-lite after the API recommended it; previous model returned 503. Timeout increased to 25 seconds. Moderate failures reject without charging; severe censorship is charged.
20 mocked tests passed before deployment; 16 cloud tests passed after final model change.
VM integration and desktop installer distribution are separate and have not been performed by this deployment. The old shared-secret bot remains incompatible; no second authenticated sender has been activated. Do not activate it together with the desktop sender until deduplication or single ownership is implemented.

Deployment status: completed successfully, all four functions updated.
Verified revisions: processTTSMessage 00055-gem, testClonedVoiceWeb 00018-bih, filterTTSMessage 00003-fon. Voice functions bind secret version 2, timeout 120 seconds.
Live deployed moderation checks passed: normal -> allowed, light profanity -> softened, severe threat -> censored. No wallets changed by these checks.
A full authenticated TikTok-to-audio transaction has not been exercised after deployment. Owner clone/synthesis/delete was verified separately before deployment.

