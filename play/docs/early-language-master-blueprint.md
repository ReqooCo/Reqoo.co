# Reqoo Play — Early Language Master Blueprint

## Product purpose
Reqoo Play is a child-centred, caregiver-supported play platform for ages 2–4, with special attention to children with late language emergence. It supports home interaction; it is not a diagnostic tool or replacement for an SLP/SLT.

## Evidence principles
- Naturalistic, play-based language learning.
- Caregiver modelling, imitation, expansion, responsive turns and wait time.
- Functional communication before formal literacy.
- Multimodal communication: speech, gesture, pictures and actions.
- Co-play rather than passive screen use.
- Culturally and linguistically responsive BM + English support.

## Age progression
### 2.0–2.5
Joint attention → look/listen → gesture → imitation → vocal play → requesting → first functional words.

### 2.5–3.0
First words → functional vocabulary → imitate sounds/words → request/comment → turn-taking → early two-word combinations.

### 3.0–4.0
Vocabulary growth → two-word combinations → simple sentences → action words → describing → simple story play → early literacy/ABC.

## Core activity worlds
1. Look & Listen
2. Copy Me
3. My Turn / Your Turn
4. I Want
5. Everyday Words
6. Animal Sounds
7. Songs & Rhymes
8. Story Play
9. ABC / Early Literacy (later stage)

## Activity rule
Every activity should define:
- Child action
- Target word/sound/gesture
- Adult model
- A pause for the child's turn
- Easy repetition
- Positive response to every communication attempt
- No wrong-answer screen, timer, lives or leaderboard

## Parent layer
Each activity can show one short prompt:
- "Cuba sebut: bola."
- "Tunggu sekejap dan beri anak giliran."
- "Kalau anak kata 'bo', modelkan 'bola'."
- "Ikut minat anak dan ulang perkataan sasaran secara natural."

## MVP: Jom Main — Bunyi & Perkataan Pertama
Target: 2–3 years.
- 10–15 functional target words
- 5 mini activities
- Mascot + simple animated scenes
- BM/English toggle
- Speech/audio models
- Tap-to-repeat
- Parent prompts
- No performance pressure
- Session length: approximately 5–10 minutes, with child-led stopping

Suggested first word bank:
Mama, Papa, nak, lagi, makan, minum, susu, bola, buku, buka, tutup, datang, pergi, kucing, ayam.

## Success signals
Product analytics should measure engagement and practice opportunities, not medical outcomes:
- Communication attempts
- Number of model exposures
- Turn-taking opportunities
- Replays
- Parent strategy prompts viewed
- Words/activities practised

## Clinical boundary
The product may say it supports language-learning practice and caregiver interaction. It must not claim to cure, diagnose or replace speech-language therapy. Persistent concerns should be discussed with an appropriate health or speech-language professional.

## Technical content model
Activities should be data-driven so the same engine can support BM and English:

```json
{
  "id": "first-words-bola",
  "language": ["ms", "en"],
  "target": {"ms": "bola", "en": "ball"},
  "mode": "model-and-play",
  "prompt": {"ms": "Bola!", "en": "Ball!"},
  "actions": ["look", "listen", "tap", "repeat"],
  "parentTip": {"ms": "Cuba sebut: bola.", "en": "Try saying: ball."}
}
```

## Product philosophy
**We do not force speech. We create reasons to communicate.**
