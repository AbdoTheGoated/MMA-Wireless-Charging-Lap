# Wireless Charging Lab

An interactive website that teaches how wireless phone charging works. You do not just read about it: you drag a phone on a charging pad, heat it up, run a full charging simulation, and play a game where every number comes from a real physics model running in your browser.

Built by **team MMA** for the **Global Virtual Hackathon 2026** (Senior category).

## What it does

The site is a guided tour in 6 stages:

1. **Home** - the main idea: energy jumps between two coils through a changing magnetic field, not radio waves.
2. **How It Works** - 4 animated steps: AC in the pad's transmitter coil, the changing magnetic field, the induced current in the phone's receiver coil, and the battery circuit.
3. **The Science** - 7 cards: electromagnetic induction, Faraday's law, magnetic coupling, mutual inductance, alternating current, energy transfer, and energy losses.
4. **Factors** - 4 sliders (distance, alignment, temperature, charger power) that show live how each one changes efficiency or charging time.
5. **Interactive Lab** - 4 experiments:
   - **Exp 01, Alignment**: drag the phone left and right and find the sweet spot.
   - **Exp 02, Temperature**: heat the phone and watch losses grow and the phone protect itself.
   - **Exp 03, Full charging**: set distance, offset, temperature and power, then run a full charge (time runs fast, 8 minutes per second). The last 20% of the battery charges slowly, like a real phone.
   - **Exp 04, Charging game**: 4 levels (center, distance, free setup, and a timed challenge). You drag the phone, change the gap and tilt it, and watch coupling k, induced voltage and received power respond. The side view draws the real magnetic field lines of the transmitter coil, and the bright lines are the ones that actually pass through the receiver coil.
6. **Discover & Challenge** - compare two full simulation runs, a challenge checklist, and a 6-question quiz.

## How to run it

It is a static website. There is nothing to install and no build step.

- Easiest: open `index.html` in any modern browser.
- Or serve the folder with any static file server, for example `python -m http.server`, and open the shown address.

No libraries, no frameworks, no internet connection needed. Everything is plain HTML, CSS and JavaScript, drawn on HTML canvas.

## Project structure

```
index.html        the whole site layout (all 6 stages)
css/style.css     styling
js/script.js      navigation, animations, Factors, Experiments 01-03, quiz, challenges
js/game.js        the shared physics engine + Experiment 04 (the charging game)
assets/logo.png   team logo
```

## The physics model

Every number on the site comes from one model (in `js/game.js`), and the site itself says clearly that these are simulated estimates for learning, not measured device data.

- The pad's transmitter coil (12 turns, 2.4 cm radius) and the phone's receiver coil (14 turns, 1.8 cm radius) are modeled as circular coils.
- Self-inductance of a single circular loop uses the standard approximation, and scales with the square of the number of turns.
- **Mutual inductance M is computed numerically with Neumann's formula**: each coil is divided into 48 segments and the integral is summed for the phone's exact position (x, y, z) and tilt angle. This is why the small dip in efficiency at around 3 cm of offset is real: at that offset some of the flux cancels, it is not a bug.
- Coupling: `k = M / sqrt(L1 * L2)`.
- The pad drives a regulated 1.8 A (RMS) current at 127 kHz, inside the real Qi range of about 87-205 kHz, and the phone circuit is tuned to it.
- Induced voltage = `omega * M * I1`. Received power = `I2^2 * R_load`.
- Copper wire resistance rises about 0.39% per degree C, so heat costs efficiency.
- Coil efficiency = received power / (received power + coil losses). For the whole-charger figure used in Experiments 02 and 03 and Factors, we multiply by about 0.85 for the electronics (inverter, rectifier, regulator), so the best case is near 79%. Real Qi chargers measure roughly 60-80%.
- Phone thermal protection (simplified): full power up to 38 C, then the phone slows charging, down to 30% at 48 C and above.
- Battery: about 11 Wh, constant power up to 80%, then the charging tapers off, like a real phone.
- The field lines in the game are the real magnetic field of the transmitter loop (computed with Biot-Savart once at startup), drawn for learning.

### Honest limits of the model

- Coils are simplified; there is no ferrite shield and no metal-object detection.
- The charger keeps a fixed current, while a real one raises its drive when the phone is misaligned.
- The game (Exp 04) has no heat and no battery behavior. k, efficiency and battery charging are three different things.

## Team

Team MMA: Mina, Mohamed and Abdelrahman.

[Who built what: fill in before publishing, one line per member.]

## AI tools

[Fill in before publishing: which AI tools were used and for which parts. The hackathon rules allow AI tools, but the team must be able to explain every line, because Round 2 interview questions are generated from this text and the code.]

## References

- Wireless Power Consortium: Qi standard (wirelesspowerconsortium.com), including the Qi Power Class 0 introduction PDF
- Wikipedia: Qi (standard)
- HyperPhysics: Faraday's Law
- NIST DLMF 19.34: mutual inductance of coaxial circles (the coil model)
- Copper resistance vs temperature, 0.39% per degree C (ionio.nl)
